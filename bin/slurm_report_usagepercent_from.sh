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
			printf "%s,%d,%.10f\n", userID, cpuMins[userID]*60, (cpuMins[userID]/sum)*100
		}
	}
	printf "CLUSTERTOTAL,%d,100.0\n", (sum*60)
}
' | \
	sort -t, -rhk2))

activeUsers=($(/usr/bin/who | awk '{print tolower($1)}' | sort | uniq))

for line in ${dataBlock[@]}
do
	active=0
	user=$(echo $line | awk -F',' '{print $1}')
	perc=$(echo $line | awk -F',' '{print $2}')
	for aUser in ${activeUsers[@]}
	do
		
		if [ "$user" == "$aUser" ]
		then
			active=1
			break
		fi
	done
	echo ${line},${active},$(cat /var/www/html/home_usage.txt | grep -i $user &>/dev/null && cat /var/www/html/home_usage.txt | grep -i $user | awk '{print $2","$3}' || echo -n 0,0),$(cat /var/www/html/scratch_usage.txt | grep -i $user &>/dev/null && cat /var/www/html/scratch_usage.txt | grep -i $user | awk '{print $2","$3}' || echo -n 0,0)
done

IFS=$oldIFS
