#!/usr/bin/env python

import os, re

#def psTreeF(ppid):
#	pidList = ppid
#	if ppid in parentDict:
#		for pid in parentDict[ppid].split(','):
#			pidList = ppid + "," + psTreeF(pid)
#		return pidList
#	else:
#		return pidList

# Current host's name
hostName = os.popen("hostname -s").read().split('\n')[0]

# File to track peak datasets
peakFile = "/dev/shm/slurm_task_tracker_" + hostName + ".txt"
pendFile = "/dev/shm/slurm_pending_tasks.txt"

def toSeconds(time):
#	print(time)
	timeDHMS   = time.replace('-',':').split(':')
	timeBlocks = len(timeDHMS)
	for i in range(timeBlocks):
		timeDHMS[i] = int(timeDHMS[i])
		
	if (timeBlocks == 4):	# DD-HH:MM:SS
		output = str((timeDHMS[0] * 86400) + (timeDHMS[1] * 3600) + (timeDHMS[2] * 60) + timeDHMS[3])
	elif (timeBlocks == 3):	# HH:MM:SS
		output = str((timeDHMS[0] * 3600) + (timeDHMS[1] * 60) + timeDHMS[2])
	elif (timeBlocks == 2):	# MM:SS
		output = str((timeDHMS[0] * 60) + timeDHMS[1])
	else:	# MM
		output = str(timeDHMS[0] * 60)
	
#	print(output)
	return output

def deHumanize(string):
	return os.popen("numfmt --from=iec --invalid='ignore' " + string).read().split('\n')[0]

# Create dictionary of slurm jobs currently running on this node.
sqDict = {}
for line in os.popen("squeue --nodelist=" + hostName + " -ho '%.100A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	# Is last line blank again?
	if line == '': continue
	
	lineBlocks = line.split(',')
	
	# Store jobID : dataset
	sqDict[lineBlocks[0]] = lineBlocks[0] + "," + lineBlocks[1] + "," + lineBlocks[2] + "," + lineBlocks[3].replace('_N/A','') + "," + toSeconds(lineBlocks[4]) + "," + toSeconds(lineBlocks[5]) + "," + lineBlocks[6] + "," + lineBlocks[7] + "," + lineBlocks[8] + "," + deHumanize(lineBlocks[9]) + "," + lineBlocks[10].replace('(','').replace(')','').replace('JobArrayTaskLimit','ArrayLimit') + "," + lineBlocks[11]

# Create dictionary of pending jobs
if "dsmc0" in hostName:
	sqqDict = {}
	for line in os.popen("squeue -t PENDING -ho '%.20A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
		if line == '': continue
		
		lineBlocks = line.split(',')
		
		# Store jobID : dataset
		sqqDict[lineBlocks[0]] = lineBlocks[1] + "," + lineBlocks[2] + "," + lineBlocks[3].replace('_N/A','') + "," + toSeconds(lineBlocks[4]) + "," + toSeconds(lineBlocks[5]) + "," + lineBlocks[6] + "," + lineBlocks[7] + "," + lineBlocks[8] + "," + deHumanize(lineBlocks[9]) + "," + lineBlocks[10].replace('(','').replace(')','').replace('JobArrayTaskLimit','ArrayLimit') + "," + lineBlocks[11]
	
	pendList = open(pendFile, "w")
	pendList.write("START\n")
	
	for jobid in sqqDict:
		pendList.write(jobid + "," + sqqDict[jobid] + "\n")
	
	pendList.write("END\n")
	pendList.close()

# Quit now if no jobs on node.
if len(sqDict) < 1:
	curPeak = open(peakFile, "w")
	curPeak.write("START\nEND\n")
	curPeak.close()
	quit()

# Create dictionary of process list.
psDict = {}
for line in os.popen(
	"ps haxo pid,ppid,pcpu,rss,user:20,args"
).read().split('\n'):
	# Is last line blanb again?
	if line == '': continue
	
	# Split ps line by white space
	blocks = line.split()
	
	# set data types
	pid    = str(int(blocks[0]))
	ppid   = str(int(blocks[1]))
	pcpu   = "{0:.3f}".format(float(blocks[2]) / 100.0)
	rss    = int(blocks[3]) * 1024
	user   = blocks[4]
	
	# Reassemble command lime
	args   = ''
	
	for j in range(5, len(blocks)):
		if args == '':
			args = blocks[j]
		else:
			args = args + " " + blocks[j]
	
	# Create per pid dictionary
	curTaskDict = {
		'ppid' : ppid,
		'pcpu' : pcpu,
		'rss'  : rss,
		'args' : args,
		'user' : user
	}
	
	# set current PID's data set
	psDict[pid] = curTaskDict

# Create parent-chidren map
#parentDict = {}
#for pid in psDict:
#	ppid = psDict[pid]['ppid']
#	
#	if ppid in parentDict:
#		parentDict[ppid] = parentDict[ppid] + "," + pid
#	else:
#		parentDict[ppid] = pid

#print(parentDict)

# Create dictionary of jobids and steps, storing pstree data for cumulative resourse consumption
stepDict = {}
for pid in psDict:
	# get command line
	cmdLine = psDict[pid]['args']
	
	# check for slurm job step
	if "slurmstepd:" in cmdLine:
		# get command
		args  = cmdLine.split()
		cmd  = args[0]
		# split for jobstep
		(jobID, jobStep) = args[1].split('[')[1].split(']')[0].split('.')
		
		# extract cumulative resource usage for each child process.
		jobTree = {}
		for pid in os.popen(
			"pstree -p " + pid + " | awk -F'[()]' '{for (i=2;i<=NF;i+=2) print $i}'"
		).read().split('\n'):
			# some pids don't exist? wtf.
			# last line might be empty?
			if pid == '' or not pid in psDict: continue
			
			# get the comand only.
			cmd = psDict[pid]['args'].split()[0]
			
			# ignore slurmstepd since they are root processes and dont count toward overall total
			if "slurmstepd" in cmd: continue
			if "<defunct>" in psDict[pid]['args']: continue
			
			# Assemble jobstep dictionary
			jobTree[pid] = { 'pcpu' : psDict[pid]['pcpu'], 'rss' : psDict[pid]['rss'], 'cmd' : cmd, 'user' : psDict[pid]['user'] }
		
		# append to existing jobid
		if jobID in stepDict:
			stepDict[jobID].update({jobStep : jobTree })
		else:
			stepDict[jobID] = { jobStep : jobTree }

# Retrieve previous peak dataset
peakDict = {}
# Does the file exist?
if os.path.isfile(peakFile):
	# Open it
	prevPeak = open(peakFile, "r")
	
	# Cycle through lines
	for line in prevPeak:
		# Ignore write-state and empty liner
		if line.startswith('START') or line.startswith('END') or line == '': continue
		
		blocks = line.split(',')
		#print(len(blocks), blocks[0])
		peakDict[blocks[0]] = { 'pcpu' : float(blocks[13]), 'rss' : int(blocks[15])}
	
	prevPeak.close()

# Store peak dataset
curPeak = open(peakFile, "w")
curPeak.write("START\n")

# Dump output
for jobID in stepDict:
	# reset cumulative values
	pcpu  = float(0.0)
	rss   = int(0)
	cmds  = ''
	users = ''
	
	#cycle through jobsteps
	for jobStep in stepDict[jobID]:
		# Cycle through pids
		for pid in stepDict[jobID][jobStep]:
			
			# add up bits
			pcpu += float(stepDict[jobID][jobStep][pid]['pcpu'])
			rss  += int(stepDict[jobID][jobStep][pid]['rss'])
			
			# Get cmd, strip path
			cmd  = stepDict[jobID][jobStep][pid]['cmd'].split('/')
			bCmd = cmd[len(cmd)-1]
			
			# Get username
			user = stepDict[jobID][jobStep][pid]['user']
			
			if users == '' 	:	# Set user
				users = user
			elif not user in users:	# User doesn't match? Umm... what?
				print("WARN: " + user + " is not " + users + "!")
			
			# include srun resource consumption but skip their pid:bCmd
			if "srun" in bCmd: continue
			
			# Assemble resource consumption line
			newLine = str(pid) + ":" + bCmd + ":" + str(stepDict[jobID][jobStep][pid]['pcpu']) + ":" + str(stepDict[jobID][jobStep][pid]['rss'])
			if cmds == '':	# set initial line
				cmds = newLine
			else: # append existing line
				cmds = cmds + "|" + newLine
	
	# Get shared memory usage.
	# Add to resident memory value.
	# Show as line item on PS list.
	# $SHM_DIR /dev/shm/$USER/$SLURM_JOBID 
	shm   = int(os.popen("du -bxsL /dev/shm/" + users + "/" + jobID).read().split('\n')[0].split()[0])
	rss  += shm
	cmds  = "0:RAMDisk:0:" + str(shm) + "|" + cmds
	
	# Normalize CPU usage if userland threads exceed 100% 	
	# Not entirely sure how a process that's locked to cores X~Y can exceed 100% capacity of X~Y
	# Perhaps it's due to the way 'ps' reports pcpu values?
	maxCPU = float(sqDict[jobID].split(',')[8])
	
	if jobID in peakDict:
		peakCPU = pcpu if pcpu > peakDict[jobID]['pcpu'] else peakDict[jobID]['pcpu']
		peakRSS = rss  if rss  > peakDict[jobID]['rss']  else peakDict[jobID]['rss']
	else:
		peakCPU = pcpu
		peakRSS = rss
	
	peakCPU = maxCPU if peakCPU > maxCPU else peakCPU
	pcpu    = maxCPU if pcpu    > maxCPU else pcpu
	
	# Dump merged jobid line.
	outLine = sqDict[jobID] + "," + str(pcpu) + "," + str(peakCPU) + "," + str(rss) + "," + str(peakRSS) + "," + cmds
	
	#print(outLine)
	curPeak.write(outLine + "\n")

curPeak.write("END\n")
curPeak.close()
