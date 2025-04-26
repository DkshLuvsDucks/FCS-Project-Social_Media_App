#!/bin/bash
echo "Testing API routing..."

# Check if Nginx sites-enabled has the correct symlink
echo "Checking Nginx sites-enabled..."
if [ -L /etc/nginx/sites-enabled/vendr ]; then
  echo "✅ vendr config is linked in sites-enabled"
else
  echo "❌ vendr config is NOT linked in sites-enabled"
fi

# Test direct access
echo -e "\nDirect access to health server:"
curl -v http://localhost:3001/health

echo -e "\nDirect access to API health endpoint:"
curl -v http://localhost:3001/api/health

# Test through Nginx
echo -e "\nAccess through Nginx API endpoint:"
curl -vk https://192.168.2.241/api/health
