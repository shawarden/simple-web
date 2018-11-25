#!/usr/bin/env python

import os,myfuncs,settings

# Create dictionary of pending jobs

sqDict = {}
for line in os.popen("squeue -t PENDING -hO jobid:100,username:100,account:100,jobarrayid:100,timeused:100,timelimit:100,state:100,partition:100,tres-alloc:100,reasonlist:100,name:100 | awk -v OFS='|' '$1=$1'").read().split('\n'):
	if line == '': continue
	
	# Store jobID : dataset
	lineBlocks        = line.split('|')
	curJobID          = lineBlocks[settings.queueLine['jobID']]
	sqDict[curJobID]  = curJobID
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['user']]
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['account']]
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['jobArray']].replace('_N/A','').replace(',','@@')
	sqDict[curJobID] += "," + myfuncs.toSeconds(lineBlocks[settings.queueLine['elapsed']])
	sqDict[curJobID] += "," + myfuncs.toSeconds(lineBlocks[settings.queueLine['timeLimit']])
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['state']]
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['partition']]
	
	tresAlloc = lineBlocks[settings.queueLine['tresAlloc']].split(',')
	
	sqDict[curJobID] += "," + tresAlloc[0].split('=')[1]
	sqDict[curJobID] += "," + str(myfuncs.deHumanize(tresAlloc[1].split('=')[1]))
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['hostList']].replace(',','@@').replace('(','').replace(')','')
	sqDict[curJobID] += "," + lineBlocks[settings.queueLine['jobName']]

pendList = open(settings.filePending, "w")
pendList.write("START\n")

for jobid in sqDict:
	pendList.write(sqDict[jobid] + "\n")

pendList.write("END\n")
pendList.close()
