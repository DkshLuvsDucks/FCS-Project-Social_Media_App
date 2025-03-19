#!/bin/bash

# Unix Setup Script
echo -e "\033[0;32mSetting up your project...\033[0m"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "\033[0;31mNode.js is not installed. Please install Node.js first.\033[0m"
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "\033[0;31mMySQL is not installed. Please install MySQL first.\033[0m"
    exit 1
fi

# Create .env file for backend
BACKEND_ENV="# Database Configuration
DATABASE_URL=\"mysql://root:password@localhost:3306/vendr\"

# Authentication
JWT_SECRET=\"your-secret-key-here\"
SESSION_TIMEOUT=\"3600\"

# Encryption Keys
ENCRYPTION_KEY=\"32_byte_random_hex_string_please_change_in_production\"
MESSAGE_ENCRYPTION_KEY=\"your-encryption-key-here-make-it-long-and-random\""

# Setup Backend
echo -e "\033[0;36mSetting up backend...\033[0m"
cd backend
if [ ! -f ".env" ]; then
    echo "$BACKEND_ENV" > .env
    echo -e "\033[0;32mCreated backend .env file\033[0m"
fi

npm install
npm run prisma:generate
npm run prisma:migrate

# Generate SSL certificates for backend
if [ ! -d "certificates" ]; then
    mkdir certificates
    npm run generate-certificates
fi

# Setup Frontend
echo -e "\n\033[0;36mSetting up frontend...\033[0m"
cd ../frontend
npm install

# Generate SSL certificates for frontend
if [ ! -d "certificates" ]; then
    mkdir certificates
    npm run generate-certificates
fi

cd ..

echo -e "\n\033[0;32mSetup completed successfully!\033[0m"
echo -e "\033[0;33mTo start the application:\033[0m"
echo -e "\033[0;33m1. Start backend: cd backend && npm run dev\033[0m"
echo -e "\033[0;33m2. Start frontend: cd frontend && npm run dev\033[0m"