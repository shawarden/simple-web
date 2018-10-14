#!/usr/bin/env python

import os,myfuncs,settings

# Create dictionary of pending jobs

sqqDict = {}
for line in os.popen("squeue -t PENDING -ho '%.20A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	if line == '': continue
	
	# Store jobID : dataset
	lineBlocks        = line.split(',')
	curJobID          = lineBlocks[settings.jobLine['jobID']]
	sqDict[curJobID]  = curJobID
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['user']]
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['account']]
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['jobArray']].replace('_N/A','')
	sqDict[curJobID] += "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['elapsed']])
	sqDict[curJobID] += "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['timeLimit']])
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['state']]
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['partition']]
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['cpuAlloc']]
	sqDict[curJobID] += "," + str(myfuncs.deHumanize(lineBlocks[settings.jobLine['memAlloc']]))
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['hostList']].replace('(','').replace(')','').replace('JobArrayTaskLimit','ArrayLimit')
	sqDict[curJobID] += "," + lineBlocks[settings.jobLine['jobName']]

pendList = open(settings.filePending, "w")
pendList.write("START\n")

for jobid in sqqDict:
	pendList.write(sqqDict[jobid] + "\n")

pendList.write("END\n")
pendList.close()
