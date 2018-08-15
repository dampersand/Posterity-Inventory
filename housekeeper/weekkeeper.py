#!/usr/bin/python3

#slow housekeeper that runs once a week to email admin about built/qc'd servers and clean up the elasticsearch database

#libraries
import os
import traceback
import requests
from elasticsearch import Elasticsearch
import dateutil.parser
import datetime
import string
import smtplib
from email import message

#constants
es = Elasticsearch()
loglocation = '/var/log/inventory/weekkeeper'			#location of the log file
boolFalse = False						#a boolean set to 'false' to work with elasticsearch
boolTrue = True							#same as above, but 'true.'  Stupid workaround.
emailAdmin = "built/qc admin email here" #admin that should receive built/qc emails
fromEmail = "email address to masquerade as"  #'from' email address
fromName = "Inventory Housekeeping" #'from' name
smtpServer = "smtp.gmail.com"           #smtp server
smtpPort = 587                          #smtp port
smtpPass = "password for gmail's smtp server"       #pretend you didn't see this

#wrapper to log info re:weekkeeper
def logStatus(logstring):
  currenttime = str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S - "))
  string = currenttime + " " + logstring + "\n"
  log = open(loglocation, 'a')
  log.write(string)
  log.close()

#wrapper that returns entire index
def getIndex(ind):
  
  #get all current tracks in DB
  res = es.count(index=ind, body={"query": {"match_all": {}}})
  count = res['count']
  res = es.search(index=ind, body={"size":count, "query": {"match_all": {}}})
  return res['hits']['hits']

#subroutine to check users
def checkBuilds():

  #initialize the email body as a string
  emailBody = "The following servers passed qc since the last email:\n\nBuilder" + str("\t".expandtabs(10)) + "Builddate\tChecker" + str("\t".expandtabs(10)) + "Checkdate\tModel\n\n"
  buildCount = 0
  buildsJSON = getIndex('builds')
  passedBuildsCSV = "Builder,QC,Model\n" #we're going to create a csv as we go.

  for build in buildsJSON:

    #if the server is qc'd, continue.
    if 'qcstatus' in build['_source'].keys():

      #check that the server passed qc, if so, add it to the email body, reindex it in 'oldbuilds,' and move it out of the builds index.
      if build['_source']['qcstatus'] == 'pass':
        buildCount = buildCount + 1
        emailBody = emailBody + str(build['_source']['builder']) + str("\t".expandtabs(10)) + str(build['_source']['builddate']) + "\t" + str(build['_source']['checker']) + str("\t".expandtabs(10)) + str(build['_source']['qcdate']) + "\t" + str(build['_source']['model']) + "\nBuild notes:\t" + str(build['_source']['buildnotes']) + "\nQC notes:\t" + str(build['_source']['qcnotes']) + "\n"
        passedBuildsCSV = passedBuildsCSV + build['_source']['builder'] + "," + build['_source']['checker'] + "," + build['_source']['model'] + "\n"
        if 'history' in build['_source'].keys():
        	emailBody = emailBody + 'history:\n'
        	for histEntry in build['_source']['history']:
        		emailBody = emailBody + str(histEntry) + '\n'
        	emailBody = emailBody + '\n'
        res = es.index(index="oldbuilds", doc_type="1", body=build['_source'])
        res = es.delete(index='builds', doc_type='1', id=build['_id'])

  #Tack the CSV onto the end of the body
  emailBody = emailBody + "\n\n\nCSV-friendly shortlist\n" + passedBuildsCSV

  if buildCount > 0:
    msg = message.Message()
    msg.add_header('from', fromName)
    msg.add_header('to', emailAdmin)
    msg.add_header('subject', "Servers built, week ending " + datetime.datetime.now().strftime('%Y-%m-%d'))
    msg.set_payload(emailBody)

    server = smtplib.SMTP(smtpServer, smtpPort)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(fromEmail, smtpPass)

    server.sendmail(fromEmail, emailAdmin, msg.as_string())

    logStatus('Found ' + str(buildCount) + ' server builds to be emailed, sent email to ' + emailAdmin)

  else:
    logStatus('No server builds to be emailed to admin')

  logStatus('Finished checking for builds!')


#Begin Main Routine
logStatus("[BEGIN WEEKKEEPER CALL]")
logStatus("Beginning builds database cleanup")

try:
  checkBuilds()
except:
  logStatus("Unspecified error while attempting to check builds")
  logStatus(traceback.format_exc())

logStatus("[END WEEKKEEPER CALL]")
