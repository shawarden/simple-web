#!/usr/bin/env python

# Local path to repository.
pathSource       = "/resource/apps/simple-web"

def filePeak (data):
	return "/dev/shm/slurm_task_tracker_" + data + ".txt"

fileCluster      = "/dev/shm/slurm_cluster_stats.txt"
filePending      = "/dev/shm/slurm_pending_tasks.txt"
fileUserMap      = "/etc/slurm/userlist.txt"

clusterPartition = "funder"
clusterLive      = {
	'year'  : 2017,
	'month' : 01,
	'day'   : 01
}

memMult   = int(1024)
memString = " KMGTPEZ";

# per-host job string item positions. 
jobLine = {
	'jobID'		: 0,
	'user'		: 1,
	'account'	: 2,
	'jobArray'	: 3,
	'elapsed'	: 4,
	'timeLimit'	: 5,
	'state'		: 6,
	'partition'	: 7,
	'cpuAlloc'	: 8,
	'memAlloc'	: 9,
	'hostList'	: 10,
	'jobName'	: 11,
	'cpuUsage'	: 12,
	'cpuPeak'	: 13,
	'memUsage'	: 14,
	'memPeak'	: 15,
	'hostName'	: 16,
	'procList'	: 17,
	'diskUse'	: 18
}

userLine = {
	'user'	: 0,
	'name'	: 1,
	'email'	: 2,
	'alt'	: 3,
	'shares': 4
}