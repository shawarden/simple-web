#!/usr/bin/env python

import os,settings
import datetime as DT

now = DT.datetime.now()
startDT = (DT.date(settings.clusterLive['year'],settings.clusterLive['month'],settings.clusterLive['day'])).strftime("%Y-%m-%dT%H:%M:%S")
yearAgo = (now - DT.timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S")
mnthAgo = (now - DT.timedelta(days=28)).strftime("%Y-%m-%dT%H:%M:%S")
weekAgo = (now - DT.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")

#######
# This stuff can be slow, leading to long write times.
#######

cyfStart = os.popen(settings.pathSource + "/bin/slurm_report_years_from.sh " + startDT).read().split('\n')[0]
cyfYear  = os.popen(settings.pathSource + "/bin/slurm_report_years_from.sh " + yearAgo).read().split('\n')[0]
cyfMonth = os.popen(settings.pathSource + "/bin/slurm_report_years_from.sh " + mnthAgo).read().split('\n')[0]
cyfWeek  = os.popen(settings.pathSource + "/bin/slurm_report_years_from.sh " + weekAgo).read().split('\n')[0]

cufStart = os.popen(settings.pathSource + "/bin/slurm_report_usage_from.sh " + startDT).read().split('\n')[0]
cufYear  = os.popen(settings.pathSource + "/bin/slurm_report_usage_from.sh " + yearAgo).read().split('\n')[0]
cufMonth = os.popen(settings.pathSource + "/bin/slurm_report_usage_from.sh " + mnthAgo).read().split('\n')[0]
cufWeek  = os.popen(settings.pathSource + "/bin/slurm_report_usage_from.sh " + weekAgo).read().split('\n')[0]

# Get per-host information
# Hostname, physical mem, core allocations
hostDict = {}
for line in os.popen("""sinfo -h -p """ + settings.clusterPartition + """ --Node -o %n,%m,%C""").read().split('\n'):
	# last line is empty...
	if line == '': continue
	
	(hostname, memAvail, cpuData) = line.split(',')
	(cpuAlloc, cpuIdle, cpuOther, cpuTotal) = cpuData.split('/')
	cpuTotal = str(int(cpuTotal) - int(cpuOther))
	
	if settings.clusterOverCommit:
		cpuTotal = str(4 * int(cpuTotal))
		cpuIdle  = str(int(cpuTotal) - int(cpuAlloc))

	

	# Convert memory allocation from MB do B.
	hostDict[hostname] = str(int(memAvail) * settings.memMult * settings.memMult) + "," + cpuAlloc + "," + cpuIdle + "," + cpuTotal

# Get per user usage.
# username, cpu usage in seconds, overall percent usage compared to everyone else, if they are online.
userList = []
for line in os.popen(settings.pathSource + "/bin/slurm_report_usagepercent_from.sh " + startDT).read().split('\n'):
	# last line is empty...
	if line == '': continue
	
	(user, cpusec, perc, active, home, homeperc, scratch, scratchperc) = line.split(",")
	userList.append(user + "," + cpusec + "," + perc + "," + active + "," + home + "," + homeperc + "," + scratch + "," + scratchperc)

#####
# Dumping data is pretty quick.
#####

dataStore = open(settings.fileCluster, "w")
dataStore.write("START\n")

dataStore.write("CORE=Lifetime," + cyfStart + "," + cufStart + "\n")
dataStore.write("CORE=Yearly,"   + cyfYear  + "," + cufYear  + "\n")
dataStore.write("CORE=Monthly,"  + cyfMonth + "," + cufMonth + "\n")
dataStore.write("CORE=Weekly,"   + cyfWeek  + "," + cufWeek  + "\n")

for host in sorted(hostDict):
	dataStore.write("HOST=" + host + "," + hostDict[host] + "\n")

for i in range(len(userList)):
	dataStore.write("USER=" + userList[i] + "\n")

dataStore.write("END\n")
dataStore.close()
