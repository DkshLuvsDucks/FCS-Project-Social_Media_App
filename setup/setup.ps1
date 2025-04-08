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
DATABASE_URL="mysql://root:password@localhost:3306/vendr"

# Authentication
JWT_SECRET="your-secret-key-here"
SESSION_TIMEOUT="3600"

# Encryption Keys
ENCRYPTION_KEY="32_byte_random_hex_string_please_change_in_production"
MESSAGE_ENCRYPTION_KEY="your-encryption-key-here-make-it-long-and-random"
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

# Setup Prisma
Write-Host "Setting up Prisma ORM..." -ForegroundColor Cyan
npx prisma generate

# Run Prisma seed to create admin user
Write-Host "Creating admin user..." -ForegroundColor Cyan
npx prisma db seed

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
    Write-Host "Created uploads directories" -ForegroundColor Green
} else {
    # Make sure all subdirectories exist
    New-Item -Path "uploads\profile-pictures" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\posts" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\profiles" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\group-images" -ItemType Directory -Force | Out-Null
    New-Item -Path "uploads\media" -ItemType Directory -Force | Out-Null
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
        npm install -g mkcert
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

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

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
        npm install -g mkcert
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
Write-Host "2. Verify the database credentials in backend\.env" -ForegroundColor Yellow
Write-Host "3. Run the database migrations if needed: cd backend && npx prisma migrate dev" -ForegroundColor Yellow
Write-Host "`nTo start the application:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor Yellow
Write-Host "2. Start frontend: cd frontend && npm run dev" -ForegroundColor Yellow
Write-Host "3. Or use the start-servers.bat script in the root directory" -ForegroundColor Yellow