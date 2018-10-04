#!/usr/bin/env python

pathSource       = "/resource/apps/simple-web"

def filePeak (data):
	return "/dev/shm/slurm_task_tracker_" + data + ".txt"

fileCluster      = "/dev/shm/slurm_cluster_stats.txt"
filePending      = "/dev/shm/slurm_pending_tasks.txt"

clusterPartition = "funder"
clusterLive      = {
	'year'  : 2017,
	'month' : 1,
	'day'   : 1
}

memMult          = int(1024)

jobLine = {
	'jobid'		: 0,
	'user'		: 1,
	'account'	: 2,
	'jobarray'	: 3,
	'elapsed'	: 4,
	'timelimit'	: 5,
	'state'		: 6,
	'partition'	: 7,
	'cpualloc'	: 8,
	'memalloc'	: 9,
	'hostlist'	: 10,
	'jobname'	: 11,
	'cpuusage'	: 12,
	'cpupeak'	: 13,
	'memusage'	: 14,
	'mempeak'	: 15,
	'proclist'	: 16
}
