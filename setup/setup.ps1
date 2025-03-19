# Windows Setup Script
Write-Host "Setting up your project..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if MySQL is installed
if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Host "MySQL is not installed. Please install MySQL first." -ForegroundColor Red
    exit 1
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
Write-Host "Setting up backend..." -ForegroundColor Cyan
Set-Location ..\backend
if (-not (Test-Path ".env")) {
    $backendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created backend .env file" -ForegroundColor Green
}

npm install
npm run prisma:generate
npm run prisma:migrate

# Generate SSL certificates for backend
if (-not (Test-Path "certificates")) {
    mkdir certificates
    npm run generate-certificates
}

# Setup Frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Cyan
Set-Location ..\frontend
npm install

# Generate SSL certificates for frontend
if (-not (Test-Path "certificates")) {
    mkdir certificates
    npm run generate-certificates
}

Set-Location ..\setup

Write-Host "`nSetup completed successfully!" -ForegroundColor Green
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend && npm run dev" -ForegroundColor Yellow
Write-Host "2. Start frontend: cd frontend && npm run dev" -ForegroundColor Yellow