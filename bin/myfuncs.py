#!/usr/bin/env python

import settings

# Takes a PID and a PPID:PIDs tree.
# Returns all descendant process pids.
def psTreeF(ppid, parentDict):
	# pid is a parent
	if ppid in parentDict:
		# Cycle through all children.
		for pid in parentDict[ppid]:
			# return concatenated string of pids.
			return ppid + "," + psTreeF(pid,parentDict)
	
	# return childless pid.
	return ppid

# Takes time string [[DD-[HH:]MM[:SS]
# Returns number of seconds.
def toSeconds(time):
	# Split time string by dividers.
	timeDHMS   = time.replace('-',':').split(':')
	
	# Determine how many blocks.
	timeBlocks = len(timeDHMS)
	
	# Integers are nice.
	for i in range(timeBlocks):
		timeDHMS[i] = int(timeDHMS[i])
		
	# Build output string.
	if (timeBlocks == 4):	# DD-HH:MM:SS
		output = str((timeDHMS[0] * 86400) + (timeDHMS[1] * 3600) + (timeDHMS[2] * 60) + timeDHMS[3])
	elif (timeBlocks == 3):	# HH:MM:SS
		output = str((timeDHMS[0] * 3600) + (timeDHMS[1] * 60) + timeDHMS[2])
	elif (timeBlocks == 2):	# MM:SS
		output = str((timeDHMS[0] * 60) + timeDHMS[1])
	else:	# MM
		output = str(timeDHMS[0] * 60)
	
	return output

# Takes a number suffixed with a humanized multiplier.
# Returns the raw integer value equivalent. 
def deHumanize(string):
	# Strip last char for number.
	baseNumber = float(string[:-1])
	
	# Get last char for multiplier.
	multiplier = string[-1]
	
	# Get exponent value from char position.
	multChars  = " KMGTPEZ"
	multiPos   = multChars.find(multiplier)
	
	# Do we have a valid location?
	if multiPos > -1:
		return int(baseNumber * settings.memMult ** multiPos)
	
	return 0

def humanize (num):
	i    = 0
	fNum = num
	while fNum > settings.memMult:
		fNum /= float(settings.memMult)
		i += 1
	
	return str("{0:.1f}".format(fNum)) + settings.memString[i]

def haystack (stack, key, stackSep=',', keySep='='):
	hay  = stack.split(stackSep)
	size = len(hay)
	
	for i in range(size):
		needle = hay[i].split(keySep)
		if needle[0] == key: return needle[1]
	
	return ''
