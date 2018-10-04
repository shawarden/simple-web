#!/usr/bin/env python

import os

def psTreeF(ppid, parentDict):
	if ppid in parentDict:
		for pid in parentDict[ppid]:
			return ppid + "," + psTreeF(pid,parentDict)
	
	return ppid

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
	
	return output

def deHumanize(string):
	return os.popen("numfmt --from=iec --invalid='ignore' " + string).read().split('\n')[0]

