#!/bin/bash
echo "Performing security check..."

# Check direct access to health server
echo "Checking direct access to health server..."
direct_health=$(curl -s http://localhost:3001/health)
echo "Direct health response: $direct_health"

direct_api_health=$(curl -s http://localhost:3001/api/health)
echo "Direct API health response: $direct_api_health"

# Check HTTPS configuration
echo "Checking HTTPS setup..."
if curl -sIk https://192.168.2.241 | grep -q "200 OK"; then
  echo "✅ HTTPS is properly configured"
else
  echo "❌ HTTPS is NOT properly configured"
fi

# Check HTTP to HTTPS redirect
echo "Checking HTTP to HTTPS redirect..."
if curl -sI http://192.168.2.241 | grep -q "301 Moved Permanently"; then
  echo "✅ HTTP to HTTPS redirect is working"
else
  echo "❌ HTTP to HTTPS redirect is NOT working"
fi

# Check API is working over HTTPS
echo "Checking API over HTTPS..."
api_response=$(curl -sk https://192.168.2.241/api/health)
echo "API response: $api_response"
if [[ $api_response == *"status"*"ok"* ]]; then
  echo "✅ API is working over HTTPS"
else
  echo "❌ API is NOT working over HTTPS"
fi

# Check security headers
echo "Checking security headers..."
headers=$(curl -sIk https://192.168.2.241)

if echo "$headers" | grep -q "Strict-Transport-Security"; then
  echo "✅ HSTS header is present"
else
  echo "❌ HSTS header is missing"
fi

if echo "$headers" | grep -q "X-Frame-Options"; then
  echo "✅ X-Frame-Options header is present"
else
  echo "❌ X-Frame-Options header is missing"
fi

if echo "$headers" | grep -q "X-XSS-Protection"; then
  echo "✅ X-XSS-Protection header is present"
else
  echo "❌ X-XSS-Protection header is missing"
fi

if echo "$headers" | grep -q "X-Content-Type-Options"; then
  echo "✅ X-Content-Type-Options header is present"
else
  echo "❌ X-Content-Type-Options header is missing"
fi

if echo "$headers" | grep -q "Content-Security-Policy"; then
  echo "✅ Content-Security-Policy header is present"
else
  echo "❌ Content-Security-Policy header is missing"
  echo "Headers received:"
  echo "$headers"
fi

echo "Security check completed."
