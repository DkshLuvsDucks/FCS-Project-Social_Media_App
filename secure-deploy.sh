#!/bin/bash
echo "Starting secure deployment process..."

# Pull latest changes
cd ~/FCS-Project-Social_Media_App
git pull

# Build frontend
cd frontend
npm install
npm run build

# Copy frontend files to web directory
sudo cp -R dist/* /var/www/vendr/
sudo chown -R www-data:www-data /var/www/vendr
sudo chmod -R 755 /var/www/vendr

# Update backend
cd ../backend
npm install
npm run build

# Update environment variables if needed
# (uncomment and modify as needed)
# sed -i 's/FRONTEND_URL=.*/FRONTEND_URL=https:\/\/192.168.2.241/' .env
# sed -i 's/ALLOWED_ORIGINS=.*/ALLOWED_ORIGINS=https:\/\/192.168.2.241/' .env

# Restart backend
pm2 restart vendr-backend

# Check Nginx configuration and restart if needed
sudo nginx -t && sudo systemctl restart nginx

# Test deployment
echo "Testing secure deployment..."
curl -sk https://192.168.2.241/ > /dev/null && echo "✅ HTTPS frontend is accessible" || echo "❌ HTTPS frontend is NOT accessible"
curl -sk https://192.168.2.241/api/health > /dev/null && echo "✅ HTTPS API is responding" || echo "❌ HTTPS API is NOT responding"

echo "Secure deployment completed!"
