#!/usr/bin/env python

import os
import datetime as DT

dataFile  = "/dev/shm/slurm_cluster_stats.txt"

# File to track peak datasets
now = DT.datetime.now()
startDT = (DT.date(2017,1,1)).strftime("%Y-%m-%dT%H:%M:%S")
yearAgo = (now - DT.timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S")
mnthAgo = (now - DT.timedelta(days=28)).strftime("%Y-%m-%dT%H:%M:%S")
weekAgo = (now - DT.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")

# This is the slow stuff... 
cyfStart = os.popen("/resource/apps/simple-web/bin/slurm_report_years_from.sh " + startDT).read().split('\n')[0]
cyfYear  = os.popen("/resource/apps/simple-web/bin/slurm_report_years_from.sh " + yearAgo).read().split('\n')[0]
cyfMonth = os.popen("/resource/apps/simple-web/bin/slurm_report_years_from.sh " + mnthAgo).read().split('\n')[0]
cyfWeek  = os.popen("/resource/apps/simple-web/bin/slurm_report_years_from.sh " + weekAgo).read().split('\n')[0]

cufStart = os.popen("/resource/apps/simple-web/bin/slurm_report_usage_from.sh " + startDT).read().split('\n')[0]
cufYear  = os.popen("/resource/apps/simple-web/bin/slurm_report_usage_from.sh " + yearAgo).read().split('\n')[0]
cufMonth = os.popen("/resource/apps/simple-web/bin/slurm_report_usage_from.sh " + mnthAgo).read().split('\n')[0]
cufWeek  = os.popen("/resource/apps/simple-web/bin/slurm_report_usage_from.sh " + weekAgo).read().split('\n')[0]

# On to the fast stuff...

dataStore = open(dataFile, "w")
dataStore.write("START\n")

dataStore.write("CORE=Lifetime," + cyfStart + "," + cufStart + "\n")
dataStore.write("CORE=Yearly,"   + cyfYear  + "," + cufYear  + "\n")
dataStore.write("CORE=Monthly,"  + cyfMonth + "," + cufMonth + "\n")
dataStore.write("CORE=Weekly,"   + cyfWeek  + "," + cufWeek  + "\n")

for line in os.popen("""sinfo -h -p funder --Node -o %n,%m,%C""").read().split('\n'):
	if line == '': continue
	
	blocks = line.split(',')
	(hostname, memAvail, cpuData) = line.split(',')
	(cpuAlloc, cpuIdle, cpuOther, cpuTotal) = cpuData.split('/')
	dataStore.write("HOST=" + hostname + "," + str(int(memAvail) * 1024 * 1024) + "," + cpuAlloc + "," + cpuIdle + "," + cpuTotal + "\n")
	
for line in os.popen("/resource/apps/simple-web/bin/slurm_report_usagepercent_from.sh " + startDT).read().split('\n'):
	if line == '': continue
	
	(user, perc, active) = line.split()
	dataStore.write("USER=" + user + "," + perc + "," + active + "\n")

dataStore.write("END\n")
dataStore.close()