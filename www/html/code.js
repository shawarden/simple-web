// ENUMs
const REFRESH_RATE = 6000;

const FILE_USER = "userlist.txt";
const FILE_STAT = "slurm_cluster_stats.txt";
const FILE_JOB1 = "slurm_task_tracker_";
const FILE_JOB2 = ".txt";
const FILE_PEND = "slurm_pending_tasks.txt"

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
const JOB_PROCLIST  = 16;

const PROC_PID  = 0;
const PROC_CMD  = 1;
const PROC_PCPU = 2;
const PROC_MEM  = 3;

const SEC_PERSEC  = 1;
const SEC_PERMIN  = 60;
const SEC_PERHOUR = 3600;
const SEC_PERDAY  = 86400;

const SIZE_MULT   = 1024;
const SIZE_STRING = " KMGTPE";

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

const USAGE_USER    = 0;
const USAGE_CPUSEC  = 1;
const USAGE_PERCENT = 2;
const USAGE_ONLINE  = 3;

var hostStats = new Object();
var userUsage = new Object();
var coreYears = new Object();
var userData  = new Object();
var memAlloc  = new Object();
var memUsage  = new Object();

var toSeconds = function(timeString) {
	var dhms  = timeString.split(/-|:/);
	var multi = [SEC_PERSEC,SEC_PERMIN,SEC_PERHOUR,SEC_PERDAY]
	var len   = (dhms.length);
	var secs  = 0
	for (var i=0; i < len; i++) {
		var oldSecs = secs
		secs += multi[i] * dhms[len-i-1]
	}
	return secs;
}

var toDHMS = function(seconds) {
	var days = Math.floor(seconds / SEC_PERDAY);
	var hrs  = Math.floor((seconds % SEC_PERDAY) / SEC_PERHOUR);
	var mins = Math.floor((seconds % SEC_PERHOUR) / SEC_PERMIN);
	var secs = (seconds % SEC_PERMIN);
	
	var output = '';
	output    += (days > 0 ? days + "-" : '');
	output    += (hrs < 10 ? '0' : '')  + hrs  + ":";
	output    += (mins < 10 ? '0' : '') + mins + ":";
	output    += (secs < 10 ? '0' : '') + secs;
	
//	alert(seconds + " : " + output)
	return output;
}

var humanize = function(num, precision=0) {
	var i    = 0;
	var fNum = num;
	while (fNum > SIZE_MULT) {
		fNum /= parseFloat(SIZE_MULT)
		i++
	}
	try { var output = parseFloat(fNum.toFixed(precision)) }
	catch (e) { return num }
	
	return parseFloat(fNum.toFixed(precision)) + (SIZE_STRING[i] != ' ' ? SIZE_STRING[i] : '')
}

var getPage = function(url) {
	var txtFile, lines = [];
	if (window.XMLHttpRequest) {
		// code for IE7+, Firefox, Chrome, Opera, Safari
		txtFile = new XMLHttpRequest();
	} else {
		// code for IE6, IE5
		txtFile = new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	// Get the requested page
	txtFile.open('GET', url, false);
	
	try {txtFile.send();}
	catch(err) {return getPage(url);}	//WHAT ARE YOU DOING???!??!?!?!
	
	return txtFile.responseText.split('\n');
}

var getSource = function(fileName) {
	// Obtain page
	var lines = getPage(fileName);
	var len   = lines.length;
	var data  = new Array();
	
	// Does the data block start as expected?
	if (lines[0].startsWith('START')) {
		for ( var i = 1; i < len; i++) {
			if (lines[i].startsWith('END'))
				// Successful data block,
				// We're done here.
				return data;
			
			// Ignore lines and comments
			if (
				lines[i] == '' ||
				lines[i].startsWith('#') ||
				lines[i].startsWith('//')
			)
				continue;
			
			// Append to array.
			data.push(lines[i]);
		}
	}
	
	// START/END not detected or page is empty.
	return null;
}

var updateUsers = function(oldDataSet) {
	try {var lines = getPage(FILE_USER);}
	catch (err) {return oldDataSet;}
	
	try {var len = lines.length;}
	catch (e) {return oldDataSet;}
	
	var newDataSet = new Object();
	
	for (var i = 0; i < len; i++) {
		blocks = lines[i].split(":");
		if (blocks.length == 5) {	// Contains data
			newDataSet[blocks[USER_ID].toLowerCase()] = {
				'name'  : blocks[USER_NAME],
				'email' : blocks[USER_EMAIL],
				'alt'   : blocks[USER_ALT],
				'share' : blocks[USER_SHARE]
			};
		}
	}
	
	return newDataSet;
}

var updateCluster = function(oldDataSet) {
	try {var lines = getSource(FILE_STAT);}
	catch (err) {return;}
	
	try {var len = lines.length;}
	catch (err) {return;}
	
	for (var i = 0; i < len; i++) {
		var line  = lines[i].split('=');
		var chunk = line[HOST_BLOCK];
		var data  = line[HOST_DATA].split(',');
		
		// What lines are we getting here?
		switch (chunk) {
			case 'HOST':	// Host properties
				hostStats[data[HOST_NAME]] = {
					'memmax'   : parseInt(data[HOST_MEMMAX]),
					'cpualloc' : parseInt(data[HOST_CPUALLOC]),
					'cpuidle'  : parseInt(data[HOST_CPUIDLE]),
					'cpumax'   : parseInt(data[HOST_CPUMAX]),
					'memalloc' : 0,
					'memusage' : 0,
					'cpupeak'  : 0,
					'cpuusage' : 0
				};
				break;
			case 'CORE':	// Core usage
				coreYears[data[CORE_FRAME]] = {
					'avail' : parseFloat(data[CORE_AVAIL]),
					'used'  : parseFloat(data[CORE_USED])
				};
				break;
			case 'USER':	// User usage
				userUsage[data[USAGE_USER]] = {
					'cpusec'  :   parseInt(data[USAGE_CPUSEC]),
					'percent' : parseFloat(data[USAGE_PERCENT]),
					'online'  :   parseInt(data[USAGE_ONLINE]),
					'running' : false
				};
				break;
			default:
				// Well, this is awkward.
		}
	}
}

// Retrieve job data set from a file.
var getJobSetFromFile = function(fileName) {
	var newDataSet = new Object();
	
	try {var lines = getSource(fileName);}
	catch (err) {return newDataSet;}
	
	try {var len = lines.length;}
	catch (err) {return null;}
	
	if (len > 0) {	// Why do I need this? 
		for (var i = 0; i < len; i++) {
			var line = lines[i].split(',');
			// Fill job data object
			
			// Build process list
			var procSet  = new Object();
			if (line.length == (JOB_PROCLIST+1)) {
				var procList = line[JOB_PROCLIST].split('|');
				var procCnt  = procList.length;
				
				for (var j = 0; j < procCnt; j++) {
					var procData = procList[j].split(':');
					procSet[procData[PROC_PID]] = {
						'cmd'  : procData[PROC_CMD],
						'pcpu' : parseFloat(procData[PROC_PCPU]),
						'memu' : parseInt(procData[PROC_MEM])
					};
				}
			}
			
			newDataSet[line[JOB_ID]] = {
				'user'      : line[JOB_USER].toLowerCase(),
				'account'   : line[JOB_ACCOUNT],
				'array'     : line[JOB_ARRAY].replace(/@@/g, ','),
				'runtime'   : parseInt(line[JOB_ELAPSED]),
				'maxtime'   : parseInt(line[JOB_TIMELIMIT]),
				'state'     : line[JOB_STATE],
				'partition' : line[JOB_PARTITION],
				'cpualloc'  : parseInt(line[JOB_CPUALLOC]),
				'memalloc'  : parseInt(line[JOB_MEMALLOC]),
				'hostname'  : line[JOB_HOSTLIST].replace(/@@/g, ','),
				'jobname'   : line[JOB_JOBNAME].replace(/@@/g, ','),
				'cpuusage'  : line[JOB_CPUUSAGE] != null ? parseFloat(line[JOB_CPUUSAGE]) : 0,
				'cpupeak'   : line[JOB_CPUPEAK]  != null ? parseFloat(line[JOB_CPUPEAK]) : 0,
				'memusage'  : line[JOB_MEMUSAGE] != null ?   parseInt(line[JOB_MEMUSAGE]) : 0,
				'mempeak'   : line[JOB_MEMPEAK]  != null ?   parseInt(line[JOB_MEMPEAK]) : 0,
				'proclist'  : procSet
			};
			
			var host = newDataSet[line[JOB_ID]].hostname
			var user = newDataSet[line[JOB_ID]].user
			
			if (host in hostStats) {	// Pending jobs bump into me!
				hostStats[host].memalloc +=   parseInt(newDataSet[line[JOB_ID]].memalloc);
				hostStats[host].memusage +=   parseInt(newDataSet[line[JOB_ID]].memusage);
				hostStats[host].cpupeak  += parseFloat(newDataSet[line[JOB_ID]].cpupeak);
				hostStats[host].cpuusage += parseFloat(newDataSet[line[JOB_ID]].cpuusage);
			}
			
			if (user in userData) {
				userData[user].running = true;
			} else {
				alert(user + " is not in userData{}.")
			}
		}
	}
	return newDataSet;
}

var printJobs = function(dataSet, bRun=true) {
	var output = ''
	for (var jobid in dataSet) {
		var thisSet = dataSet[jobid];
		var line   = "<tr class=>";
		
		line     += "<td title='";
		line     += (thisSet.user in userData ? userData[thisSet.user].name : "Unknown");
		line     += "'>&nbsp;" + thisSet.user.replace('student+','') + "&nbsp;</td>";
		
		line     += "<td title='" + jobid + "'>&nbsp;" + thisSet.array + "&nbsp;</td>";
		
		line     += "<td style='text-align:right;'>";
		
		if (bRun) {
			var runPercent  = Math.round((thisSet.runtime / thisSet.maxtime) * 100)
			
			line += "<div class='perc' style='background-size: " + runPercent + "% 100%'/>";
			line += "<div title='" + runPercent + "% of " + toDHMS(thisSet.maxtime) + "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td style='text-align:right;' class='inner'>&nbsp;";
			line += toDHMS(thisSet.runtime);
			line += "&nbsp;</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		} else {
			line += "&nbsp;" + toDHMS(thisSet.maxtime) + "&nbsp;";
		}
		
		line     += "</td>";
		
		line     += "<td>&nbsp;" + thisSet.state + "&nbsp;</td>";
		
		line     += "<td>";
		
		if (bRun) {
			var cpuPeakPerc = Math.round((thisSet.cpupeak  / thisSet.cpualloc) * 100)
			var cpuUsePerc  = Math.round((thisSet.cpuusage / thisSet.cpualloc) * 100)
			
			line += "<div class='peak' style='background-size: "+ cpuPeakPerc + "% 100%'/>";
			line += "<div class='perc' style='background-size: "+ cpuUsePerc  + "% 100%'/>";
			line += "<div ";
/*			if (parseFloat(thisSet.cpupeak) < (parseFloat(thisSet.memalloc) / parseFloat(8.0))) {
				line += "style='color:rgba(255, 64, 64, 1);' ";
			} else if (parseFloat(thisSet.cpupeak) < (parseFloat(thisSet.memalloc) / parseFloat(4.0))) {
				line += "style='color:rgba(255, 128, 64, 1);' ";
			} else if (parseFloat(thisSet.cpupeak) < (parseFloat(thisSet.memalloc) / parseFloat(2.0))) {
				line += "style='color:rgba(255, 128, 128, 1);' ";
			}
*/			line += "title='";
			line += "Requ: " + thisSet.cpualloc + "\n";
			line += "Curr: " + thisSet.cpuusage + "\n";
			line += "Peak: " + thisSet.cpupeak + "\n";
			line += "PID CMD CPU MEM\n";
			for (var pid in thisSet.proclist) {
				curProc = thisSet.proclist[pid];
				line += pid + " " + curProc.cmd + " " + curProc.pcpu + " " + humanize(curProc.memu) + "B\n";
			}
			line += "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td class='inner'>&nbsp;";
			line += parseFloat(thisSet.cpupeak.toFixed(2)) + "/";
		} else {
			line += "&nbsp;";
		}
		
		line     += thisSet.cpualloc + "&nbsp;";
		
		if (bRun) {
			line += "</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		}
		
		line     += "</td>";
		
		line     += "<td>";
		
		if (bRun) {
			var memPeakPerc = Math.round((thisSet.mempeak  / thisSet.memalloc) * 100)
			var memUsePerc  = Math.round((thisSet.memusage / thisSet.memalloc) * 100)
			
			line += "<div class='peak' style='background-size: " + memPeakPerc + "% 100%'/>";
			line += "<div class='perc' style='background-size: " + memUsePerc  + "% 100%'/>";
			line += "<div ";
			if (parseFloat(thisSet.mempeak) > parseFloat(thisSet.memalloc)) {
				line += "style='color:rgba(255, 96, 96, 1);' ";
			}
			line += "title='";
			line += "Requ " + humanize(thisSet.memalloc,2) + "\n";
			line += "Curr " + humanize(thisSet.memusage,2) + " (" + memUsePerc + "%)\n"; 
			line += "Peak " + humanize(thisSet.mempeak,2) + " (" + memPeakPerc + "%)";
			line += "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td class='inner'>&nbsp;";
			line += humanize(thisSet.mempeak) + "/";
		} else {
			line += "&nbsp;";
		}
		
		line     += humanize(thisSet.memalloc) + "&nbsp;";
		
		if (bRun) {
			line += "</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		}
		line     += "</td>";
		line     += "<td>&nbsp;" + thisSet.hostname + "&nbsp;</td>";
		line     += "<td>&nbsp;" + thisSet.jobname + "&nbsp;</td>";
		line     += "</tr>";
		
		output = output + line;
	}
	return output;
}

var updateData = function() {
	userData = updateUsers(userData);
	
	updateCluster();
	
	var jobSet      = new Object();	// jobid, user, account, etc
	for (host in hostStats) {
		jobSet = {...jobSet, ...getJobSetFromFile(FILE_JOB1 + host + FILE_JOB2)};
	}
	
	var pendSet = getJobSetFromFile(FILE_PEND);
	
	document.getElementById('jobData').innerHTML = "<tr>\
<th>User</th>\
<th>Job ID</th>\
<th style='min-width:100px'>Runtime</th>\
<th>State</th>\
<th style='min-width:100px'>Peak CPU</th>\
<th style='min-width:100px'>Peak RAM</th>\
<th>Node</th>\
<th width='100%'>Job Name</th>\
</tr>" + printJobs(jobSet) + printJobs(pendSet, false);
	
	var outML  = "<tr><th>Utilization<th></tr>";
	var spans = [ "Lifetime","Yearly","Monthly","Weekly" ];
	
	for (var i = 0; i < spans.length; i++) {
		var curSpan = coreYears[spans[i]];
		var curPerc = Math.round((curSpan.used / curSpan.avail) * 100)
		var cyAvail = parseFloat(parseFloat(curSpan.avail).toFixed(1))
		var cyUsed  = parseFloat(parseFloat(curSpan.used).toFixed(1))
		
		outML += "<tr>";
		outML += "<td title='" + cyUsed + " of " + cyAvail + " CPU Years'>";
		outML += "<div class='perc' style='background-size: "+ curPerc + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'>";
		outML += "<tr>";
		outML += "<td class='inner'>&nbsp;";
		outML += spans[i];
		outML +=  "&nbsp;</td>";
		outML += "<td class='inner' style='text-align:right'>&nbsp;";
		outML += curPerc;
		outML += "%&nbsp;</td>";
		outML += "<tr>";
		outML += "</table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
		
	}
	outML += "<tr><th>&nbsp;</th></tr>";
	
	outML += "<tr><th>Cores<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.cpuusage / curHost.cpumax) * 100)
		var curLock = Math.round((curHost.cpualloc / curHost.cpumax) * 100)
		
		outML += "<tr>";
		outML += "<td title='";
		outML += "Allocated: " + curHost.cpualloc + " (" + curLock + "%)\n";
		outML += "Utilized: " + parseFloat(curHost.cpuusage.toFixed(2)) + " (" + curUsed + "%)'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'>";
		outML += "<tr>";
		outML += "<td class='inner'>&nbsp;";
		outML += curHost.cpualloc + "/" + curHost.cpumax;
		outML += "&nbsp;</td>";
		outML += "</tr>";
		outML += "</table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
	}
	outML += "<tr><th>&nbsp;</th></tr>";
	
	outML += "<tr><th>Memory<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.memusage / curHost.memmax) * 100)
		var curLock = Math.round((curHost.memalloc / curHost.memmax) * 100)
		
		outML += "<tr>";
		outML += "<td title='";
		outML += "Allocated: " + humanize(curHost.memalloc,2) + " (" + curLock + "%)\n";
		outML += "Utilized: " + humanize(curHost.memusage,2) + " (" + curUsed + "%)'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'>";
		outML += "<tr>";
		outML += "<td class='inner'>&nbsp;";
		outML += humanize(curHost.memalloc) + "/" + humanize(curHost.memmax);
		outML += "&nbsp;</td>";
		outML += "<tr>";
		outML += "</table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
	}
	outML += "<tr><th>&nbsp;</th></tr>";
	
	outML += "<tr><th>Users Online<th></tr>";
	for (var user in userUsage) {
		if (user.toLowerCase() in userData) {
			var curUser  = userUsage[user];
			var cpuPerc  = Math.round(curUser.percent)
			
			if (curUser.online == 1) {
				outML += "<tr>";
				outML += "<td title='" + userData[user].name + ": " + toDHMS(curUser.cpusec) + " CPU time'>";
				outML += "<div class='perc' style='background-size: " + cpuPerc + "% 100%'/>";
				outML += "<div>";
				outML += "<table width='100%' class='inner'>";
				outML += "<tr>";
				outML += "<td class='inner'>&nbsp;";
				outML += user.replace('student+','');
				outML += "&nbsp;</td>";
				outML += "<td class='inner' style='text-align:right'>&nbsp;";
				outML += cpuPerc;
				outML += "%&nbsp;</td>";
				outML += "<tr>";
				outML += "</table>";
				outML += "</div>";
				outML += "</td>";
				outML += "</tr>";
			}
		}
	}
	outML += "<tr><th>&nbsp;</th></tr>";
	
	document.getElementById('stats').innerHTML = outML
	
}

window.onload = setInterval(updateData, REFRESH_RATE)