#!/bin/bash
sreport -naP cluster Utilization Start=${1} | awk -F'|' '{print $7/60/24/365.2422}'