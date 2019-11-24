// ENUMs
const REFRESH_RATE = 6000;

const CPU_OVERCOMMIT = false;

const FILE_USER    = "userlist.txt";
const FILE_USER2   = "slurm_userlist.txt";
const FILE_STAT    = "slurm_cluster_stats.txt";
const FILE_JOB1    = "slurm_task_tracker_";
const FILE_JOB2    = ".txt";
const FILE_PEND    = "slurm_pending_tasks.txt";
const FILE_HOME    = "home_usage.txt"
const FILE_SCRATCH = "scratch_usage.txt"

const JOB_ID        = 0;
const JOB_USER      = 1;
const JOB_ACCOUNT   = 2;
const JOB_ARRAY     = 3;
const JOB_ELAPSED   = 4;
const JOB_TIMELIMIT = 5;
const JOB_STATE     = 6;
const JOB_PARTITION = 7;
const JOB_CPUALLOC  = 8;
const JOB_MEMALLOC  = 9;
const JOB_HOSTLIST  = 10;
const JOB_JOBNAME   = 11;
const JOB_CPUUSAGE  = 12;
const JOB_CPUPEAK   = 13;
const JOB_MEMUSAGE  = 14;
const JOB_MEMPEAK   = 15;
const JOB_HOSTNAME  = 16;
const JOB_PROCLIST  = 17;
const JOB_DISKUSE   = 18

const PROC_PID  = 0;
const PROC_CMD  = 1;
const PROC_PCPU = 2;
const PROC_MEM  = 3;

const SEC_PERSEC  = 1;
const SEC_PERMIN  = 60;
const SEC_PERHOUR = 3600;
const SEC_PERDAY  = 86400;

const SIZE_MULT   = 1024;
const SIZE_STRING = " KMGTPEZ";

const USER_ID    = 0;
const USER_NAME  = 1;
const USER_EMAIL = 2;
const USER_ALT   = 3;
const USER_SHARE = 4;

const HOST_BLOCK    = 0;
const HOST_DATA     = 1;

const HOST_NAME     = 0;
const HOST_MEMMAX   = 1;
const HOST_CPUALLOC = 2;
const HOST_CPUIDLE  = 3;
const HOST_CPUMAX   = 4;

const CORE_FRAME = 0;
const CORE_AVAIL = 1;
const CORE_USED  = 2;

const USAGE_USER        = 0;
const USAGE_CPUSEC      = 1;
const USAGE_PERCENT     = 2;
const USAGE_ONLINE      = 3;
const USAGE_HOME        = 4;
const USAGE_HOMEPERC    = 5;
const USAGE_SCRATCH     = 6;
const USAGE_SCRATCHPERC = 7;
