#!/usr/bin/env python

import os,myfuncs,settings,random

# Current host's name
hostName  = os.uname()[1].split('.')[0]

trackFile = settings.filePeak(hostName)

# Create dictionary of slurm jobs currently running on this node.
sqDict = {}
for line in os.popen("squeue --nodelist=" + hostName + " -ho '%.100A %100u %100a %.20F_%100K %.20M %100l %.20T %.20P %100C %100m %R %j' | sed 's/,/@@/g' | awk -v OFS=',' '$1=$1'").read().split('\n'):
	# Is last line blank again?
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

# Quit now if no jobs on node.
if len(sqDict) < 1:
	curPeak = open(trackFile, "w")
	curPeak.write("START\nEND\n")
	curPeak.close()
	quit()

# Create dictionary of processes.
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

# Create dictionary of jobids and steps, storing ps tree data for cumulative resource consumption
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
			jobTree[cpid] = {
				'pcpu' : float(psDict[cpid]['pcpu']),
				'rss'  : int(psDict[cpid]['rss']),
				'cmd'  : cmd,
				'user' : psDict[cpid]['user']
			}
		
		# append to existing jobid
		if jobID in stepDict:
			stepDict[jobID].update({jobStep : jobTree })
		else:
			stepDict[jobID] = { jobStep : jobTree }

driveDict = {}
for jobID in stepDict:
	users = ''
	for jobStep in stepDict[jobID]:
		for pid in stepDict[jobID][jobStep]:
			user = stepDict[jobID][jobStep][pid]['user']
			if users == '' 	:	# Set user
				users = user
			elif not user in users:	# User doesn't match? Umm... what?
				print("WARN: " + user + " is not " + users + "!")
	
	diskUseDict = {}
	# Get file system usage
	diskUseDict['ramDisk'] = int(os.popen("sudo du -bxsL /dev/shm/" + users + "/" + jobID).read().split('\n')[0].split()[0])
	diskUseDict['tmpDisk'] = int(os.popen("sudo du -bxsL /tmp/"     + users + "/" + jobID).read().split('\n')[0].split()[0])
	diskUseDict['scratch'] = int(os.popen("sudo du -bxsL /scratch/" + users + "/" + jobID).read().split('\n')[0].split()[0])
	driveDict[jobID] = diskUseDict

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
		peakDict[blocks[settings.jobLine['jobID']]] = {
			'pcpu' : float(blocks[settings.jobLine['cpuPeak']]),
			'rss' : int(blocks[settings.jobLine['memPeak']])
		}
	
	prevPeak.close()

userDict = {}
for line in os.popen("cat " + settings.fileUserMap).read().split('\n'):
	# Blank or comment
	if (line == '') or (line.startswith('#')): continue
	
	lineBlocks = line.split(":")
	userName = lineBlocks[settings.userLine['user']].lower()
	
	userDict[userName] = {
		'name'    : lineBlocks[settings.userLine['name']],
		'email'   : lineBlocks[settings.userLine['email']]
	}

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
	
	# Normalize CPU usage if userland threads exceed 100% 	
	# Not entirely sure how a process that's locked to cores X~Y can exceed 100% capacity of X~Y
	# Perhaps it's due to the way 'ps' reports pcpu values?
	sqBlocks = sqDict[jobID].split(',')
	maxCPU   = float(sqBlocks[settings.jobLine['cpuAlloc']])
	maxMEM   = int(sqBlocks[settings.jobLine['memAlloc']])
	
	totalMEM  = driveDict[jobID]['ramDisk'] + rss
	rss  += driveDict[jobID]['ramDisk']
	cmds += "|0:RAM:0.0:" + str(driveDict[jobID]['ramDisk'])
	
	if totalMEM > maxMEM:
		exceedMEM = totalMEM - maxMEM
		rndChance = random.random()
		print("WARN: " + str(totalMEM) + " exceeds " + str(maxMEM) + " by " + str(exceedMEM) + "! " + str(rndChance) + " to quit")
		jobState  = sqBlocks[settings.jobLine['state']]
		if jobState != "COMPLETING" and rndChance < 0.1:
			userName  = sqBlocks[settings.jobLine['user']]
			jobArray  = sqBlocks[settings.jobLine['jobArray']]
			name      = userDict[userName]['name']
			email     = userDict[userName]['email']
			emailFrom = userDict['root']['email']
			nameFrom  = userDict['root']['name']
			subject   = "DSMC Job " + jobArray + " canceled due to excessive memory usage"
			message   = "<p>Dear " + name + "</p>\n"
			message  += "<p>Your job " + jobArray + " on the DSMC cluster has exceeded its requested memory allocation of " + myfuncs.humanize(maxMEM) + "B by " + myfuncs.humanize(exceedMEM) + "B</p>\n"
			message  += "<p>Please increase your memory allocation request using '--mem #' or '--mem-per-cpu #'</p>\n"
			message  += "<p># is in megabytes by default, but you can add a g or G to specify gigabytes</p>\n"
			message  += "<p>Kind regards,<br>&nbsp;&nbsp;" + nameFrom + "<br>&nbsp;&nbsp;DSMC administrator</p>\n"
			
			sendMsg   = os.popen("echo \"From: " + emailFrom + " \nTo: " + email + " \nCC: " + emailFrom + "\nMIME-Version:1.0\nContent-Type: text/html \nSubject: " + subject + "\n\n<html>\n\t<head>\n\t\t<title>" + subject + "</title>\n\t</head>\n\t<body>\n" + message + "\n\t</body>\n</html>\" | /usr/sbin/sendmail -t").read()
			
			killit = os.popen("scancel -f " + jobID).read()
		
	if jobID in peakDict:
		peakCPU = pcpu if pcpu > peakDict[jobID]['pcpu'] else peakDict[jobID]['pcpu']
		peakRSS = rss  if rss  > peakDict[jobID]['rss']  else peakDict[jobID]['rss']
	else:
		peakCPU = pcpu
		peakRSS = rss
	
	peakCPU = maxCPU if peakCPU > maxCPU else peakCPU
	pcpu    = maxCPU if pcpu    > maxCPU else pcpu
	
	driveUse = str(driveDict[jobID]['ramDisk']) + ":" + str(driveDict[jobID]['tmpDisk']) + ":" + str(driveDict[jobID]['scratch'])
	
	# Dump merged jobid line.
	outLine = sqDict[jobID] + "," + str(pcpu) + "," + str(peakCPU) + "," + str(rss) + "," + str(peakRSS) + "," + hostName + "," + cmds + "," + driveUse
	
#	print(outLine)
	
	curPeak.write(outLine + "\n")

curPeak.write("END\n")
curPeak.close()
