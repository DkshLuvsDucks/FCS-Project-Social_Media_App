#!/bin/bash

# Deployment script for Social Media App
# This script prepares the frontend and backend for deployment to Ubuntu VM

echo "=== Building Frontend ==="
cd frontend
npm run build
echo "Frontend build complete!"

echo "=== Building Backend ==="
cd ../backend
npm run build
echo "Backend build complete!"

echo "=== Creating deployment package ==="
mkdir -p ../deploy
cp -r dist ../deploy/backend-dist
cp -r node_modules ../deploy/backend-node_modules
cp package.json ../deploy/backend-package.json
cp -r certificates ../deploy/backend-certificates
cp -r prisma ../deploy/backend-prisma

cd ../frontend
cp -r dist ../deploy/frontend-dist

cd ../

echo "=== Creating Nginx configuration files ==="
mkdir -p deploy/nginx

# Create frontend Nginx configuration
cat > deploy/nginx/frontend.conf << 'EOL'
server {
    listen 80;
    server_name 192.168.2.241;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 192.168.2.241;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    # Security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';

    # Frontend static files
    location / {
        root /home/iiitd/app/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass https://192.168.2.241:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    # Static assets proxy (images, uploads, etc.)
    location /uploads/ {
        proxy_pass https://192.168.2.241:3000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_ssl_verify off;
    }

    # Basic security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOL

# Create backend Nginx configuration
cat > deploy/nginx/backend.conf << 'EOL'
server {
    listen 3000 ssl;
    server_name 192.168.2.241;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

    # Security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH';

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Add security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
EOL

# Create deployment instructions
cat > deploy/README.md << 'EOL'
# Deployment Instructions

## Prerequisites
- Ubuntu 20.04 LTS VM
- Node.js (v16+) and npm
- Nginx
- PM2 (for process management)

## Installation Steps

1. Copy files to the VM:
```bash
# Use SCP to copy the deployment package to the VM
scp -r deploy/* iiitd@192.168.2.241:/home/iiitd/
```

2. SSH into the VM and set up the directories:
```bash
ssh iiitd@192.168.2.241

# Create the application directories
mkdir -p /home/iiitd/app/frontend
mkdir -p /home/iiitd/app/backend
```

3. Move files to their proper locations:
```bash
# Frontend
cp -r frontend-dist/* /home/iiitd/app/frontend/

# Backend
cp -r backend-dist /home/iiitd/app/backend/dist
cp -r backend-node_modules /home/iiitd/app/backend/node_modules
cp backend-package.json /home/iiitd/app/backend/package.json
cp -r backend-certificates /home/iiitd/app/backend/certificates
cp -r backend-prisma /home/iiitd/app/backend/prisma

# Create necessary directories for uploads
mkdir -p /home/iiitd/app/backend/uploads/profile-pictures
mkdir -p /home/iiitd/app/backend/uploads/media
mkdir -p /home/iiitd/app/backend/uploads/group-images
mkdir -p /home/iiitd/app/backend/uploads/posts
mkdir -p /home/iiitd/app/backend/uploads/products
mkdir -p /home/iiitd/app/backend/uploads/verification-documents
```

4. Set up Nginx:
```bash
# Move Nginx configuration files
sudo mv nginx/frontend.conf /etc/nginx/sites-available/
sudo mv nginx/backend.conf /etc/nginx/sites-available/

# Create symbolic links
sudo ln -s /etc/nginx/sites-available/frontend.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/backend.conf /etc/nginx/sites-enabled/

# Generate self-signed certificates
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

5. Set up environment variables for the backend:
```bash
# Create .env file
cat > /home/iiitd/app/backend/.env << EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=https://192.168.2.241
EOF
```

6. Install PM2 and start the backend:
```bash
# Install PM2 globally if not already installed
sudo npm install -g pm2

# Start the backend service
cd /home/iiitd/app/backend
pm2 start dist/index.js --name "social-media-backend"

# Make PM2 start on boot
pm2 startup
# Run the command PM2 outputs
pm2 save
```

7. Verify the deployment:
- Visit https://192.168.2.241 in your browser
- Verify that the frontend loads correctly
- Test the API endpoints to ensure the backend is working

## Troubleshooting

- If you encounter issues with Nginx, check: `sudo less /var/log/nginx/error.log`
- If the backend service isn't starting, check the PM2 logs: `pm2 logs social-media-backend`
- If you encounter CORS issues, verify that the CORS_ORIGIN in the backend .env file matches your frontend URL
EOL

# Create a .env file template for the backend
cat > deploy/backend-env.template << 'EOL'
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=https://192.168.2.241
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
EOL

echo "=== Deployment package created ==="
echo "The deployment package has been created in the 'deploy' directory."
echo "Follow the instructions in deploy/README.md to deploy to your VM." 