#!/bin/bash
echo "Running comprehensive health check..."

# Check Nginx
echo "Checking Nginx..."
if systemctl is-active --quiet nginx; then
  echo "✅ Nginx service is running"
else
  echo "❌ Nginx service is NOT running"
fi

# Check API connection
echo "Checking API connection..."
api_response=$(curl -sk https://192.168.2.241/api/health)
if [[ $api_response == *"status"*"ok"* ]]; then
  echo "✅ API is responding correctly: $api_response"
else
  echo "❌ API is NOT responding correctly: $api_response"
fi

# Check frontend access
echo "Checking frontend access..."
status_code=$(curl -sk -o /dev/null -w "%{http_code}" https://192.168.2.241/)
if [[ $status_code == "200" ]]; then
  echo "✅ Frontend is accessible (status $status_code)"
else
  echo "❌ Frontend is NOT accessible (status $status_code)"
fi

# Check security headers
echo "Checking security headers..."
headers=$(curl -sIk https://192.168.2.241)
echo "Header response:"
echo "$headers"

# Parse headers manually
echo "Checking specific headers..."
if grep -i "Strict-Transport-Security" <<< "$headers"; then
  echo "✅ HSTS header is present"
else
  echo "❌ HSTS header is missing"
fi

if grep -i "X-Frame-Options" <<< "$headers"; then
  echo "✅ X-Frame-Options header is present"
else
  echo "❌ X-Frame-Options header is missing"
fi

if grep -i "Content-Security-Policy" <<< "$headers"; then
  echo "✅ Content-Security-Policy header is present"
else
  echo "❌ Content-Security-Policy header is missing"
fi

echo "Health check completed."
