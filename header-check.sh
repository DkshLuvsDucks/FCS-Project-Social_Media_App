#!/bin/bash
echo "Checking headers directly..."

# Get headers
headers=$(curl -sIk https://192.168.2.241)
echo "$headers"

# Check specific headers
echo -e "\nChecking HSTS..."
if echo "$headers" | grep -i "Strict-Transport-Security"; then
  echo "✅ Found"
else
  echo "❌ Missing"
fi

echo -e "\nChecking X-Frame-Options..."
if echo "$headers" | grep -i "X-Frame-Options"; then
  echo "✅ Found"
else
  echo "❌ Missing"
fi

echo -e "\nChecking CSP..."
if echo "$headers" | grep -i "Content-Security-Policy"; then
  echo "✅ Found"
else
  echo "❌ Missing"
fi
