var hostStats = new Object();
var userUsage = new Object();
var coreYears = new Object();
var userData  = new Object();
var memAlloc  = new Object();
var memUsage  = new Object();

var toSeconds = function(timeString) {
	var dhms  = timeString.split(/-|:/);
	var multi = [1,60,3600,86400]
	var len   = (dhms.length);
	var secs  = 0
	for (var i=0; i < len; i++) {
		var oldSecs = secs
		secs += multi[i] * dhms[len-i-1]
	}
	return secs;
}

var toDHMS = function(seconds) {
	var days = Math.floor(seconds / 86400);
	var hrs  = Math.floor((seconds % 86400) / 3600);
	var mins = Math.floor((seconds % 3600) / 60);
	var secs = (seconds % 60);
	
	var output = '';
	output    += (days > 0 ? days + "-" : '');
	output    += (hrs < 10 ? '0' : '')  + hrs  + ":";
	output    += (mins < 10 ? '0' : '') + mins + ":";
	output    += (secs < 10 ? '0' : '') + secs;
	
//	alert(seconds + " : " + output)
	return output;
}

var humanize = function(num, precision=0) {
	var mult = " KMGTPE";
	var i    = 0;
	var fNum = num;
	while (fNum > 1024) {
		fNum /= 1024
		i++
	}
	return '' + parseFloat(fNum.toFixed(precision)) + (mult[i] != " " ? mult[i] : "") + ''
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
	try {var lines = getPage("http://dsmc0.otago.ac.nz/userlist.txt");}
	catch (err) {return oldDataSet;}
	
	try {var len = lines.length;}
	catch (e) {return oldDataSet;}
	
	var newDataSet = new Object();
	
	for (var i = 0; i < len; i++) {
		blocks = lines[i].split(":");
		if (blocks.length == 5) {	// Contains data
			newDataSet[blocks[0].toLowerCase()] = {
				'name'  : blocks[1],
				'email' : blocks[2],
				'alt'   : blocks[3],
				'store' : blocks[4]
			};
		}
	}
	
	return newDataSet;
}

var updateCluster = function(oldDataSet) {
	try {var lines = getSource("http://dsmc0.otago.ac.nz/slurm_cluster_stats.txt");}
	catch (err) {return;}
	
	try {var len = lines.length;}
	catch (err) {return;}
	
	for (var i = 0; i < len; i++) {
		var line  = lines[i].split('=');
		var chunk = line[0];
		var data  = line[1].split(',');
		
		// What lines are we getting here?
		switch (chunk) {
			case 'HOST':	// Host properties
				hostStats[data[0]] = {
					'memalloc' : 0,
					'memusage' : 0,
					'memmax'   : data[1],
					'cpupeak'  : 0,
					'cpuusage' : 0,
					'cpualloc' : data[2],
					'cpuidle'  : data[3],
					'cpumax'   : data[4]
				};
				break;
			case 'CORE':	// Core usage
				coreYears[data[0]] = {
					'avail' : data[1],
					'used'  : data[2]
				};
				break;
			case 'USER':	// User usage
				userUsage[data[0]] = {
					'running' : false,
					'usage'   : parseFloat(parseFloat(data[1]).toFixed(2)),
					'online'  : data[2]
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
			if (line.length == 17) {
				var procList = line[16].split('|');
				var procCnt  = procList.length;
				
				for (var j = 0; j < procCnt; j++) {
					var procData = procList[j].split(':');
					procSet[procData[0]] = {
						'cmd'  : procData[1],
						'pcpu' : parseFloat(procData[2]),
						'memu' : parseInt(procData[3])
					};
				}
			}
			
			newDataSet[line[0]] = {
				'user'      : line[1].toLowerCase(),
				'account'   : line[2],
				'array'     : line[3].replace(/@@/g, ','),
				'runtime'   : line[4],
				'maxtime'   : line[5],
				'state'     : line[6],
				'partition' : line[7],
				'cpualloc'  : line[8],
				'memalloc'  : line[9],
				'hostname'  : line[10].replace(/@@/g, ','),
				'jobname'   : line[11].replace(/@@/g, ','),
				'cpuusage'  : line[12] != null ? parseFloat(line[12]) : 0,
				'cpupeak'   : line[13] != null ? parseFloat(line[13]) : 0,
				'memusage'  : line[14] != null ? line[14] : 0,
				'mempeak'   : line[15] != null ? line[15] : 0,
				'proclist'  : procSet
			};
			
			var host = newDataSet[line[0]].hostname
			var user = newDataSet[line[0]].user
			
			if (host in hostStats) {	// Pending jobs bump into me!
				hostStats[host].memalloc +=   parseInt(newDataSet[line[0]].memalloc);
				hostStats[host].memusage +=   parseInt(newDataSet[line[0]].memusage);
				hostStats[host].cpupeak  += parseFloat(newDataSet[line[0]].cpupeak);
				hostStats[host].cpuusage += parseFloat(newDataSet[line[0]].cpuusage);
				
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
		line     += "'> &nbsp; " + thisSet.user.replace('student+','') + " &nbsp; </td>";
		
		line     += "<td title='" + jobid + "'> &nbsp; " + thisSet.array + " &nbsp; </td>";
		
		line     += "<td style='text-align:right;'>";
		
		if (bRun) {
			var runPercent  = Math.round((thisSet.runtime / thisSet.maxtime) * 100)
			
			line += "<div class='perc' style='background-size: " + runPercent + "% 100%'/>";
			line += "<div style='justify-content:right;' title='" + runPercent + "% of " + toDHMS(thisSet.maxtime) + "'> &nbsp; ";
			line += toDHMS(thisSet.runtime);
			line += " &nbsp; </div>";
		} else {
			line += " &nbsp; " + toDHMS(thisSet.maxtime) + " &nbsp; ";
		}
		
		line     += "</td>";
		
		line     += "<td> &nbsp; " + thisSet.state + " &nbsp; </td>";
		
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
*/			line += "title='Curr: " + thisSet.cpuusage + "\nPeak: " + thisSet.cpupeak + "\nPID CMD CPU MEM\n";
			for (var pid in thisSet.proclist) {
				curProc = thisSet.proclist[pid];
				line += pid + " " + curProc.cmd + " " + curProc.pcpu + " " + humanize(curProc.memu) + "B\n";
			}
			line += "'> &nbsp; ";
			line += parseFloat(thisSet.cpupeak.toFixed(2)) + "/";
		}
		
		line     += thisSet.cpualloc + " &nbsp; ";
		
		if (bRun) {
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
			line += "'> &nbsp; " + humanize(thisSet.mempeak) + "/";
		}
		
		line     += humanize(thisSet.memalloc) + " &nbsp; ";
		
		if (bRun) {
			line += "</div>";
		}
		line     += "</td>";
		line     += "<td> &nbsp; " + thisSet.hostname + " &nbsp; </td>";
		line     += "<td> &nbsp; " + thisSet.jobname + " &nbsp; </td>";
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
		jobSet = {...jobSet, ...getJobSetFromFile("http://dsmc0.otago.ac.nz/slurm_task_tracker_" + host + ".txt")};
	}
	
	var pendSet = getJobSetFromFile("http://dsmc0.otago.ac.nz/slurm_pending_tasks.txt");
	
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
		
		outML += "<tr>";
		outML += "<td title='" + parseFloat(curSpan.used).toFixed(2) + " of " + parseFloat(curSpan.avail).toFixed(2) + " CPU Years'>";
		outML += "<div class='perc' style='background-size: "+ curPerc + "% 100%'/>";
		outML += "<div>";
		outML += "<table width='100%' class='inner'><tr><td class='inner'> &nbsp; " + spans[i] + " &nbsp; </td><td class='inner' style='text-align:right'> &nbsp; " + curPerc + "% &nbsp; </td><tr></table>";
		outML += "</div>";
		outML += "</td>";
		outML += "</tr>";
		
	}
	outML += "<tr><th> &nbsp; </th></tr>";
	
	outML += "<tr><th>Cores<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.cpuusage / curHost.cpumax) * 100)
		var curLock = Math.round((curHost.cpualloc / curHost.cpumax) * 100)
		
		outML += "<tr>";
		outML += "<td title='Allocated: " + curHost.cpualloc + " (" + curLock + "%)\nUtilized: " + parseFloat(curHost.cpuusage.toFixed(2)) + " (" + curUsed + "%)'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div> &nbsp; " + curHost.cpualloc + "/" + curHost.cpumax + " &nbsp; </div>";
		outML += "</td>";
		outML += "</tr>";
	}
	outML += "<tr><th> &nbsp; </th></tr>";
	
	outML += "<tr><th>Memory<th></tr>";
	for (var host in hostStats) {
		var curHost = hostStats[host];
		var curUsed = Math.round((curHost.memusage / curHost.memmax) * 100)
		var curLock = Math.round((curHost.memalloc / curHost.memmax) * 100)
		
		outML += "<tr>";
		outML += "<td title='Allocated: " + humanize(curHost.memalloc,2) + " ( " + curLock + "%)\nUtilized: " + humanize(curHost.memusage,2) + " ( " + curUsed + "%'>";
		outML += "<div class='peak' style='background-size: "+ curLock + "% 100%'/>";
		outML += "<div class='perc' style='background-size: "+ curUsed + "% 100%'/>";
		outML += "<div> &nbsp; " + humanize(curHost.memalloc) + "/" + humanize(curHost.memmax) + " &nbsp; </div>";
		outML += "</td>";
		outML += "</tr>";
	}
	outML += "<tr><th> &nbsp; </th></tr>";
	
	outML += "<tr><th>Users Online<th></tr>";
	for (var user in userUsage) {
		if (user.toLowerCase() in userData) {
			var curUser = userUsage[user];
			
			if (curUser.online == 1) {
				outML += "<tr>";
				outML += "<td title='" + userData[user].name + ": " + curUser.usage + "%'>";
				outML += "<div class='perc' style='background-size: " + curUser.usage + "% 100%'/>";
				outML += "<div> &nbsp; " + user.replace('student+','') + " &nbsp; </div>";
				outML += "</td>";
				outML += "</tr>";
			}
		}
	}
	outML += "<tr><th> &nbsp; </th></tr>";
	
	document.getElementById('stats').innerHTML = outML
	
}

window.onload = setInterval(updateData, 6000)