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
DATABASE_URL=\"mysql://root:password@localhost:3306/vendr\"

# Authentication
JWT_SECRET=\"your-secret-key-here\"
SESSION_TIMEOUT=\"3600\"

# Encryption Keys
ENCRYPTION_KEY=\"32_byte_random_hex_string_please_change_in_production\"
MESSAGE_ENCRYPTION_KEY=\"your-encryption-key-here-make-it-long-and-random\""

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

# Setup Prisma
echo -e "\033[0;36mSetting up Prisma ORM...\033[0m"
npx prisma generate

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
    echo -e "\033[0;32mCreated uploads directories\033[0m"
else
    # Make sure all subdirectories exist
    mkdir -p uploads/profile-pictures
    mkdir -p uploads/posts
    mkdir -p uploads/profiles
    mkdir -p uploads/group-images
    mkdir -p uploads/media
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
        echo -e "\033[0;33mOpenSSL not found. Skipping certificate generation.\033[0m"
        echo -e "\033[0;33mYou may need to generate SSL certificates manually.\033[0m"
    fi
else
    echo -e "\033[0;32mSSL certificates directory already exists\033[0m"
fi

# Setup Frontend
echo -e "\n\033[0;36mSetting up frontend...\033[0m"
cd ../frontend || { echo "Frontend directory not found"; exit 1; }

# Install frontend dependencies
echo -e "\033[0;36mInstalling frontend dependencies...\033[0m"
npm install

# Generate SSL certificates for frontend if not already present
if [ ! -d "certificates" ]; then
    mkdir -p certificates
    # Check if openssl is installed
    if command -v openssl &> /dev/null; then
        echo -e "\033[0;36mGenerating self-signed SSL certificates for frontend...\033[0m"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certificates/key.pem -out certificates/cert.pem -subj "/CN=localhost" 2>/dev/null
        echo -e "\033[0;32mGenerated SSL certificates for frontend\033[0m"
    else
        echo -e "\033[0;33mOpenSSL not found. Skipping certificate generation.\033[0m"
        echo -e "\033[0;33mYou may need to generate SSL certificates manually.\033[0m"
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
echo -e "\033[0;33m2. Verify the database credentials in backend/.env\033[0m"
echo -e "\033[0;33m3. Run the database migrations if needed: cd backend && npx prisma migrate dev\033[0m"
echo -e "\n\033[0;33mTo start the application:\033[0m"
echo -e "\033[0;33m1. Start backend: cd backend && npm run dev\033[0m"
echo -e "\033[0;33m2. Start frontend: cd frontend && npm run dev\033[0m"
echo -e "\033[0;33m3. Or use the start-servers script in the root directory\033[0m"