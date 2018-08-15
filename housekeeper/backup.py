#!/usr/bin/python3

#libraries
from elasticsearch import Elasticsearch
from elasticsearch import client
import traceback
import dateutil.parser
import datetime
import sys
import os

#constants
es = Elasticsearch()
cl = client.SnapshotClient					#ES snapshot client
repo = 'backup'							#Name of pre-initialized backup repo
loglocation = '/var/log/inventory/backup'			#location of the log file
admin = "admin@yourhosthere.com"				#administrator to email if something goes wrong
dailybackuplife = 2592000					#How long daily backups should live, in days
weeklybackuplife = 15552000					#How long weekly backups should live, in days
snapName = datetime.datetime.now().strftime("%Y-%m-%d")		#Name of the next snapshot
boolFalse = False						#a boolean set to 'false' to work with elasticsearch
boolTrue = True							#same as above, but 'true.'  Stupid workaround.

#wrapper to log info re:backup
def logStatus(logstring):
  currenttime = str(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S - "))
  string = currenttime + " " + logstring + "\n"
  log = open(loglocation, 'a')
  log.write(string)
  log.close()

#Helper Functions

#Helper function to collect all snapshots
def getSnaps():
  return cl.get(es, repo, '_all')

#And to make a snapshot
def makeSnap(name):
  cl.create(es, repo, name, wait_for_completion=True)

#Helper function to delete snapshots
def delSnap(name):
  cl.delete(es, repo, name)

#Email the admin
def emailAdmin(infoMessage):
  email = "Subject: INVENTORY BACKUP ERROR\nFrom: Inventory Housekeeping\n\nAn error occurred while running the inventory backup routine:\n\n" + infoMessage
  ret = os.system("echo '" + email + "' | /usr/sbin/ssmtp " + admin)
  if (ret == 0):
    logStatus("Email sent to " + admin)
  else:
    logStatus("Some problem sending the email - echo and ssmtp dropped error code " + str(ret) + ". Divide by 256 to get the ACTUAL error code, remember!")

#Subroutines

#Clean up old backups subroutine
def cleanBackups():
  snaps = getSnaps()

  now = datetime.datetime.now()

  #check every snap
  for snap in snaps['snapshots']:

    #skip init
    if snap['snapshot'] == 'init':
      continue

    #get snap's date
    snapDate = dateutil.parser.parse(snap['start_time'])
    snapDate = snapDate.replace(tzinfo=None)

    #if the snap was taken monday morning, treat it as weekly
    #Note: weekday() returns 0 for monday, 1 for tues, etc
    if snapDate.weekday() == 0:
      life = weeklybackuplife
    else:
      life = dailybackuplife

    #Now delete the snap if it's past its life
    if (now - snapDate).seconds > life:
      logStatus("Deleting snapshot " + snap['snapshot'])
      delSnap(snap['snapshot'])

#Begin Main Routine
logStatus("[BEGIN BACKUP ROUTINE]")
logStatus("Creating snapshot " + snapName)

try:
  makeSnap(snapName)
except:
  logStatus("Unspecified error while attempting to create snapshot")
  logStatus(traceback.format_exc())
  #email admin and quit
  emailAdmin("Unspecified error while creating snapshot\n\n" + traceback.format_exc())
  logStatus("[BACKUP ROUTINE FAILED]")
  sys.exit()

logStatus("Beginning snapshot cleanup")

try:
  cleanBackups()
except:
  logStatus("Unspecified error while cleaning backups")
  logStatus(traceback.format_exc())
  #email admin and quit
  emailAdmin("Unspecified error while cleaning backups\n\n" + traceback.format_exc())
  logStatus("[BACKUP ROUTINE FAILED]")
  sys.exit()

logStatus("[END BACKUP ROUTINE]")
