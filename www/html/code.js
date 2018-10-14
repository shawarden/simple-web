var hostStats = new Object();
var userUsage = new Object();
var coreYears = new Object();
var userData  = new Object();
var memAlloc  = new Object();
var memUsage  = new Object();

// Log output to error dump.
var errLog = function(string) {
	var d = new Date().toUTCString();
	document.getElementById('logData').innerHTML += "<tr><td style='border:0px;'>" + d + ": " + string + "</td></tr>\n";
}

// Convert string [D-HH:MM:SS]
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

// Convert seconds to D-HH:MM:SS
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
	
	return output;
}

// Convert number to short human readable abreviation.
var humanize = function(num, precision=0) {
	var i    = 0;
	var fNum = num;
	while (fNum > SIZE_MULT) {
		fNum /= parseFloat(SIZE_MULT)
		i++
	}
	try { var output = parseFloat(fNum.toFixed(precision)) }
	catch (err) {
		errLog("Failed to humanize '" + num);
		return num;
	};
	
	return parseFloat(fNum.toFixed(precision)) + (SIZE_STRING[i] != ' ' ? ' ' + SIZE_STRING[i] : '')
}

// Retrieve page.
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
	catch(err) {
		errLog("Failed to load '" + url);
		return getPage(url);	//WHAT ARE YOU DOING???!??!?!?!
	}
	
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
	catch (err) {
		errLog("Failed to load '" + FILE_USER);
		return oldDataSet;
	}
	
	try {var len = lines.length;}
	catch (err) {
		errLog("Failed to parse '" + FILE_USER);
		return oldDataSet;
	}
	
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
	catch (err) {
		errLog("Failed to load '" + FILE_STAT);
		return;
	}
	
	try {var len = lines.length;}
	catch (err) {
		errLog("Failed to parse '" + FILE_STAT);
		return;
	}
	
	for (var i = 0; i < len; i++) {
		var line  = lines[i].split('=');
		var chunk = line[HOST_BLOCK];
		var data  = line[HOST_DATA].split(',');
		
		// What lines are we getting here?
		switch (chunk) {
			case 'HOST':	// Host properties
				hostStats[data[HOST_NAME]] = {
					'memMax'   : parseInt(data[HOST_MEMMAX]),
					'cpuAlloc' : parseInt(data[HOST_CPUALLOC]),
					'cpuIdle'  : parseInt(data[HOST_CPUIDLE]),
					'cpuMax'   : parseInt(data[HOST_CPUMAX]),
					'memAlloc' : 0,
					'memUsage' : 0,
					'cpuPeak'  : 0,
					'cpuUsage' : 0
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
					'cpuSec'  :   parseInt(data[USAGE_CPUSEC]),
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
	catch (err) {
		errLog("Failed to load '" + fileName);
		return newDataSet;
	}
	
	try {var len = lines.length;}
	catch (err) {
		errLog("Failed to parse '" + fileName);
		return null;
	}
	
	if (len > 0) {	// Why do I need this? 
		for (var i = 0; i < len; i++) {
			var line = lines[i].split(',');
			// Fill job data object
			
			// Build process list
			var procSet  = new Object();
			if (line.length > JOB_PROCLIST) {
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
				'elapsed'   : parseInt(line[JOB_ELAPSED]),
				'timeLimit' : parseInt(line[JOB_TIMELIMIT]),
				'state'     : line[JOB_STATE],
				'partition' : line[JOB_PARTITION],
				'cpuAlloc'  : parseInt(line[JOB_CPUALLOC]),
				'memAlloc'  : parseInt(line[JOB_MEMALLOC]),
				'hostList'  : line[JOB_HOSTLIST].replace(/@@/g, ','),
				'jobName'   : line[JOB_JOBNAME].replace(/@@/g, ','),
				'cpuUsage'  : line[JOB_CPUUSAGE] != null ? parseFloat(line[JOB_CPUUSAGE]) : 0,
				'cpuPeak'   : line[JOB_CPUPEAK]  != null ? parseFloat(line[JOB_CPUPEAK]) : 0,
				'memUsage'  : line[JOB_MEMUSAGE] != null ?   parseInt(line[JOB_MEMUSAGE]) : 0,
				'memPeak'   : line[JOB_MEMPEAK]  != null ?   parseInt(line[JOB_MEMPEAK]) : 0,
				'hostName'  : line[JOB_HOSTNAME] != null ? line[JOB_HOSTNAME] : '',
				'procList'  : procSet,
				'diskUse'   : line[JOB_DISKUSE] != null ? line[JOB_DISKUSE] : '',
			};
			
			var host = newDataSet[line[JOB_ID]].hostName;
			
			if (host in hostStats) {	// Pending jobs bump into me!
				hostStats[host].memAlloc +=   parseInt(newDataSet[line[JOB_ID]].memAlloc);
				hostStats[host].memUsage +=   parseInt(newDataSet[line[JOB_ID]].memUsage);
				hostStats[host].cpuPeak  += parseFloat(newDataSet[line[JOB_ID]].cpuPeak);
				hostStats[host].cpuUsage += parseFloat(newDataSet[line[JOB_ID]].cpuUsage);
			}
			
			var user = newDataSet[line[JOB_ID]].user;
			
			if (user in userData) {
				userData[user].running = true;
			} else {
				document.getElementById('logData').innerHTML += user + " is not in userData{}. Please check " + host + " ldap resolver.<br>";
			}
		}
	}
	return newDataSet;
}

var printJobs = function(dataSet, bRun=true) {
	var output = '';
	for (var jobid in dataSet) {
		var thisSet = dataSet[jobid];
		var line   = "<tr class=>";
		
		line     += "<td title='";
		line     += (thisSet.user in userData ? userData[thisSet.user].name : "Unknown");
		line     += "'>&nbsp;" + thisSet.user.replace('student+','') + "&nbsp;</td>";
		
		line     += "<td title='" + jobid + "'>&nbsp;" + thisSet.array + "&nbsp;</td>";
		
		line     += "<td style='text-align:right;'>";
		
		if (bRun) {
			var runPercent  = Math.round((thisSet.elapsed / thisSet.timeLimit) * 100)
			
			line += "<div class='perc' style='background-size: " + runPercent + "% 100%'/>";
			line += "<div title='" + runPercent + "% of " + toDHMS(thisSet.timeLimit) + "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td style='text-align:right;' class='inner'>&nbsp;";
			line += toDHMS(thisSet.elapsed);
			line += "&nbsp;</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		} else {
			line += "&nbsp;" + toDHMS(thisSet.timeLimit) + "&nbsp;";
		}
		
		line     += "</td>";
		
		line     += "<td>&nbsp;" + thisSet.state + "&nbsp;</td>";
		
		line     += "<td>";
		
		if (bRun) {
			var cpuPeakPerc  = Math.round((thisSet.cpuPeak  / thisSet.cpuAlloc) * 100);
			var cpuUsePerc   = Math.round((thisSet.cpuUsage / thisSet.cpuAlloc) * 100);
			var lowThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(8.0);
			var midThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(4.0);
			var norThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(2.0);
			
			line += "<div class='peak' style='background-size: "+ cpuPeakPerc + "% 100%'/>";
			line += "<div class='perc' style='background-size: "+ cpuUsePerc  + "% 100%'/>";
			line += "<div ";
			line += " title='";
			line += "Requ: " + thisSet.cpuAlloc + "\n";
			line += "Curr: " + thisSet.cpuUsage + "\n";
			line += "Peak: " + thisSet.cpuPeak + "\n";
			line += "CMD CPU\n";
			for (var pid in thisSet.procList) {
				curProc = thisSet.procList[pid];
				if (curProc.cmd != "RAM") line += curProc.cmd + " " + curProc.pcpu + "\n";
			}
			line += "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td ";
			if (thisSet.cpuPeak < lowThreshold) {
				line += "style='color:rgba(255, 64, 64, 1);' ";
				//errLog(thisSet.cpuPeak + "<" + lowThreshold);
			} else if (thisSet.cpuPeak < midThreshold) {
				line += "style='color:rgba(255, 128, 64, 1);' ";
				//errLog(thisSet.cpuPeak + "<" + midThreshold);
			} else if (thisSet.cpuPeak < norThreshold) {
				line += "style='color:rgba(255, 128, 128, 1);' ";
				//errLog(thisSet.cpuPeak + "<" + norThreshold);
			}
			line += " class='inner'>&nbsp;";
			line += parseFloat(thisSet.cpuPeak.toFixed(2)) + "/";
		} else {
			line += "&nbsp;";
		}
		
		line     += thisSet.cpuAlloc + "&nbsp;";
		
		if (bRun) {
			line += "</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		}
		
		line     += "</td>";
		
		line     += "<td>";
		
		if (bRun) {
			var memPeakPerc = Math.round((thisSet.memPeak  / thisSet.memAlloc) * 100)
			var memUsePerc  = Math.round((thisSet.memUsage / thisSet.memAlloc) * 100)
			
			line += "<div class='peak' style='background-size: " + memPeakPerc + "% 100%'/>";
			line += "<div class='perc' style='background-size: " + memUsePerc  + "% 100%'/>";
			line += "<div ";
			line += "title='";
			line += "Requ " + humanize(thisSet.memAlloc,2) + "B\n";
			line += "Curr " + humanize(thisSet.memUsage,2) + "B (" + memUsePerc + "%)\n"; 
			line += "Peak " + humanize(thisSet.memPeak,2) + "B (" + memPeakPerc + "%)\n";
			line += "CMD MEM\n";
			for (var pid in thisSet.procList) {
				curProc = thisSet.procList[pid];
				line += curProc.cmd + " " + humanize(curProc.memu) + "B\n";
			}
			line += "'>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td class='inner' ";
			if (parseInt(thisSet.memPeak) >= parseInt(thisSet.memAlloc) ) {
				line += "style='color:rgba(255, 64, 64, 1);' ";
			} else if (parseInt(thisSet.memPeak) >= (parseFloat(0.95) * parseInt(thisSet.memAlloc)) ) {
				line += "style='color:rgba(255, 128, 64, 1);' ";
			} else if (parseInt(thisSet.memPeak) < (parseFloat(0.1) * parseInt(thisSet.memAlloc)) ) {
				line += "style='color:rgba(255, 128, 128, 1);' ";
			}
			line += ">&nbsp;";
			line += humanize(thisSet.memPeak) + "B/";
		} else {
			line += "&nbsp;";
		}
		
		line     += humanize(thisSet.memAlloc) + "B&nbsp;";
		
		if (bRun) {
			line += "</td>";
			line += "</tr>";
			line += "</table>";
			line += "</div>";
		}
		
		if (bRun) {
			var diskUse = thisSet.diskUse.split(":")
			var ramDisk = parseInt(diskUse[0]);
			var tmpDisk = parseInt(diskUse[1]);
			var scrDisk = parseInt(diskUse[2]);
			var totDisk = (ramDisk + tmpDisk + scrDisk)
			var ramFree = (thisSet.memAlloc - thisSet.memUsage)
			var ramDiff = (thisSet.memAlloc - ramFree)
			line += "<td align='right'";
			if (ramDisk > ramFree) {
				// SHM exceeds memory allocation!
				line += " style='color:red'";
			}
			line += " title='";
			line += "$SHM_DIR: " + humanize(ramDisk) + "B\n";
			line += (ramDisk > ramFree ? "Exceeds remaining allocation of " + humanize(ramFree) + "B by " + humanize(ramDiff) + "B\n" : "");
			line += "$TMP_DIR: " + humanize(tmpDisk) + "B\n";
			line += "$SCRATCH_DIR: " + humanize(scrDisk) + "B";
			line += "'>&nbsp;" + humanize(totDisk) + "B&nbsp;</td>"
		} else {
			line += "<td>";
			line += "</td>";
		}
		
		line     += "</td>";
		line     += "<td>&nbsp;" + thisSet.hostList + "&nbsp;</td>";
		line     += "<td>&nbsp;" + thisSet.jobName.replace(/_/g,' ') + "&nbsp;</td>";
		line     += "</tr>";
		
		output = output + line;
	}
	return output;
}

var updateData = function() {
	// is window focused?
	
	userData = updateUsers(userData);
	
	updateCluster();
	
	var jobSet = new Object();	// jobid, user, account, etc
	for (host in hostStats) {
		var newJobSet = getJobSetFromFile(FILE_JOB1 + host + FILE_JOB2)
		// Abort update if file error.
		if (newJobSet == null) return;
		jobSet = {...jobSet, ...newJobSet};
	}
	
	var pendSet = getJobSetFromFile(FILE_PEND);
	// Abort update if file error.
	if (pendSet == null) return;
	
	document.getElementById('jobData').innerHTML = "<tr>\
<th>User</th>\
<th>Job ID</th>\
<th style='min-width:100px'>Runtime</th>\
<th>State</th>\
<th style='min-width:100px'>Peak CPU</th>\
<th style='min-width:100px'>Peak RAM</th>\
<th>Disk</th>\
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
	
	outML += "<tr><th title='Used/Locked/Free'>Cores<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.cpuUsage / curHost.cpuMax) * 100)
		var curLock = Math.round((curHost.cpuAlloc / curHost.cpuMax) * 100)
		var curFree = parseFloat((curHost.cpuIdle  / curHost.cpuMax) * 100).toFixed(1)
		
		outML += "<tr>";
		outML += "<td title='";
		outML += "Utilized: " + parseFloat(curHost.cpuUsage.toFixed(2)) + " (" + curUsed + "%)";
		outML += "\nAllocated: " + curHost.cpuAlloc + " (" + curLock + "%)";
		outML += "\nFree: " + curHost.cpuIdle + " (" + curFree + "%)";
		outML += "'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'>";
		outML += "<tr>";
//		outML += "<td class='inner'>&nbsp;";
//		outML += parseFloat((curHost.cpuUsage).toFixed(1));
//		outML += "&nbsp;</td>";
//		outML += "<td class='inner' style='text-align:center;'>/</td>";
//		outML += "<td class='inner' style='text-align:center;'>&nbsp;";
//		outML += curHost.cpuAlloc;
//		outML += "&nbsp;</td>";
//		outML += "<td class='inner' style='text-align:center;'>/</td>";
		outML += "<td class='inner' style='text-align:right;'>&nbsp;";
		outML += curHost.cpuIdle;
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
		var memFree = (curHost.memMax - curHost.memAlloc)
		var curUsed = Math.round((curHost.memUsage / curHost.memMax) * 100)
		var curLock = Math.round((curHost.memAlloc / curHost.memMax) * 100)
		var curFree = parseFloat((memFree          / curHost.memMax) * 100).toFixed(1)
		
		outML += "<tr>";
		outML += "<td title='";
		outML += "Allocated: " + humanize(curHost.memAlloc,2) + "B (" + curLock + "%)\n";
		outML += "Utilized: " + humanize(curHost.memUsage,2) + "B (" + curUsed + "%)\n";
		outML += "Free: " + humanize(memFree,2) + "B (" + curFree + "%)'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'>";
		outML += "<tr>";
//		outML += "<td class='inner'>&nbsp;";
//		outML += humanize(curHost.memUsage);
//		outML += "&nbsp;</td>";
//		outML += "<td class='inner' style='text-align:center;'>/</td>";
//		outML += "<td class='inner' style='text-align:center;'>&nbsp;";
//		outML += humanize(curHost.memAlloc);
//		outML += "&nbsp;</td>";
//		outML += "<td class='inner' style='text-align:center;'>/</td>";
		outML += "<td class='inner' style='text-align:right;'>&nbsp;";
		outML += humanize(memFree);
		outML += "B&nbsp;</td>";
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
			var ghostUser = userData[user.toLowerCase()].alt;
			if (ghostUser in userData) continue;
			
			var curUser   = userUsage[user];
			var cpuPerc   = Math.round(curUser.percent)
			
			if (curUser.online == 1) {
				outML += "<tr>";
				outML += "<td title='" + userData[user].name + ": " + toDHMS(curUser.cpuSec) + " CPU time'>";
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

window.onload  = setInterval(updateData, REFRESH_RATE)
window.onfocus = (updateRun = 1)
window.onblur  = (updateRun = 0)