#!/usr/bin/python3

#libraries
import subprocess
import os
import sys
import traceback
import requests
from elasticsearch import Elasticsearch
import dateutil.parser
import datetime
import time
import json

#constants
locales = ['LAX1','IAD1', 'IAD2']
es = Elasticsearch()
loglocation = '/var/log/inventory/housekeeper'			#location of the log file
trackAPI = 'https://api.aftership.com/v4/trackings/'                #location of tracking API entry point
upsETAsite = 'http://wwwapps.ups.com/WebTracking/process\
InputRequest?TypeOfInquiryNumber=T&InquiryNumber1='		#location of UPS tracking site
orderingAdmin = "orderingadmin@yourhosthere.com"			#administrator to email to order new things
auditAdmin = "auditadmin@yourhosthere.com"				#administrator to email for audit reasons
toasterAdmin = "toasteradmin@yourhosthere.com"	#administrator to email for toaster reasons
emailTimeout = 72						#hours the housekeeper will wait before re-alerting that an item is below threshold
initEmail = datetime.datetime.now()\
 - datetime.timedelta(hours=(emailTimeout+1))			#time to set lastEmail to for new items
initEmailStr = initEmail.strftime("%Y-%m-%d %H:%M:%S")		#time to set lastEmail to as string
cronInterval = 60						#how often this script is set to run in cron, in minutes
boolFalse = False						#a boolean set to 'false' to work with elasticsearch
boolTrue = True							#same as above, but 'true.'  Stupid workaround.
aftershipKey = "aftershipKey Here" #aftership API key - Probably best to import this from file instead of hardcode it here

if (emailTimeout < 1):
  emailTimeout = 24	#if something goofs up, set timeout to 1 day

#wrapper to log info re:housekeeper
def logStatus(logstring):
  currenttime = str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S - "))
  string = str(currenttime + " " + logstring + "\n")
  log = open(loglocation, 'a')
  log.write(string)
  log.close()


def getFullIndex(ind):

  #get size of current DB
  res = es.indices.get_settings(index=ind)
  if 'max_result_window' in res[ind]['settings']['index']:
    count = int(res[ind]['settings']['index']['max_result_window'])
  else:
    count = 10000

  #get initial scroll response
  res = es.search(index=ind, scroll= "1m", body={"size": count, "query": {"match_all" : {}}})
  retval = res

  #get each scroll response afterward
  while ('hits' in res['hits'] and len(res['hits']['hits']) > 0):
    scrollId = res['_scroll_id']
    res = es.scroll(scroll_id=scrollId, scroll= "1m")
    retval['hits']['hits'] = retval['hits']['hits'] + res['hits']['hits']
      
  return retval

#wrapper that returns entire index
def getIndex(ind):
  
  #get all current tracks in DB
  res = getFullIndex(ind)
  
  return res['hits']['hits']

#wrapper that counts out the number of serials of a given key of a particular status
def getAmount(key, stat, location):

	#search for keys in stat
	res = es.count(index='serial', body={"query":{"bool":{"must":[{"match":{"keyword":key}},{"match":{"status":stat}},{"match":{"location":location}}]}}})
	return res['count']

#subroutine to check and update all tracks
def checkTracks():
  tracksJSON = getIndex('tracks')
  for track in tracksJSON:

    #if we don't recognize the carrier, set its ETA to 'NO CARRIER' and continue.
    if track['_source']['carrier'].lower() != 'usps' and track['_source']['carrier'].lower() != 'fedex' and track['_source']['carrier'].lower() != 'ups' and track['_source']['carrier'].lower() != 'gso':
      logStatus("Did not recognize carrier " + track['_source']['carrier'] + " in tracking number " + str(track['_source']['num']))
      res = es.update(index="tracks", doc_type="1", id=track['_id'], body={"doc":{"status":"NO CARRIER"}})
      continue

    #get tracking info from aftership
    try:
    	#build auth info and attempt to find track
      trackHead= {}
      trackHead['aftership-api-key'] = aftershipKey
      trackHead['Content-Type'] = 'application/json'
      r = requests.get(trackAPI + track['_source']['carrier'].lower() + '/' + track['_source']['num'], headers=trackHead)

      #if track doesn't exist in aftership, make it
      if r.status_code != 200 and r.status_code != 201 and r.status_code != 202:
        logStatus("Aftership API doesn't have entry point for tracking number " + str(track['_source']['num'].replace(" ","")) + ', creating one.')
        trackReq = {}
        trackReq['tracking'] = {}
        trackReq['tracking']['tracking_number'] = track['_source']['num'].replace(" ","");
        r = requests.post(trackAPI, json.dumps(trackReq), headers=trackHead)
        #bit hacky, but we need to make sure that aftership can update after receiving the request
        time.sleep(3)

        #if track was successfully made, continue, if else, skip
        if r.status_code != 200 and r.status_code != 201 and r.status_code !=202:
        	logStatus("Some external error in adding " + str(track['_source']['num'].replace(" ","")) + " to aftership account, skipping this number.")
        	continue
        else:
        	r = requests.get(trackAPI + track['_source']['carrier'].lower() + '/' + track['_source']['num'], headers=trackHead)
    except:
      logStatus("Some internal error getting info about tracking number " + str(track['_source']['num']))
      continue


    #check if track exists - deprecated in shippo era, but may need to be rebuilt
    #if r.json()['tracking_status'] == None:
    #  logStatus("No tracking information exists for tracking number " + str(track['_source']['num']))
    #  res = es.update(index="tracks", doc_type="1", id=track['_id'], body={"doc":{"status":"NO INFO"}})
    #  continue

    #if status is 'delivered' and it's past 1 day, remove from database
    if r.json()['data']['tracking']['tag'] == 'Delivered':
      if (datetime.datetime.now() - dateutil.parser.parse(r.json()['data']['tracking']['shipment_delivery_date']).replace(tzinfo = None)).total_seconds() > 86400:
        logStatus("Tracking number " + str(track['_source']['num']) + " registered as delivered, removing entry from elasticsearch and aftership")
        res = es.delete(index="tracks", doc_type="1", id=track['_id'])
        r = requests.delete(trackAPI + track['_source']['carrier'].lower() + '/' + track['_source']['num'], headers=trackHead)
        if r.status_code != 200 and r.status_code != 201 and r.status_code !=202:
        	logStatus("Failed to delete " + str(track['_source']['num'].replace(" ","")) + " from aftership account, consider checking the issue.")
        continue

    #find most recent checkpoint

    checkTime = dateutil.parser.parse(r.json()['data']['tracking']['checkpoints'][0]['checkpoint_time'])
    latestCheck = r.json()['data']['tracking']['checkpoints'][0]
    for checkpoint in r.json()['data']['tracking']['checkpoints']:
    	if (dateutil.parser.parse(checkpoint['checkpoint_time']) > checkTime):
    		latestCheck = checkpoint

    #commit status to database - find location
    try:
      track['_source']['location'] = latestCheck['location']
      if track['_source']['location'] == None:
        track['_source']['location'] = 'The Void'
    except:
      logStatus("Tracking number " + str(track['_source']['num']) + " does not have a location")
      track['_source']['location'] = 'The Void'


    #gather ETA
    try:
      if r.json()['data']['tracking']['expected_delivery'] != None:
        track['_source']['eta'] = dateutil.parser.parse(r.json()['data']['tracking']['expected_delivery']).replace(tzinfo=None).date().__str__()
      else:
        logStatus("Tracking number " + str(track['_source']['num']) + " does not have an eta")
        track['_source']['eta'] = ''
    except:
      logStatus("Tracking number " + str(track['_source']['num']) + " does not have an eta")
      track['_source']['eta'] = ''
     

    #set status correctly
    track['_source']['status'] = r.json()['data']['tracking']['tag']

    #elasticsearch ONLY accepts ETAs in a proper date format
    if track['_source']['eta'] != '':
      r = es.update(index="tracks", doc_type="1", id=track['_id'], body={"doc":{"status":track['_source']['status'], "eta": track['_source']['eta'], "location":track['_source']['location']}})
    else:
      r = es.update(index="tracks", doc_type="1", id=track['_id'], body={"doc":{"status":track['_source']['status'], "location":track['_source']['location']}})


  logStatus("Updated tracking database successfully.")


#subroutine to check tickets
def checkTickets():

  #run php script to populate tickets.json.
  #TO DO: figure out a way to do google spreadsheet checking natively in python, instead of hooking a php call
  retval = subprocess.call(["php", "/var/www/secureinclude/tickets/tickets.php"])
  if (retval == 0):
    logStatus("Called tickets.php to update tickets")
  else:
    logStatus("Received error " + str(retval) + " from tickets.php, may not have updated tickets database")

  ticketJSON = getIndex('tickets')

  #set all timezones to pacific, handle any crap tickets, remove any tickets past the maintenance window
  for ticket in ticketJSON:
    ticketStart = dateutil.parser.parse(ticket['_source']['start'])
    ticketEnd = dateutil.parser.parse(ticket['_source']['end'])
    if ('TZ' in ticket['_source'].keys()) and (ticket['_source']['TZ'] == 'Eastern'):
      ticketStart = ticketStart - datetime.timedelta(hours=3)
      ticketEnd = ticketEnd - datetime.timedelta(hours=3)
      ticket['_source']['TZ'] = 'Pacific'

    #put crappily made ticket in database
    if ticketEnd <= ticketStart:
      logStatus("Ticket for " + ticket['_source']['server'] + " has errors, highlighting on HUD for manual handling")
      ticket['_source']['start'] = '1234-01-01 12:00:00'
      ticket['_source']['end'] = '5678-01-01 12:00:00'
      res = es.update(index="tickets", doc_type="1", id=ticket['_id'], body={"doc":{"start":ticket['_source']['start'], "end": ticket['_source']['end'], "TZ":ticket['_source']['TZ']}})

    #remove tickets past maint window
    elif ticketEnd < datetime.datetime.now():
      logStatus("Ticket for " + ticket['_source']['server'] + " maintenance window has passed, removing")
      res = es.delete(index="tickets", doc_type="1", id=ticket['_id'])
      continue

    #structure ticket and add to database
    else:
      ticket['_source']['start'] = ticketStart.strftime('%Y-%m-%d %H:%M:%S')
      ticket['_source']['end'] = ticketEnd.strftime('%Y-%m-%d %H:%M:%S')
      res = es.update(index="tickets", doc_type="1", id=ticket['_id'], body={"doc":{"start":ticket['_source']['start'], "end": ticket['_source']['end'], "TZ":ticket['_source']['TZ']}})


  logStatus("Updated ticket database successfully")


#subroutine to check items
def checkItems(locale):

  #initialize the email body as a string
  email = ""
  itemJSON = getIndex('items')

  for item in itemJSON:

    #create a boolean to keep track of changes and email flag, in order to reduce our database access requests later
    item['changed'] = False
    item['email'] = False

    #add the 'amount' key (doing it this way fits in with the old version, but this code is now ripe for refactor)
    newAmount = 0
    newAmount = getAmount(item['_source']['keyword'], 'Ready', locale)
    if not 'amount' in item['_source'].keys():
      item['_source']['amount'] = {}
      item['changed'] = True

    if not locale in item['_source']['amount'].keys():
      item['changed'] = True
    elif item['_source']['amount'][locale] != newAmount:
      item['changed'] = True
    item['_source']['amount'][locale] = newAmount

    #if it doesn't have a thresholdTrouble entry, add it
    if not 'thresholdTrouble' in item['_source'].keys():
      res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"thresholdTrouble":{locale:boolFalse}}})
      item['_source']['thresholdTrouble'] = {}
      item['_source']['thresholdTrouble'][locale] = False
    if not locale in item['_source']['thresholdTrouble'].keys():
    	res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"thresholdTrouble":{locale:boolFalse}}})
    	item['_source']['thresholdTrouble'][locale] = False

    
    #if it doesn't have a lastEmail entry, add it
    if not 'lastEmail' in item['_source'].keys():
      res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"lastEmail":{locale:initEmailStr}}})
      item['_source']['lastEmail'] = {}
      item['_source']['lastEmail'][locale] = initEmailStr
    if not locale in item['_source']['lastEmail'].keys():
    	res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"lastEmail":{locale:initEmailStr}}})
    	item['_source']['lastEmail'][locale] = initEmailStr

    #if it doesn't have an ordered entry, add it
    if not 'ordered' in item['_source'].keys():
      res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"ordered":{locale:boolFalse}}})
      item['_source']['ordered'] = {}
      item['_source']['ordered'][locale] = False
    if not locale in item['_source']['ordered'].keys():
      res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"ordered":{locale:boolFalse}}})
      item['_source']['ordered'][locale] = False

    #skip anything whose amount key is bullshit
    if type(item['_source']['amount'][locale]) != int:
      continue

    #skip anything that doesn't have a 'threshold' key
    if not 'threshold' in item['_source'].keys():
      continue
    elif not locale in item['_source']['threshold'].keys():
      continue


    #check amount vs threshold and set threshold flag accordingly

    #if the item is under threshold
    if (item['_source']['amount'][locale] < item['_source']['threshold'][locale]):

      #if the item is newly under threshold, flag it for email and change
      if not item['_source']['thresholdTrouble'][locale]:

        item['changed'] = True
        item['email'] = True
        item['_source']['lastEmail'][locale] = datetime.datetime.now().replace(hour=0, minute=0, second=1, microsecond=0).strftime("%Y-%m-%d %H:%M:%S")
        item['_source']['thresholdTrouble'][locale] = True

      #otherwise, the item was already over threshold.
      #if the item was already ordered, skip it.  This section is commented out because I feel like you'd still want to be updated that it's under threshold.
      #elif (item['_source']['ordered']):
      #  continue

      #check last email date.  if it's past the timeout, flag for change and email, otherwise ignore.
      elif (datetime.datetime.now() - datetime.timedelta(hours=emailTimeout) > dateutil.parser.parse(item['_source']['lastEmail'][locale])):
          
        item['changed'] = True
        item['email'] = True
        item['_source']['lastEmail'][locale] = datetime.datetime.now().replace(hour=0, minute=0, second=1, microsecond=0).strftime("%Y-%m-%d %H:%M:%S")

      #if the item was already over threshold but was under the email timeout, do nothing.

    #if the item is at or over threshold
    else:

      #if it were previously under threshold, fix it.
      if item['_source']['thresholdTrouble'][locale]:
        item['changed'] = True
        item['_source']['thresholdTrouble'][locale] = False

      #if it were previously flagged as ordered, but it isn't under threshold, reset the ordered flag
      if item['_source']['ordered'][locale]:
        item['_source']['ordered'][locale] = False
        item['changed'] = True

    #At this point, we should know whether or not there's threshold trouble or changes for the item.  Update and email accordingly.
    if item['changed']:
      res = es.update(index="items", doc_type="1", id=item['_id'], body={"doc":{"lastEmail":{locale : item['_source']['lastEmail'][locale]}, "amount":{locale : item['_source']['amount'][locale]}, "thresholdTrouble":{locale :  item['_source']['thresholdTrouble'][locale]}, "ordered": {locale : item['_source']['ordered'][locale]}}})
    
    if item['email']:
      email = email + locale + " " + item['_source']['keyword'] + "\tThreshold: " + str(item['_source']['threshold'][locale]) + "\tAmount: " + str(item['_source']['amount'][locale]) + "\n"
      logStatus(item['_source']['keyword'] + " is beneath its threshold and will be emailed.")

  if not (email == ""):
    email = "Subject: " + locale + " ITEMS HAVE DROPPED BELOW THRESHOLD\nFrom: Inventory Housekeeping\n\nThe following items require reordering:\n\n" + email
    ret = os.system("echo '" + email + "' | /usr/sbin/ssmtp " + orderingAdmin)
    if (ret == 0):
      logStatus("Email sent")
    else:
      logStatus("Some problem sending the email - echo and ssmtp dropped error code " + str(ret) + ". Divide by 256 to get the ACTUAL error code, remember!")
  
  logStatus("Updated item database successfully for " + locale)

def checkSerials():
	serialJSON = getIndex('serial')
	serialErrorCount = 0

	for serial in serialJSON:
		if not 'status' in serial['_source'].keys():
			continue

		#if we found a dead item, copy it over to 'dead'
		if serial['_source']['status'] == 'Dead':
			#initial copy
			res = es.index(index='dead', doc_type='1', body=serial['_source'])
			if res['created']:
				logStatus("keyword " + str(serial['_source']['keyword']) + ", S/N " + str(serial['_source']['serial']) + ": copied to dead database, deleting original...")
			else:
				logStatus("keyword " + str(serial['_source']['keyword']) + ", S/N " + str(serial['_source']['serial']) + ": failed to copy, skipping delete.")
				serialErrorCount = serialErrorCount + 1
				continue

			#delete original
			res = es.delete(index='serial', doc_type='1', id=serial['_id'])
			if res['found']:
				logStatus("keyword " + str(serial['_source']['keyword']) + ", S/N " + str(serial['_source']['serial']) + ": original deleted")
			else:
				logStatus("keyword " + str(serial['_source']['keyword']) + ", S/N " + str(serial['_source']['serial']) + ": failed to delete original - watch out for a bloating dead database!")
				serialErrorCount = serialErrorCount + 1

	if serialErrorCount > 0:
		#it might be wise to put this in the email!
		logStatus("Checked for & cleaned dead serials successfully, but found some errors.  Please review the logs.")
	else:
		logStatus("Checked for & cleaned dead serials successfully")

#helper function to check and send emails for people to ask about toasters
def toasterHunt(locale):
  #first get the toasters in used from ES
  toastersInUsed = getAmount('TOASTER','Used',locale)
  res = es.search(index='serial', size=toastersInUsed, body={"query": {"bool": {"must": [{"match": {"keyword":"TOASTER"}}, {"match":{"status":"Used"}}, {"match":{"location":locale}}]}}})

  users = getIndex('users')

  #iterate on all toasters
  for toaster in res['hits']['hits']:

    #determine most recent history
    mostRecentIndex = 0
    mostRecentHistory = dateutil.parser.parse(toaster['_source']['history'][mostRecentIndex]['date'])

    #this isn't a very good way to sort considering python has other sort tricks, but unfortunately this is what we get
    #for storing datetimes as strings.
    for index, history in enumerate(toaster['_source']['history']):
      if dateutil.parser.parse(history['date']) > mostRecentHistory:
        mostRecentHistory = dateutil.parser.parse(history['date'])
        mostRecentIndex = index

    #now be sure there wasn't a lastEmail which should be the most recent...
    if 'lastEmail' in toaster['_source'].keys():
      if dateutil.parser.parse(toaster['_source']['lastEmail']) > mostRecentHistory:
        mostRecentHistory = dateutil.parser.parse(toaster['_source']['lastEmail'])

    #check to see if the most recent history was a week ago
    if mostRecentHistory + datetime.timedelta(days=7) < datetime.datetime.now():

      user = "UNKNOWN";

      #check to make sure the most recent user exists and has an email address
      for entry in users:
        if ((entry['_source']['user'] == toaster['_source']['history'][mostRecentIndex]['user']) and ('email' in entry['_source'].keys())):
          user = entry['_source']['user']
          break;

      #at this point, we've identified a toaster whose status we're curious about, possibly identified a user.
      #send an email to pdesk.

      res = es.update(index="serial", doc_type="1", id=toaster['_id'], body={"doc":{"lastEmail":datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}})
      toasterEmail = "Subject: TOASTER STATUS REMINDER\nTo: " + toasterAdmin + "\nFrom: Inventory Housekeeping\n\nIt has been one week since toaster " + str(toaster['_source']['serial']) + " was checked on or used, and it is still in used.  Please check on it.\n\nSome information:\nLast checked date: " + mostRecentHistory.strftime("%Y-%m-%d %H:%M:%S") + "\nLast user: " + str(toaster['_source']['history'][mostRecentIndex]['user']) + "\nLast note: " + str(toaster['_source']['history'][mostRecentIndex]['note']) + "\n\nThis email will be repeated weekly as a courtesy reminder to keep up on that toaster.  Enjoy!"

      ret = os.system("echo '" + toasterEmail + "' | /usr/sbin/ssmtp " + toasterAdmin)
      if (ret == 0):
        logStatus("Email regarding toaster " + str(toaster['_source']['serial']) + " sent to " + toasterAdmin)
      else:
        logStatus("Some problem sending the toaster email to " + toasterAdmin + " - echo and ssmtp dropped error code " + str(ret) + ". Divide by 256 to get the ACTUAL error code, remember!")

  logStatus("Finished checking for unreturned toasters in " + locale)

#script to hunt for anyone that has accidentally added a note but not changed the serial status
def auditSerials():
  serialJSON = getIndex('serial')
  auditNeeded = False
  auditEmail = "Subject: POSSIBLE SERIAL INPUT ERROR FOUND\nFrom: Inventory Housekeeping\n\nThe following possible updating errors have been made in the inventory system:\n"

  for item in serialJSON:
    for entry in item['_source']['history']:
      if 'prevStatus' in entry.keys():
        if entry['status'] == entry['prevStatus'] and entry['note'] != '':
          if dateutil.parser.parse(entry['date']) > (datetime.datetime.now() - datetime.timedelta(minutes=cronInterval)):
            auditNeeded = True
            auditEmail = auditEmail + "serial: " + str(item['_source']['serial']) + " " + json.dumps(entry) + "\n"

  if auditNeeded:
    ret = os.system("echo '" + auditEmail + "' | /usr/sbin/ssmtp " + auditAdmin)
    if (ret == 0):
      logStatus("Email regarding audits sent to " + auditAdmin)
    else:
      logStatus("Some problem sending the audit email to " + auditAdmin + " - echo and ssmtp dropped error code " + str(ret) + ". Divide by 256 to get the ACTUAL error code, remember!")

  logStatus("Finished auditing for possible user errors")


#Begin Main Routine
logStatus("[BEGIN HOUSEKEEPING CALL]")
logStatus("Beginning tracking info update")

try:
  checkTracks()
except:
  logStatus("Unspecified error while attempting to check tracking info")
  logStatus(traceback.format_exc())

logStatus("Beginning ticket update")

try:
  checkTickets()
except:
  logStatus("Unspecified error while attempting to check tickets")
  logStatus(traceback.format_exc())

logStatus("Beginning dead serial check")

try:
	checkSerials()
except:
	logStatus("Unspecified error while attempting to check and clean dead serials")
	logStatus(traceback.format_exc())

logStatus("Beginning item thresholding update")

try:
  for datacenter in locales:
    checkItems(datacenter)
except:
  logStatus("Unspecified error while attempting to check items")
  logStatus(traceback.format_exc())

logStatus("Beginning hunt for unreturned toasters")

try:
  for datacenter in locales:
    toasterHunt(datacenter)
except:
  logStatus("Unspecified error while attempting to hunt for unreturned toasters")
  logStatus(traceback.format_exc())

logStatus("Auditing recent inventory usage for errors")

try:
  auditSerials()
except:
  logStatus("Unspecified error while attempting to look for recent inventory usage errors")
  logStatus(traceback.format_exc())

logStatus("[END HOUSEKEEPING CALL]")
