#!/bin/bash

echo "Checking headers directly with curl..."
curl -I https://192.168.2.241/ -k

echo -e "\nChecking headers for API endpoint..."
curl -I https://192.168.2.241/api/health -k

