#!/usr/bin/env python

import os,myfuncs

pendFile = "/dev/shm/slurm_pending_tasks.txt"

# Create dictionary of pending jobs

sqqDict = {}
for line in os.popen("squeue -t PENDING -ho '%.20A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	if line == '': continue
	
	lineBlocks = line.split(',')
	
	# Store jobID : dataset
	sqqDict[lineBlocks[0]] = lineBlocks[1] + "," + lineBlocks[2] + "," + lineBlocks[3].replace('_N/A','') + "," + myfuncs.toSeconds(lineBlocks[4]) + "," + myfuncs.toSeconds(lineBlocks[5]) + "," + lineBlocks[6] + "," + lineBlocks[7] + "," + lineBlocks[8] + "," + myfuncs.deHumanize(lineBlocks[9]) + "," + lineBlocks[10].replace('(','').replace(')','').replace('JobArrayTaskLimit','ArrayLimit') + "," + lineBlocks[11]

pendList = open(pendFile, "w")
pendList.write("START\n")

for jobid in sqqDict:
	pendList.write(jobid + "," + sqqDict[jobid] + "\n")

pendList.write("END\n")
pendList.close()
