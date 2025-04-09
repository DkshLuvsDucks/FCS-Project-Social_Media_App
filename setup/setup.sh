#!/bin/bash

# Unix Setup Script
echo -e "\033[0;32m====================================================\033[0m"
echo -e "\033[0;32m         Vendr - Development Environment Setup      \033[0m"
echo -e "\033[0;32m====================================================\033[0m"

# Check if Node.js is installed, if not, try to install it
if ! command -v node &> /dev/null; then
    echo -e "\033[0;33mNode.js is not installed. Attempting to install...\033[0m"
    
    # Check which package manager is available
    if command -v apt-get &> /dev/null; then
        echo -e "\033[0;36mInstalling Node.js using apt...\033[0m"
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    elif command -v dnf &> /dev/null; then
        echo -e "\033[0;36mInstalling Node.js using dnf...\033[0m"
        sudo dnf install -y nodejs npm
    elif command -v yum &> /dev/null; then
        echo -e "\033[0;36mInstalling Node.js using yum...\033[0m"
        sudo yum install -y nodejs npm
    elif command -v brew &> /dev/null; then
        echo -e "\033[0;36mInstalling Node.js using Homebrew...\033[0m"
        brew install node
    else
        echo -e "\033[0;31mUnable to install Node.js automatically. Please install Node.js (v18+) manually.\033[0m"
        echo -e "\033[0;31mVisit https://nodejs.org/ to download and install.\033[0m"
        exit 1
    fi
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo -e "\033[0;31mNode.js installation failed. Please install manually.\033[0m"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d "v" -f 2 | cut -d "." -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "\033[0;31mNode.js version is too old (v$NODE_VERSION). Please upgrade to v18 or later.\033[0m"
    exit 1
fi

echo -e "\033[0;32mNode.js $(node -v) is installed\033[0m"
echo -e "\033[0;32mNPM $(npm -v) is installed\033[0m"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "\033[0;31mMySQL is not installed.\033[0m"
    echo -e "\033[0;33mPlease install MySQL 8.0 or later manually:\033[0m"
    echo -e "\033[0;36m- Ubuntu/Debian: sudo apt-get install mysql-server\033[0m"
    echo -e "\033[0;36m- Fedora: sudo dnf install mysql-server\033[0m"
    echo -e "\033[0;36m- macOS: brew install mysql\033[0m"
    echo -e "\033[0;33mAfter installation, make sure MySQL service is running.\033[0m"
    
    read -p "Continue setup without MySQL? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "\033[0;32mMySQL is installed\033[0m"
fi

# Create .env file for backend if it doesn't exist
BACKEND_ENV="# Database Configuration
DATABASE_URL=\"mysql://root:123@localhost:3306/vendr\"

# Authentication
JWT_SECRET=\"bj9XzE2KLp8n5fTVAuC7ymRHGd3qP6ZwDsQ4vWxMcJ\"
SESSION_TIMEOUT=\"86400\"

# Encryption Keys
ENCRYPTION_KEY=\"4f2d1a8c6b9e3f7d0a5c2b8e9f6d3a7c4b1e8f5d2a9c6\"
MESSAGE_ENCRYPTION_KEY=\"pK8aVz3bL9dQ7rF2gH5tY6uJ4sM1xN0cW8vB7nP9mD3eR5tG6yU2jK4sL7fH9dA\"
PRODUCT_ENCRYPTION_KEY=\"J7dS9fH2kL5mP3qR8tV6wY1zB4xC0nM2vA5bD8eF6gH3jK9\"

# Email OTP Configuration
EMAIL_USER=\"vendr.admn@gmail.com\"
EMAIL_APP_PASSWORD=\"hrhi ykob xyvj mpco\"
APP_NAME=\"Vendr\"

# Other Environment Variables
PORT=3000

# Twilio Configuration
TWILIO_ACCOUNT_SID=\"AC65eec9ded00fec1597b00bd1a103d960\"
TWILIO_AUTH_TOKEN=\"7b302c0403f87ce373e5255029855428\"
TWILIO_PHONE_NUMBER=\"+19207728959\""

# Frontend .env file
FRONTEND_ENV="VITE_API_URL=https://localhost:3000"

# Setup Backend
echo -e "\n\033[0;36mSetting up backend...\033[0m"
cd ../backend || { echo "Backend directory not found"; exit 1; }

if [ ! -f ".env" ]; then
    echo "$BACKEND_ENV" > .env
    echo -e "\033[0;32mCreated backend .env file\033[0m"
else
    echo -e "\033[0;32mBackend .env file already exists\033[0m"
fi

# Install backend dependencies
echo -e "\033[0;36mInstalling backend dependencies...\033[0m"
npm install
npm install @prisma/client@5.10.2 @socket.io/admin-ui@0.5.1 @types/bcrypt@5.0.2 @types/cors@2.8.17 @types/uuid@10.0.0 bcrypt@5.1.1 compression@1.8.0 cookie-parser@1.4.7 cors@2.8.5 csurf@1.10.0 dotenv@16.4.5 express@4.18.3 express-rate-limit@7.5.0 firebase-admin@13.2.0 helmet@8.1.0 https@1.0.0 ioredis@5.6.0 jsonwebtoken@9.0.2 morgan@1.10.0 multer@1.4.5-lts.1 mysql2@3.9.2 nodemailer@6.10.0 prisma@5.10.2 rate-limit-redis@4.2.0 react-otp-input@3.1.1 sequelize@6.37.7 sequelize-typescript@2.1.6 socket.io@4.8.1 twilio@5.5.2 uuid@11.1.0 --save

# Install backend dev dependencies
npm install @types/bcryptjs@2.4.6 @types/compression@1.7.5 @types/cookie-parser@1.4.8 @types/csurf@1.11.5 @types/express@4.17.21 @types/jsonwebtoken@9.0.6 @types/morgan@1.9.9 @types/multer@1.4.12 @types/node@20.17.24 @types/nodemailer@6.4.17 @types/sequelize@4.28.20 bcryptjs@3.0.2 mkcert@3.2.0 node-forge@1.3.1 nodemon@3.1.9 ts-node@10.9.2 typescript@5.8.2 --save-dev

# Fix executable permissions for node_modules binaries
echo -e "\033[0;36mFixing executable permissions for node modules...\033[0m"
sudo chmod +x node_modules/.bin/*
echo -e "\033[0;32mFixed executable permissions for backend binaries\033[0m"

# Setup Prisma
echo -e "\033[0;36mSetting up Prisma ORM...\033[0m"
npx prisma generate

# Run Prisma migrations if they exist
echo -e "\033[0;36mRunning Prisma migrations...\033[0m"
npx prisma migrate deploy || echo -e "\033[0;33mNo migrations to run or database not accessible.\033[0m"

# Run Prisma seed to create admin user
echo -e "\033[0;36mCreating admin user...\033[0m"
npx prisma db seed || echo -e "\033[0;33mFailed to seed database. Check MySQL connection.\033[0m"

# Create required directories
echo -e "\033[0;36mCreating required directories...\033[0m"

# Create uploads directory and its subdirectories
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    mkdir -p uploads/profile-pictures
    mkdir -p uploads/posts
    mkdir -p uploads/profiles
    mkdir -p uploads/group-images
    mkdir -p uploads/media
    mkdir -p uploads/verification-documents
    mkdir -p uploads/products
    echo -e "\033[0;32mCreated uploads directories\033[0m"
else
    # Make sure all subdirectories exist
    mkdir -p uploads/profile-pictures
    mkdir -p uploads/posts
    mkdir -p uploads/profiles
    mkdir -p uploads/group-images
    mkdir -p uploads/media
    mkdir -p uploads/verification-documents
    mkdir -p uploads/products
    echo -e "\033[0;32mUploads directories already exist\033[0m"
fi

# Generate SSL certificates
if [ ! -d "certificates" ]; then
    mkdir -p certificates
    # Check if openssl is installed
    if command -v openssl &> /dev/null; then
        echo -e "\033[0;36mGenerating self-signed SSL certificates...\033[0m"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certificates/key.pem -out certificates/cert.pem -subj "/CN=localhost" 2>/dev/null
        echo -e "\033[0;32mGenerated SSL certificates\033[0m"
    else
        echo -e "\033[0;33mOpenSSL not found. Using npm mkcert to generate certificates...\033[0m"
        npx mkcert create localhost
        mkdir -p certificates
        mv localhost.key certificates/key.pem
        mv localhost.crt certificates/cert.pem
        echo -e "\033[0;32mGenerated SSL certificates using mkcert\033[0m"
    fi
else
    echo -e "\033[0;32mSSL certificates directory already exists\033[0m"
fi

# Setup Frontend
echo -e "\n\033[0;36mSetting up frontend...\033[0m"
cd ../frontend || { echo "Frontend directory not found"; exit 1; }

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "$FRONTEND_ENV" > .env
    echo -e "\033[0;32mCreated frontend .env file\033[0m"
else
    echo -e "\033[0;32mFrontend .env file already exists\033[0m"
fi

# Install frontend dependencies
echo -e "\033[0;36mInstalling frontend dependencies...\033[0m"
npm install
npm install @emotion/react@11.14.0 @emotion/styled@11.14.0 @mui/icons-material@6.4.7 @mui/material@6.4.7 @tailwindcss/vite@4.0.12 axios@1.8.3 date-fns@4.1.0 framer-motion@12.4.10 lucide-react@0.475.0 mkcert@3.2.0 react@19.0.0 react-dom@19.0.0 react-hot-toast@2.5.2 react-icons@5.5.0 react-image-crop@11.0.7 react-otp-input@3.1.1 react-router-dom@7.3.0 --save

# Install frontend dev dependencies
npm install @eslint/js@9.19.0 @tailwindcss/forms@0.5.10 @types/axios@0.9.36 @types/node@22.13.10 @types/react@19.0.11 @types/react-dom@19.0.4 @types/react-router-dom@5.3.3 @vitejs/plugin-react@4.3.4 autoprefixer@10.4.20 eslint@9.19.0 eslint-plugin-react-hooks@5.0.0 eslint-plugin-react-refresh@0.4.18 globals@15.14.0 postcss@8.5.3 tailwind-scrollbar@4.0.1 tailwindcss@4.0.12 typescript@5.7.2 typescript-eslint@8.22.0 vite@6.1.0 --save-dev

# Fix executable permissions for node_modules binaries
echo -e "\033[0;36mFixing executable permissions for node modules...\033[0m"
sudo chmod +x node_modules/.bin/*
echo -e "\033[0;32mFixed executable permissions for frontend binaries\033[0m"

# Create required directories
echo -e "\033[0;36mCreating required frontend directories...\033[0m"

# Make sure the ssl/ directory exists
if [ ! -d "ssl" ]; then
    mkdir -p ssl
    echo -e "\033[0;32mCreated frontend ssl directory\033[0m"
else
    echo -e "\033[0;32mFrontend ssl directory already exists\033[0m"
fi

# Generate SSL certificates for frontend if not already present
if [ ! -d "certificates" ]; then
    mkdir -p certificates
    # Check if openssl is installed
    if command -v openssl &> /dev/null; then
        echo -e "\033[0;36mGenerating self-signed SSL certificates for frontend...\033[0m"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certificates/key.pem -out certificates/cert.pem -subj "/CN=localhost" 2>/dev/null
        echo -e "\033[0;32mGenerated SSL certificates for frontend\033[0m"
    else
        echo -e "\033[0;33mOpenSSL not found. Using npm mkcert to generate certificates...\033[0m"
        npx mkcert create localhost
        mkdir -p certificates
        mv localhost.key certificates/key.pem
        mv localhost.crt certificates/cert.pem
        echo -e "\033[0;32mGenerated SSL certificates for frontend using mkcert\033[0m"
    fi
else
    echo -e "\033[0;32mFrontend SSL certificates already exist\033[0m"
fi

# Return to root directory
cd ..

echo -e "\n\033[0;32m====================================================\033[0m"
echo -e "\033[0;32mVendr setup completed successfully!\033[0m"
echo -e "\033[0;32m====================================================\033[0m"
echo -e "\033[0;33mBefore running the application:\033[0m"
echo -e "\033[0;33m1. Make sure MySQL server is running\033[0m"
echo -e "\033[0;33m2. Create a database named 'vendr' if it doesn't exist:\033[0m"
echo -e "\033[0;36m   mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS vendr;\"\033[0m"
echo -e "\033[0;33m3. Run the database migrations: cd backend && npx prisma migrate dev\033[0m"
echo -e "\n\033[0;33mTo start the application:\033[0m"
echo -e "\033[0;33m1. Start backend: cd backend && npm run dev\033[0m"
echo -e "\033[0;33m2. Start frontend: cd frontend && npm run dev\033[0m"
echo -e "\033[0;33m3. Or use the start-servers script in the server_scripts directory\033[0m"

echo -e "\n\033[0;33mTroubleshooting:\033[0m"
echo -e "\033[0;33mIf you experience permission issues with node_modules binaries (e.g., 'ts-node: Permission denied'), run:\033[0m"
echo -e "\033[0;36m   cd backend && sudo chmod +x node_modules/.bin/*\033[0m"
echo -e "\033[0;36m   cd frontend && sudo chmod +x node_modules/.bin/*\033[0m"
echo -e "\033[0;33mOr run the application with sudo (not recommended for production):\033[0m"
echo -e "\033[0;36m   sudo npm run dev\033[0m"