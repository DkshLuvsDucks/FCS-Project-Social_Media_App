#!/bin/bash
echo "Testing API connectivity..."

# Test direct API access
echo -e "\nDirect access to backend:"
curl -v http://localhost:3001/health

# Test through Nginx
echo -e "\nAccess through Nginx:"
curl -vk https://192.168.2.241/api/health

# Test CORS headers
echo -e "\nCORS headers through Nginx:"
curl -vk -X OPTIONS https://192.168.2.241/api/health

echo -e "\nDone testing API connectivity"
