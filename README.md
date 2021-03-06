# About

![Image](https://raw.githubusercontent.com/shawarden/simple-web/master/Example.png)

- Simple website to monitor small SLURM cluster.
- Contains head node and work node scripts that query slurm and the system to obtain usage statistics.
- bin/slurm_task_tracker.py runs on each working node. Collects locally running jobids and system ps output. Outputs to /dev/shm/slurm_task_trackes_$(hostname -s).txt containing "raw JobID,username,account,job array id,elapsed seconds,time limit seconds,partition,cores allocated,ram allocated in bytes,hostname,jobname,current pcpu,peak pcpu,current rss in bytes,peak rss in bytes,resource tree of children pid,pcpu,cmd,ram".
- bin/slurm_pending_tasks.py runs on head node. Collects list of PENDING jobs. Stores in /dev/shm/slurm_pending_tasks.txt containing "raw JobID,username,account,job array id,elapsed seconds,time limit seconds,partition,cores allocated,ram allocated in bytes,hostname,jobname" only.
- bin/slurm_cluster_stats.py collects sinfo and sreport data for cluster-wide state. Stores in /dev/shm/slurm_cluster_stats.txt containing core-years data, node list, per-user usage stats.
- bin/slurm_report_usage_from.sh runs 'sreport -nP cluster AccountUtilizationByUser' from a set date and returns overall usage.
- bin/slurm_report_usagepercent_from.sh runs ''

# Requirements

- SLURM 17.2+ (squeue, sinfo, sreport)
- Python 2.7.13+ (os, datetime)

# Optional

- Sufficent access to query $TMPDIR and $SCRATCH_DIR directory sizes.

# Changelog

## 2020-06-17

### Fixed

- reading empty lines from historical data track

## 2019-02-27

### Added

- CPU OverCommit handling.
- Rolling history code -- Not displayed yet
- Process usage error handling.

### Fixed

- Process usage error

### Removed

- Condensed process names
- Memory-Over kill email.

### Changed

- System username is now User's Firstname, First letter of last name.
- User usage now broken into CPU years, weeks, days, housr, minutes.
- All users displayed. Online are marked.
- Current percentage now partially transparrent to visualize over-usage.

## 2018-12-10

### Changed

- Minor Formatting

### Removed

- SHM_DIR, TMP_DIR as separate disk usage areas. They are now the same.

### Fixed

- Commas Separated values need to remove commas from data

## 2018-10-15

### Fixed

- Shared memory usage adds to memory usage.

### Added

- 1:10 chance to cancels any job that exceeds memory allocation.
- Email alert when job terminates due to exceeding memory allocation.

## 2018-10-10

### Added

- Query $SHM_DIR, $TMP_DIR and $SCRATCH_DIR disk space reporting.
- Display column for Disk usage. Doesn't include non-slurm areas.

## 2018-10-08

### Changed

- LDAP resolve error halting updates with alert to printing error log.

### Removed

- numfmt requirement.

### Added

- Error logging
- Comments, glorious comments.

## 2018-10-05

### Added

- Settings and config files.

### Removed

- System call for hostname

## 2018-10-03

### Added

- Readme
- CPU time in seconds to per-user listing.
- Parent-Child process map & return without additional system call.

### Removed

- $SHM_DIR query from slurm_task_tracker.py as slurm doesn't care yet. CGROUPS required?
- pstree shell command requirement.

### Changed

- Moved common functions to separate file.

### Fixed

- CSS div alignment issues.

# Todo

- Combine slurm_report_usage_from and slurm_report_usagepercent_from into single sreport call.
- Adaptable Layout for larger clusters, multiple QoS and multiple clusters.
- Mobile friendly layout.
