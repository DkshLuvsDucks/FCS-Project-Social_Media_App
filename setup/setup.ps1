# Windows Setup Script
Write-Host "====================================================" -ForegroundColor Green
Write-Host "         Vendr - Development Environment Setup      " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Check if Node.js is installed, if not, try to install it
$nodeInstalled = $false
try {
    $nodeVersion = node -v
    $nodeInstalled = $true
} catch {
    Write-Host "Node.js is not installed. Attempting to install..." -ForegroundColor Yellow
    
    # Check which package manager is available
    $wingetAvailable = $false
    $chocoAvailable = $false
    
    try {
        winget -v | Out-Null
        $wingetAvailable = $true
    } catch {
        # Winget not available
    }
    
    try {
        choco -v | Out-Null
        $chocoAvailable = $true
    } catch {
        # Chocolatey not available
    }
    
    if ($wingetAvailable) {
        Write-Host "Installing Node.js using winget..." -ForegroundColor Cyan
        winget install -e --id OpenJS.NodeJS.LTS
    } elseif ($chocoAvailable) {
        Write-Host "Installing Node.js using Chocolatey..." -ForegroundColor Cyan
        choco install nodejs-lts -y
    } else {
        Write-Host "Unable to install Node.js automatically." -ForegroundColor Red
        Write-Host "Please install Node.js (v18+) manually from https://nodejs.org/" -ForegroundColor Red
        Write-Host "After installing Node.js, please run this script again." -ForegroundColor Yellow
        exit 1
    }
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify installation
    try {
        $nodeVersion = node -v
        $nodeInstalled = $true
    } catch {
        Write-Host "Node.js installation failed. Please install manually." -ForegroundColor Red
        exit 1
    }
}

# Check Node.js version
if ($nodeInstalled) {
    $versionNumber = ($nodeVersion -replace 'v','').Split('.')[0]
    if ([int]$versionNumber -lt 18) {
        Write-Host "Node.js version is too old ($nodeVersion). Please upgrade to v18 or later." -ForegroundColor Red
        exit 1
    }
    Write-Host "Node.js $nodeVersion is installed" -ForegroundColor Green
    
    # Check npm
    $npmVersion = npm -v
    Write-Host "NPM $npmVersion is installed" -ForegroundColor Green
}

# Check if MySQL is installed
$mysqlInstalled = $false
try {
    # Try to check if MySQL is available
    Get-Command mysql -ErrorAction Stop | Out-Null
    $mysqlInstalled = $true
    Write-Host "MySQL is installed" -ForegroundColor Green
} catch {
    Write-Host "MySQL is not installed." -ForegroundColor Red
    Write-Host "Please install MySQL 8.0 or later manually:" -ForegroundColor Yellow
    Write-Host "- Download from: https://dev.mysql.com/downloads/installer/" -ForegroundColor Cyan
    Write-Host "- Or use winget: winget install -e --id Oracle.MySQL" -ForegroundColor Cyan
    Write-Host "- Or use Chocolatey: choco install mysql -y" -ForegroundColor Cyan
    Write-Host "After installation, make sure MySQL service is running." -ForegroundColor Yellow
    
    $response = Read-Host "Continue setup without MySQL? (y/n)"
    if ($response -ne "y") {
        exit 1
    }
}

# Create .env file for backend
$backendEnv = @"
# Database Configuration
DATABASE_URL="mysql://root:123@localhost:3306/vendr"

# Authentication
JWT_SECRET="bj9XzE2KLp8n5fTVAuC7ymRHGd3qP6ZwDsQ4vWxMcJ"
SESSION_TIMEOUT="86400"

# Encryption Keys
ENCRYPTION_KEY="4f2d1a8c6b9e3f7d0a5c2b8e9f6d3a7c4b1e8f5d2a9c6"
MESSAGE_ENCRYPTION_KEY="pK8aVz3bL9dQ7rF2gH5tY6uJ4sM1xN0cW8vB7nP9mD3eR5tG6yU2jK4sL7fH9dA"
PRODUCT_ENCRYPTION_KEY="J7dS9fH2kL5mP3qR8tV6wY1zB4xC0nM2vA5bD8eF6gH3jK9"

# Email OTP Configuration
EMAIL_USER="vendr.admn@gmail.com"
EMAIL_APP_PASSWORD="hrhi ykob xyvj mpco"
APP_NAME="Vendr"

# Other Environment Variables
PORT=3000

# Twilio Configuration
TWILIO_ACCOUNT_SID="AC65eec9ded00fec1597b00bd1a103d960"
TWILIO_AUTH_TOKEN="7b302c0403f87ce373e5255029855428"
TWILIO_PHONE_NUMBER="+19207728959"
"@

# Frontend .env file
$frontendEnv = @"
VITE_API_URL=https://localhost:3000
"@

# Setup Backend
Write-Host "`nSetting up backend..." -ForegroundColor Cyan
Set-Location ..\backend
if (-not (Test-Path ".env")) {
    $backendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created backend .env file" -ForegroundColor Green
} else {
    Write-Host "Backend .env file already exists" -ForegroundColor Green
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install
# Install npm packages with @ symbols correctly
npm install multer@1.4.5-lts.1 bcrypt@5.1.1 compression@1.8.0 cookie-parser@1.4.7 cors@2.8.5 csurf@1.10.0 dotenv@16.4.5 express@4.18.3 express-rate-limit@7.5.0 firebase-admin@13.2.0 helmet@8.1.0 https@1.0.0 ioredis@5.6.0 jsonwebtoken@9.0.2 morgan@1.10.0 mysql2@3.9.2 nodemailer@6.10.0 prisma@5.10.2 rate-limit-redis@4.2.0 react-otp-input@3.1.1 sequelize@6.37.7 sequelize-typescript@2.1.6 socket.io@4.8.1 twilio@5.5.2 uuid@11.1.0 --save
npm install --save "@prisma/client@5.10.2"
npm install --save "@socket.io/admin-ui@0.5.1"
npm install --save "@types/bcrypt@5.0.2"
npm install --save "@types/cors@2.8.17"
npm install --save "@types/uuid@10.0.0"

# Install backend dev dependencies
npm install bcryptjs@3.0.2 mkcert@3.2.0 node-forge@1.3.1 nodemon@3.1.9 ts-node@10.9.2 typescript@5.8.2 --save-dev
npm install --save-dev "@types/bcryptjs@2.4.6"
npm install --save-dev "@types/compression@1.7.5"
npm install --save-dev "@types/cookie-parser@1.4.8"
npm install --save-dev "@types/csurf@1.11.5"
npm install --save-dev "@types/express@4.17.21"
npm install --save-dev "@types/jsonwebtoken@9.0.6"
npm install --save-dev "@types/morgan@1.9.9"
npm install --save-dev "@types/multer@1.4.12"
npm install --save-dev "@types/node@20.17.24"
npm install --save-dev "@types/nodemailer@6.4.17"
npm install --save-dev "@types/sequelize@4.28.20"

# Setup Prisma
Write-Host "Setting up Prisma ORM..." -ForegroundColor Cyan
npx prisma generate

# Run Prisma migrations if they exist
Write-Host "Running Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate deploy 
if (-not $?) {
    Write-Host "No migrations to run or database not accessible." -ForegroundColor Yellow
}

# Run Prisma seed to create admin user
Write-Host "Creating admin user..." -ForegroundColor Cyan
npx prisma db seed
if (-not $?) {
    Write-Host "Failed to seed database. Check MySQL connection." -ForegroundColor Yellow
}

# Create required directories
Write-Host "Creating required directories..." -ForegroundColor Cyan

# Create uploads directory and its subdirectories
if (-not (Test-Path "uploads")) {
    New-Item -Path "uploads" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\profile-pictures" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\posts" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\profiles" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\group-images" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\media" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\verification-documents" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\products" -ItemType Directory -Force | Out-Null
    Write-Host "Created uploads directories" -ForegroundColor Green
} else {
    # Make sure all subdirectories exist
    New-Item -Path "uploads\profile-pictures" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\posts" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\profiles" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\group-images" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\media" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\verification-documents" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\products" -ItemType Directory -Force | Out-Null
    Write-Host "Uploads directories already exist" -ForegroundColor Green
}

# Generate SSL certificates
if (-not (Test-Path "certificates")) {
    New-Item -Path "certificates" -ItemType Directory -Force | Out-Null
    
    # Check if OpenSSL is available or use the npm module as fallback
    $openSSLAvailable = $false
    try {
        Get-Command openssl -ErrorAction Stop | Out-Null
        $openSSLAvailable = $true
    } catch {
        # OpenSSL not available
    }
    
    if ($openSSLAvailable) {
        Write-Host "Generating self-signed SSL certificates using OpenSSL..." -ForegroundColor Cyan
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certificates\key.pem -out certificates\cert.pem -subj "/CN=localhost" 2>$null
        Write-Host "Generated SSL certificates" -ForegroundColor Green
    } else {
        Write-Host "OpenSSL not found. Using npm module mkcert to generate certificates..." -ForegroundColor Yellow
        npx mkcert create localhost
        
        # Move the generated certificates to the certificates directory
        if (Test-Path "localhost.crt" -and Test-Path "localhost.key") {
            Move-Item -Path "localhost.key" -Destination "certificates\key.pem" -Force
            Move-Item -Path "localhost.crt" -Destination "certificates\cert.pem" -Force
            Write-Host "Generated SSL certificates" -ForegroundColor Green
        } else {
            Write-Host "Failed to generate SSL certificates. HTTPS might not work properly." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "SSL certificates directory already exists" -ForegroundColor Green
}

# Setup Frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Cyan
Set-Location ..\frontend

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    $frontendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created frontend .env file" -ForegroundColor Green
} else {
    Write-Host "Frontend .env file already exists" -ForegroundColor Green
}

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install
npm install axios@1.8.3 date-fns@4.1.0 framer-motion@12.4.10 lucide-react@0.475.0 mkcert@3.2.0 react@19.0.0 react-dom@19.0.0 react-hot-toast@2.5.2 react-icons@5.5.0 react-image-crop@11.0.7 react-otp-input@3.1.1 react-router-dom@7.3.0 --save
npm install --save "@emotion/react@11.14.0"
npm install --save "@emotion/styled@11.14.0"
npm install --save "@mui/icons-material@6.4.7"
npm install --save "@mui/material@6.4.7"
npm install --save "@tailwindcss/vite@4.0.12"

# Install frontend dev dependencies
npm install autoprefixer@10.4.20 eslint@9.19.0 eslint-plugin-react-hooks@5.0.0 eslint-plugin-react-refresh@0.4.18 globals@15.14.0 postcss@8.5.3 tailwind-scrollbar@4.0.1 tailwindcss@4.0.12 typescript@5.7.2 typescript-eslint@8.22.0 vite@6.1.0 --save-dev
npm install --save-dev "@eslint/js@9.19.0"
npm install --save-dev "@tailwindcss/forms@0.5.10"
npm install --save-dev "@types/axios@0.9.36"
npm install --save-dev "@types/node@22.13.10"
npm install --save-dev "@types/react@19.0.11"
npm install --save-dev "@types/react-dom@19.0.4"
npm install --save-dev "@types/react-router-dom@5.3.3"
npm install --save-dev "@vitejs/plugin-react@4.3.4"

# Create required directories
Write-Host "Creating required frontend directories..." -ForegroundColor Cyan

# Make sure the ssl/ directory exists
if (-not (Test-Path "ssl")) {
    New-Item -Path "ssl" -ItemType Directory -Force | Out-Null
    Write-Host "Created frontend ssl directory" -ForegroundColor Green
} else {
    Write-Host "Frontend ssl directory already exists" -ForegroundColor Green
}

# Generate SSL certificates for frontend if not already present
if (-not (Test-Path "certificates")) {
    New-Item -Path "certificates" -ItemType Directory -Force | Out-Null
    
    # Check if OpenSSL is available or use the npm module as fallback
    $openSSLAvailable = $false
    try {
        Get-Command openssl -ErrorAction Stop | Out-Null
        $openSSLAvailable = $true
    } catch {
        # OpenSSL not available
    }
    
    if ($openSSLAvailable) {
        Write-Host "Generating self-signed SSL certificates for frontend using OpenSSL..." -ForegroundColor Cyan
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certificates\key.pem -out certificates\cert.pem -subj "/CN=localhost" 2>$null
        Write-Host "Generated SSL certificates for frontend" -ForegroundColor Green
    } else {
        Write-Host "OpenSSL not found. Using npm module mkcert to generate certificates..." -ForegroundColor Yellow
        npx mkcert create localhost
        
        # Move the generated certificates to the certificates directory
        if (Test-Path "localhost.crt" -and Test-Path "localhost.key") {
            Move-Item -Path "localhost.key" -Destination "certificates\key.pem" -Force
            Move-Item -Path "localhost.crt" -Destination "certificates\cert.pem" -Force
            Write-Host "Generated SSL certificates for frontend" -ForegroundColor Green
        } else {
            Write-Host "Failed to generate SSL certificates. HTTPS might not work properly." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Frontend SSL certificates already exist" -ForegroundColor Green
}

# Return to setup directory
Set-Location ..\setup

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "Vendr setup completed successfully!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "Before running the application:" -ForegroundColor Yellow
Write-Host "1. Make sure MySQL server is running" -ForegroundColor Yellow
Write-Host "2. Create a database named 'vendr' if it doesn't exist:" -ForegroundColor Yellow
Write-Host "   mysql -u root -p -e 'CREATE DATABASE IF NOT EXISTS vendr;'" -ForegroundColor Cyan
Write-Host "3. Run the database migrations: cd backend && npx prisma migrate dev" -ForegroundColor Yellow
Write-Host "`nTo start the application:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor Yellow
Write-Host "2. Start frontend: cd frontend && npm run dev" -ForegroundColor Yellow
Write-Host "3. Or use the start-servers.bat script in the server_scripts directory" -ForegroundColor Yellow