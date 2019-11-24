#!/usr/bin/env python

# Local path to repository.
pathSource       = "/resource/apps/simple-web"

def filePeak (data):
	return "/dev/shm/slurm_task_tracker_" + data + ".txt"

def filePeak2 (data):
	return "/dev/shm/slurm_task_tracker2_" + data + ".txt"

fileCluster  = "/dev/shm/slurm_cluster_stats.txt"
filePending  = "/dev/shm/slurm_pending_tasks.txt"
fileHistory  = "/dev/shm/slurm_historical_tasks.txt"
fileUserMap  = "/etc/slurm/userlist.txt"
fileUserData = "/dev/shm/slurm_userlist.txt"

clusterPartition = "funder"

clusterLive      = {
	'year'  : 2017,
	'month' : 1,
	'day'   : 1
}

clusterOverCommit = False

memMult   = int(1024)
memString = " KMGTPEZ";

# per-host job string item positions. 
queueLine = {
	'jobID'		: 0,
	'user'		: 1,
	'account'	: 2,
	'jobArray'	: 3,
	'elapsed'	: 4,
	'timeLimit'	: 5,
	'state'		: 6,
	'partition'	: 7,
	'tresAlloc'	: 8,
	'hostList'	: 9,
	'jobName'	: 10
}

jobLine = {
	'jobID'		: 0,
	'user'		: 1,
	'account'	: 2,
	'jobArray'	: 3,
	'elapsed'	: 4,
	'timeLimit'	: 5,
	'state'		: 6,
	'partition'	: 7,
	'tresAlloc'	: 8,
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
	'diskUse'	: 18,
	'aveCpu'	: 19,
	'aveMem'	: 20,
	'aveDev'	: 21
}

userLine = {
	'user'	: 0,
	'name'	: 1,
	'email'	: 2,
	'alt'	: 3,
	'shares': 4
}
