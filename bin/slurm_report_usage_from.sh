#!/bin/bash
sreport -nP cluster AccountUtilizationByUser Format=Login,Used Start=${1} | awk -F'|' '$1!=""{sum+=$2} END{print sum/60/24/365.2422}'
