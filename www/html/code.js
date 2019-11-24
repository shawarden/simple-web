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
					'cpuAlloc' : 0,
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
					'cpuSec'      :   parseInt(data[USAGE_CPUSEC]),
					'percent'     : parseFloat(data[USAGE_PERCENT]),
					'online'      :   parseInt(data[USAGE_ONLINE]),
					'homeuse'     :   parseInt(data[USAGE_HOME]),
					'homeperc'    : parseFloat(data[USAGE_HOMEPERC]),
					'scratchuse'  :   parseInt(data[USAGE_SCRATCH]),
					'scratchperc' : parseFloat(data[USAGE_SCRATCHPERC]),
					'running'     : false
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
				hostStats[host].cpuAlloc +=   parseInt(newDataSet[line[JOB_ID]].cpuAlloc)
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

		line     += "<td style='white-space: nowrap;' title='";

		line     += (thisSet.user in userData ? userData[thisSet.user].name : "Unknown");

		userName = (thisSet.user in userData ? userData[thisSet.user].name.split(" ") : "Unknown");

		line     += "'>&nbsp;" + userName[0] + " " + userName[userName.length-1].charAt(0) + "&nbsp;</td>";

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

		//line     += "<td>&nbsp;" + thisSet.state + "&nbsp;</td>";

		line     += "<td>";

		if (bRun) {
			var cpuPeakPerc  = Math.round((thisSet.cpuPeak  / thisSet.cpuAlloc) * 100);
			var cpuUsePerc   = Math.round((thisSet.cpuUsage / thisSet.cpuAlloc) * 100);
			var lowThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(8.0);
			var midThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(4.0);
			var norThreshold = parseFloat(thisSet.cpuAlloc) / parseFloat(2.0);

			line += "<div class='peak' style='background-size: "+ cpuPeakPerc + "% 100%'/>";
			line += "<div class='perc' style='background-size: "+ cpuUsePerc  + "% 100%'/>";
			line += "<div>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td class='inner' ";
			line += "title='";
			line += "Req: " + thisSet.cpuAlloc + "\n";
			line += "Curr: " + thisSet.cpuUsage + "\n";
			line += "Peak: " + thisSet.cpuPeak + "\n";
			line += "PID CMD CPU\n";
			for (var pid in thisSet.procList) {
				curProc = thisSet.procList[pid];
				if (curProc.cmd != "RAM") line += pid + " " + curProc.cmd + " " + curProc.pcpu + "\n";
			}
			line += "' ";
			if (thisSet.cpuPeak < lowThreshold) {
				line += "style='color:red;'";
				//errLog(thisSet.cpuPeak + "<" + lowThreshold);
			} else if (thisSet.cpuPeak < midThreshold) {
				line += "style='color:orange;'";
				//errLog(thisSet.cpuPeak + "<" + midThreshold);
			} else if (thisSet.cpuPeak < norThreshold) {
				line += "style='color:yellow;'";
				//errLog(thisSet.cpuPeak + "<" + norThreshold);
			}
			line += ">&nbsp;";
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

			if (thisSet.memPeak > thisSet.memAlloc) {
				memPeakPercDisplay = Math.round((thisSet.memAlloc / thisSet.memPeak) * 100)
				memUsePercDisplay  = 100
				line += "<div class='perc' style='background-size: " + memUsePercDisplay  + "% 100%'/>";
				line += "<div class='peak' style='background-size: " + memPeakPercDisplay + "% 100%'/>";
			} else {
				memPeakPercDisplay = memPeakPerc
				memUsePercDisplay  = memUsePerc
				line += "<div class='peak' style='background-size: " + memPeakPercDisplay + "% 100%'/>";
				line += "<div class='perc' style='background-size: " + memUsePercDisplay  + "% 100%'/>";
			}

			line += "<div>";
			line += "<table width='100%' class='inner'>";
			line += "<tr>";
			line += "<td class='inner' ";
			line += "title='";
			line += "Req " + humanize(thisSet.memAlloc,2) + "B\n";
			line += "Curr " + humanize(thisSet.memUsage,2) + "B (" + memUsePerc + "%)\n";
			line += "Peak " + humanize(thisSet.memPeak,2) + "B (" + memPeakPerc + "%)\n";
			line += "PID CMD MEM\n";
			for (var pid in thisSet.procList) {
				curProc = thisSet.procList[pid];
				line += pid + " " + curProc.cmd + " " + humanize(curProc.memu) + "B\n";
			}
			line += "' ";
			if (parseInt(thisSet.memPeak) >= parseInt(thisSet.memAlloc) ) {
				line += "style='color:red;'";
			} else if (parseInt(thisSet.memPeak) >= (parseFloat(0.90) * parseInt(thisSet.memAlloc)) ) {
				line += "style='color:orange;'";
			} else if (parseInt(thisSet.memPeak) < (parseFloat(0.1) * parseInt(thisSet.memAlloc)) ) {
				line += "style='color:yellow;'";
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
//			if (ramDisk > ramFree) {
//				// SHM exceeds memory allocation!
//				line += " style='color:red'";
//			}
			line += " title='";
			line += "$TMPDIR: " + humanize(ramDisk) + "B\n";
//			line += (ramDisk > ramFree ? "Exceeds remaining allocation of " + humanize(ramFree) + "B by " + humanize(ramDiff) + "B\n" : "");
			line += "$SCRATCH_DIR: " + humanize(scrDisk) + "B";
			line += "'>&nbsp;" + humanize(totDisk) + "B&nbsp;</td>"
		} else {
			line += "<td>";
			line += "</td>";
		}

		line     += "</td>";
		line     += "<td>&nbsp;" + thisSet.hostList.replace(",","&nbsp;<br>&nbsp;").replace("JobArrayTaskLimit","Array Throttle").replace("QOSMaxJobsPerUserLimit","MaxJob/User").replace("QOSMaxCpuPerUserLimit","MaxCPU/User") + "&nbsp;</td>";
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

//<th>State</th>\

	document.getElementById('jobData').innerHTML = "<tr>\
<th>User</th>\
<th>Job ID</th>\
<th style='min-width:100px'>Runtime</th>\
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

	if (CPU_OVERCOMMIT) {
		outML += "<tr><th title='1 CPU = 4 vCores\nUsed/Locked/Free'>vCores Free<th></tr>";
	} else {
		outML += "<tr><th title='Used/Locked/Free'>Cores Free<th></tr>";
	}
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.cpuUsage / curHost.cpuMax) * 100)
		var curLock = Math.round((curHost.cpuAlloc / curHost.cpuMax) * 100)
		var curIdle = curHost.cpuMax - curHost.cpuAlloc
		var curFree = parseFloat((curIdle  / curHost.cpuMax) * 100).toFixed(1)

//		if (CPU_OVERCOMMIT) {
//			curUsage = parseFloat(curHost.cpuUsage.toFixed(2))*4
//			curUsed  = curUsed * 4
//		} else {
			curUsage = parseFloat(curHost.cpuUsage.toFixed(2))
//		}

		outML += "<tr>";
		outML += "<td onclick='window.open(\"http://" + host + ".otago.ac.nz:19999/shallow.html\",\"" + host + "_netdata\",\"toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1024,height=768\")' title='";
		outML += "Utilized: " + curUsage + " (" + curUsed + "%)";
		outML += "\nAllocated: " + curHost.cpuAlloc + " (" + curLock + "%)";
		outML += "\nFree: " + curIdle + " (" + curFree + "%)";
		if (CPU_OVERCOMMIT) {
			outML += "\nConcurrent Max: " + curHost.cpuMax/4;
		}
		outML += "'>";
		if (CPU_OVERCOMMIT) {
			outML += "<div class='ocmax' style='background-size: 25% 100%'/>";
		}
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
		if ( curHost.cpuMax == 0 ){
			outML += "<td class='inner' style='text-align:center;'>&nbsp;DOWN&nbsp;</td>";
		} else {
			outML += "<td class='inner' style='text-align:right;'>&nbsp;";
			outML += curIdle;
			outML += "&nbsp;</td>";
		}
		outML += "</tr>";
		outML += "</table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
//		outML += "<tr>";
//		outML += "<td>";
//        outML += "<div data-netdata='users.cpu'"
//        outML += "  data-host='" + host + ".otago.ac.nz'"
//        outML += "	data-chart-library='dygraph'"
//        outML += "	data-dygraph-theme='sparkline'"
//        outML += "	data-width='200'"
//        outML += "	data-height='100'"
//        outML += "	data-after='-300'"
//        outML += "	data-dygraph-valuerange='[0, 4000]'/>"
//		outML += "</td>";
//		outML += "</tr>";
	}
	outML += "<tr><th>&nbsp;</th></tr>";

	outML += "<tr><th>Memory Free<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var memFree = (curHost.memMax - (curHost.memAlloc > curHost.memUsage ? curHost.memAlloc : curHost.memUsage))
		var curUsed = Math.round((curHost.memUsage / curHost.memMax) * 100)
		var curLock = Math.round((curHost.memAlloc / curHost.memMax) * 100)
		var curFree = parseFloat((memFree          / curHost.memMax) * 100).toFixed(1)

		outML += "<tr>";
		outML += "<td onclick='window.open(\"http://" + host + ".otago.ac.nz:19999/shallow.html\",\"" + host + "_netdata\",\"toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=1024,height=768\")' title='";
		outML += "Allocated: " + humanize(curHost.memAlloc,2) + "B (" + curLock + "%)";
		outML += "\nUtilized: " + humanize(curHost.memUsage,2) + "B (" + curUsed + "%)";
		outML += "\nFree: " + humanize(memFree,2) + "B (" + curFree + "%)";
		if (curHost.memUsage > curHost.memAlloc) {
			outML += "\n! ! Over Uilized ! !";
		}
		outML += "'>";

		if (curHost.memUsage > curHost.memAlloc) {
			outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
			outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		} else {
			outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
			outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		}

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
		if ( curHost.cpuMax == 0 ){
			outML += "<td class='inner' style='text-align:center;'>&nbsp;DOWN&nbsp;</td>";
		} else {
		outML += "<td class='inner' style='text-align:right;";
			if (curHost.memAlloc < curHost.memUsage) {
				outML += "color:red;";
			}
			outML += "'>&nbsp;";
			outML += humanize(memFree);
			outML += "B&nbsp;</td>";
		}
		outML += "<tr>";
		outML += "</table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
	}
	outML += "<tr><th>&nbsp;</th></tr>";

	outML += "<tr><th title='Red: /scratch space\nGreen: CPU cycles\nBlue: /home space'>Usage CSH<th></tr>";

	for (var user in userUsage) {
		if (user.toLowerCase() in userData) {
			var ghostUser = userData[user.toLowerCase()].alt;
			if (ghostUser in userData && ghostUser.toLowerCase() != user.toLowerCase()) continue;

			var curUser     = userUsage[user];
			var cpuPerc     = Math.round(curUser.percent);
			var homePerc    = Math.round(curUser.homeperc);
			var scratchPerc = Math.round(curUser.scratchperc);

			cTime  = toDHMS(curUser.cpuSec);
			cDays  = cTime.split("-");
			if (cDays.length > 1) {
				cYears = Math.floor(cDays[0] / 365.25);
				cWeeks = Math.floor((cDays[0] % 365.25) / 7);
				cVDays = Math.floor((cDays[0] % 365.25) % 7);
			}

			cClock = cDays[cDays.length-1].split(":");
			cString = ""

			// Built usage time string.
			if      (cYears    > 0) cString += cYears + "y "    + cWeeks + "w " + cVDays + "d " + cClock[0] + "h " + cClock[1] + "m";
			else if (cWeeks    > 0) cString += cWeeks + "w "    + cVDays + "d " + cClock[0] + "h " + cClock[1] + "m";
			else if (cDays     > 0) cString += cVDays + "d "    + cClock[0] + "h " + cClock[1] + "m";
			else if (cClock[0] > 0) cString += cClock[0] + "h " + cClock[1] + "m";
			else cString += cClock[1] + "m";

			outML += "<tr>";
			outML += "<td title='" + userData[user].name + "\n";
			if (curUser.online == 1) {
				outML += "Online\n";
			}
			outML += "CPU Time: " + cString + "\n";
			outML += "/scratch: " + humanize(curUser.scratchuse,1) + "B (" + scratchPerc + "%)\n";
			outML += "/home: " + humanize(curUser.homeuse,1) + "B (" + homePerc + "%)'>";
			outML += "<div class='scratch' style='background-size: " + scratchPerc + "% 100%'/>";
			outML += "<div class='perc' style='background-size: " + cpuPerc + "% 100%'/>";
			outML += "<div class='home' style='background-size: " + homePerc + "% 100%'/>";
			outML += "<div>";
			outML += "<table width='100%' class='inner'>";
			outML += "<tr>";
			outML += "<td class='inner'>&nbsp;";
			if (curUser.online == 1) outML += "[";
			userName = userData[user].name.split(" ")
			outML += userName[0] + " " + userName[userName.length-1].charAt(0)
//			outML += user.replace('student+','');
			if (curUser.online == 1) outML += "]";
			outML += "&nbsp;</td>";
			outML += "<td class='inner' style='text-align:right'>&nbsp;";
			outML += cpuPerc;
			outML += "%&nbsp;</td>";
			outML += "<tr>";
			outML += "</table>";
			outML += "</div>";
			outML += "</td>";
			outML += "</tr>";
			/*}*/
		}
	}
	outML += "<tr><th>&nbsp;</th></tr>";

	document.getElementById('stats').innerHTML = outML

}

window.onload  = setInterval(updateData, REFRESH_RATE)
window.onfocus = (updateRun = 1)
window.onblur  = (updateRun = 0)
