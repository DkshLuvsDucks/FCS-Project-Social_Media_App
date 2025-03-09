# Function to check if a port is in use
function Test-PortInUse {
    param($port)
    $connections = netstat -an | Select-String "TCP.*:$port.*LISTENING"
    return $connections.Count -gt 0
}

# Kill any existing processes on ports 3000 and 5173
$ports = @(3000, 5173)
foreach ($port in $ports) {
    $processIds = netstat -ano | findstr ":$port" | ForEach-Object { ($_ -split '\s+')[5] } | Sort-Object -Unique
    foreach ($processId in $processIds) {
        if ($processId -match '^\d+$') {
            Write-Host "Killing process on port $port (PID: $processId)"
            taskkill /F /PID $processId 2>$null
        }
    }
}

# Clean up any existing node processes
Write-Host "Cleaning up any existing node processes..."
taskkill /F /IM node.exe 2>$null
taskkill /F /IM nodemon.exe 2>$null

# Wait for ports to be cleared
Start-Sleep -Seconds 2

# Start backend server
Write-Host "Starting backend server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait for backend to be ready
$attempts = 0
$maxAttempts = 30
Write-Host "Waiting for backend to start..."
while (-not (Test-PortInUse 3000) -and $attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempts++
    Write-Host "Waiting for backend... ($attempts/$maxAttempts)"
}

if ($attempts -eq $maxAttempts) {
    Write-Host "Error: Backend failed to start within the timeout period"
    exit 1
}

Write-Host "Backend is ready!"

# Start frontend server
Write-Host "Starting frontend server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

# Wait for frontend to be ready
$attempts = 0
while (-not (Test-PortInUse 5173) -and $attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempts++
    Write-Host "Waiting for frontend... ($attempts/$maxAttempts)"
}

if ($attempts -eq $maxAttempts) {
    Write-Host "Error: Frontend failed to start within the timeout period"
    exit 1
}

Write-Host "Servers started successfully!"
Write-Host "Backend running on http://localhost:3000"
Write-Host "Frontend running on http://localhost:5173"
Write-Host "Press Ctrl+C to stop the servers" 