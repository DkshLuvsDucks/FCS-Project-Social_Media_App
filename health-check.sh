#!/bin/bash
echo "Checking application health..."

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
  echo "✅ Nginx is running"
else
  echo "❌ Nginx is NOT running"
  sudo systemctl start nginx
fi

# Check if backend is running
if pm2 list | grep -q "vendr-backend"; then
  echo "✅ Backend is running"
else
  echo "❌ Backend is NOT running"
  cd backend
  pm2 start dist/index.js --name vendr-backend
fi

# Check if frontend is accessible
if curl -s http://localhost | grep -q "<html"; then
  echo "✅ Frontend is accessible"
else
  echo "❌ Frontend is NOT accessible"
fi

# Check database connection
echo "Checking database connection..."
if node db-check.js; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
fi
