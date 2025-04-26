#!/bin/bash

# Check Nginx status
echo "Checking Nginx service status..."
if systemctl is-active --quiet nginx; then
  echo "✅ Nginx is running"
else
  echo "❌ Nginx is NOT running"
fi

# Check health server
echo -e "\nChecking direct health server access..."
direct=$(curl -s http://localhost:3001/health)
echo "Response: $direct"

# Check Nginx API proxy
echo -e "\nChecking API through Nginx..."
api=$(curl -sk https://192.168.2.241/api/health)
echo "Response: $api"

echo -e "\nDone"
