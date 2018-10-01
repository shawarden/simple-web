#!/bin/bash

oldIFS=$IFS
IFS=$'\n'

dataBlock=($(sreport -nP \
	cluster AccountUtilizationByUser \
	Format=Login,Used \
	Start=${1} | \
	awk -F'|' '
$1!="" {
	cpuMins[$1]+=$2
	sum+=$2
}

END {
	for (userID in cpuMins) {
		if ( cpuMins[userID] > 0 ) {
			if (userID !~ "testuser") {
				printf "%s %.10f\n", userID, (cpuMins[userID]/sum)*100
			}
		}
	}
}
' | \
	sort -rhk2))

activeUsers=($(/usr/bin/who | awk '{print tolower($1)}' | sort | uniq))

for line in ${dataBlock[@]}
do
	active=0
	user=$(echo $line | awk '{print $1}')
	perc=$(echo $line | awk '{print $2}')
	for aUser in ${activeUsers[@]}
	do
		
		if [ "$user" == "$aUser" ]
		then
			active=1
			break
		fi
	done
	echo $line $active

done

IFS=$oldIFS