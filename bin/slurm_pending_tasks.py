#!/usr/bin/env python

import os,myfuncs,settings

# Create dictionary of pending jobs

sqqDict = {}
for line in os.popen("squeue -t PENDING -ho '%.20A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	if line == '': continue
	
	lineBlocks = line.split(',')
	
	# Store jobID : dataset
	sqqDict[lineBlocks[settings.jobLine['jobid']]] = lineBlocks[settings.jobLine['user']] + "," + lineBlocks[settings.jobLine['account']] + "," + lineBlocks[settings.jobLine['jobarray']].replace('_N/A','') + "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['elapsed']]) + "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['timelimit']]) + "," + lineBlocks[settings.jobLine['state']] + "," + lineBlocks[settings.jobLine['partition']] + "," + lineBlocks[settings.jobLine['cpualloc']] + "," + str(myfuncs.deHumanize(lineBlocks[settings.jobLine['memalloc']])) + "," + lineBlocks[settings.jobLine['hostlist']].replace('(','').replace(')','') + "," + lineBlocks[settings.jobLine['jobname']]

pendList = open(settings.filePending, "w")
pendList.write("START\n")

for jobid in sqqDict:
	pendList.write(jobid + "," + sqqDict[jobid] + "\n")

pendList.write("END\n")
pendList.close()
