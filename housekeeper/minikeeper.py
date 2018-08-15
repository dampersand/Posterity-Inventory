#!/usr/bin/python3

#small housekeeper that runs once every few minutes to check the user DB for any distress

#libraries
import os
import traceback
import requests
from elasticsearch import Elasticsearch
import dateutil.parser
import datetime
import string
import random
import bcrypt

#constants
es = Elasticsearch()
loglocation = '/var/log/inventory/minikeeper'			#location of the log file
boolFalse = False						#a boolean set to 'false' to work with elasticsearch
boolTrue = True							#same as above, but 'true.'  Stupid workaround.
frontendLocation = 'https://www.whereveryouputyourinventorysystem.com'

#wrapper to log info re:minikeeper
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
def checkUsers():

  #initialize the email body as a string
  email = ""
  userJSON = getIndex('users')

  for user in userJSON:

    #if it doesn't have a distressFlag entry, add it
    if not 'distressFlag' in user['_source'].keys():
      res = es.update(index="users", doc_type="1", id=user['_id'], body={"doc":{"distressFlag":boolFalse}})
      user['_source']['distressFlag'] = False
    
    #if it doesn't have a dTime entry, add it
    if not 'dTime' in user['_source'].keys():
      res = es.update(index="users", doc_type="1", id=user['_id'], body={"doc":{"dTime":datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}})
      user['_source']['dTime'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    #if it doesn't have a recovery entry, add it
    if not 'recovery' in user['_source'].keys():
      res = es.update(index="users", doc_type="1", id=user['_id'], body={"doc":{"recovery":""}})
      user['_source']['recovery'] = ""

    #if the distressFlag is ON, turn it off, generate a key, and send out an email.
    if user['_source']['distressFlag']:

      #but if there's no email field, complain, log, and move on
      if not 'email' in user['_source'].keys():
        logStatus('user ' + user['_source']['user'] + ' has requested a passreset, but has no email address set!  Continuing...')
        continue
      if user['_source']['email'] == '':
        logStatus('user ' + user['_source']['user'] + ' has requested a passreset, but has no email address set!  Continuing...')
        continue

      #keygen, update, and send
      keystr = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.ascii_lowercase + string.digits) for _ in range(16))
      key = bcrypt.hashpw(keystr.encode(encoding='UTF-8'), bcrypt.gensalt())
      key = key.decode()

      res = es.update(index="users", doc_type="1", id=user['_id'], body={"doc":{"distressFlag":boolFalse, "recovery":key}})
      email = "Subject: Your inventory key\nFrom: Inventory Housekeeping\n\n" + user['_source']['user'] + ",\n\nSomeone has attempted to reset your password on the Inventory System.  If this was not you, you may delete and disregard this email (though it may be wise to alert a supervisor).\n\nYour temporary key is:\n\n" + keystr +"\n\nEnter this key into " + frontendLocation + "/inventory/forgot.html to change your password.\n\nThis is a single-use key that will expire in two hours.  Enjoy!\n\n\nThis email was generated at " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + " in response to a password reset request at " + user['_source']['dTime'] + "."
      os.system("echo '" + email + "' | /usr/sbin/ssmtp " + user['_source']['email'])
      logStatus('Generated key and sent email to ' + user['_source']['email'] + ' for user ' + user['_source']['user'])

    #if the dTime is older than two hours, wipe the recovery key
    if (dateutil.parser.parse(user['_source']['dTime']) + datetime.timedelta(hours=2) < datetime.datetime.now()) and (user['_source']['recovery'] != ""):
      res = es.update(index="users", doc_type="1", id=user['_id'], body={"doc":{"recovery":""}})
      logStatus('Wiped ' + user['_source']['user'] + "'s expired key")

  logStatus('Finished checking user database!')


#Begin Main Routine
logStatus("[BEGIN MINIKEEPER CALL]")
logStatus("Beginning user database cleanup")

try:
  checkUsers()
except:
  logStatus("Unspecified error while attempting to check users")
  logStatus(traceback.format_exc())

logStatus("[END MINIKEEPER CALL]")
