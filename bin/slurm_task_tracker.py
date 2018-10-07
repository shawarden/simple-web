#!/usr/bin/env python

import os,myfuncs,settings 

# Current host's name
hostName  = os.uname()[1].split('.')[0]

trackFile = settings.filePeak(hostName)

# Create dictionary of slurm jobs currently running on this node.
sqDict = {}
for line in os.popen("squeue --nodelist=" + hostName + " -ho '%.100A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	# Is last line blank again?
	if line == '': continue
	
	lineBlocks = line.split(',')
	
	# Store jobID : dataset
	sqDict[lineBlocks[settings.jobLine['jobid']]] = lineBlocks[settings.jobLine['user']] + "," + lineBlocks[settings.jobLine['account']] + "," + lineBlocks[settings.jobLine['jobarray']].replace('_N/A','') + "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['elapsed']]) + "," + myfuncs.toSeconds(lineBlocks[settings.jobLine['timelimit']]) + "," + lineBlocks[settings.jobLine['state']] + "," + lineBlocks[settings.jobLine['partition']] + "," + lineBlocks[settings.jobLine['cpualloc']] + "," + myfuncs.deHumanize(lineBlocks[settings.jobLine['memalloc']]) + "," + lineBlocks[settings.jobLine['hostlist']].replace('(','').replace(')','').replace('JobArrayTaskLimit','ArrayLimit') + "," + lineBlocks[settings.jobLine['jobname']]

# Quit now if no jobs on node.
if len(sqDict) < 1:
	curPeak = open(trackFile, "w")
	curPeak.write("START\nEND\n")
	curPeak.close()
	quit()

# Create dictionary of process list.
psDict = {}
for line in os.popen("ps haxo pid,ppid,pcpu,rss,user:20,args").read().split('\n'):
	# Is last line blanb again?
	if line == '': continue
	
	# Split ps line by white space
	blocks = line.split()
	
	# set data types
	pid    = blocks[0]
	ppid   = blocks[1]
	pcpu   = "{0:.3f}".format(float(blocks[2]) / 100.0)
	rss    = int(blocks[3]) * settings.memMult
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

# Create parent-child map
parentDict = {}
for pid in psDict:
	# Get pid -> ppid as reported by ps
	ppid = psDict[pid]['ppid']
	
	# Append pid to parent pid's list of children
	if not ppid in parentDict:
		# Parent doesn't exists: create new list. 
		parentDict[ppid] = []
	
	parentDict[ppid].append(pid)

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
		for cpid in myfuncs.psTreeF(pid, parentDict).split(','):
			# some pids don't exist? wtf.
			# last line might be empty?
			if cpid == '' or not cpid in psDict: continue
			
			# get the comand only.
			cmd = psDict[cpid]['args'].split()[0]
			
			# ignore slurmstepd since they are root processes and dont count toward overall total
			if "slurmstepd" in cmd: continue
			if "<defunct>" in psDict[cpid]['args']: continue
			
			# Assemble jobstep dictionary
			jobTree[cpid] = { 'pcpu' : psDict[cpid]['pcpu'], 'rss' : psDict[cpid]['rss'], 'cmd' : cmd, 'user' : psDict[cpid]['user'] }
		
		# append to existing jobid
		if jobID in stepDict:
			stepDict[jobID].update({jobStep : jobTree })
		else:
			stepDict[jobID] = { jobStep : jobTree }

# Retrieve previous peak dataset
peakDict = {}
# Does the file exist?
if os.path.isfile(trackFile):
	# Open it
	prevPeak = open(trackFile, "r")
	
	# Cycle through lines
	for line in prevPeak:
		# Ignore write-state and empty liner
		if line.startswith('START') or line.startswith('END') or line == '': continue
		
		blocks = line.split(',')
		#print(len(blocks), blocks[0])
		peakDict[blocks[0]] = { 'pcpu' : float(blocks[13]), 'rss' : int(blocks[15])}
	
	prevPeak.close()

# Store peak dataset
curPeak = open(trackFile, "w")
curPeak.write("START\n")

# Dump output
for jobID in stepDict:
	# reset cumulative values
	pcpu  = float(0.0)
	rss   = int(0)
	cmds  = ''
	users = ''
#	print(jobID)
	#cycle through jobsteps
	for jobStep in stepDict[jobID]:
		# Cycle through pids
#		print(jobStep)
		for pid in stepDict[jobID][jobStep]:
#			print(pid)
			# add up bits
			pcpu += float(stepDict[jobID][jobStep][pid]['pcpu'])
			rss  += int(stepDict[jobID][jobStep][pid]['rss'])
			
			# Get cmd, strip path
			cmd  = stepDict[jobID][jobStep][pid]['cmd'].split('/')
			bCmd = cmd[len(cmd)-1]
			
			# Get username
			user = stepDict[jobID][jobStep][pid]['user']
			
#			print(jobID,user)
			
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
#	shm   = int(os.popen("du -bxsL /dev/shm/" + users + "/" + jobID).read().split('\n')[0].split()[0])
#	rss  += shm
#	cmds  = "0:RAMDisk:0:" + str(shm) + "|" + cmds
	
	# Normalize CPU usage if userland threads exceed 100% 	
	# Not entirely sure how a process that's locked to cores X~Y can exceed 100% capacity of X~Y
	# Perhaps it's due to the way 'ps' reports pcpu values?
	maxCPU = float(sqDict[jobID].split(',')[settings.jobLine['cpualloc']])
	
	if jobID in peakDict:
		peakCPU = pcpu if pcpu > peakDict[jobID]['pcpu'] else peakDict[jobID]['pcpu']
		peakRSS = rss  if rss  > peakDict[jobID]['rss']  else peakDict[jobID]['rss']
	else:
		peakCPU = pcpu
		peakRSS = rss
	
	peakCPU = maxCPU if peakCPU > maxCPU else peakCPU
	pcpu    = maxCPU if pcpu    > maxCPU else pcpu
	
	# Dump merged jobid line.
	outLine = jobID + "," + sqDict[jobID] + "," + str(pcpu) + "," + str(peakCPU) + "," + str(rss) + "," + str(peakRSS) + "," + hostName + "," + cmds
	
	curPeak.write(outLine + "\n")

curPeak.write("END\n")
curPeak.close()
