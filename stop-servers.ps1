# Kill processes on specific ports (3000 for backend, 5173 for frontend)
$ports = @(3000, 5173)
foreach ($port in $ports) {
    Write-Host "Stopping processes on port $port..."
    $processIds = netstat -ano | findstr ":$port" | ForEach-Object { ($_ -split '\s+')[5] } | Sort-Object -Unique
    foreach ($processId in $processIds) {
        if ($processId -match '^\d+$') {
            Write-Host "Killing process on port $port (PID: $processId)"
            taskkill /F /PID $processId 2>$null
        }
    }
}

# Kill any remaining node processes (optional, but helps clean up any stuck processes)
Write-Host "Cleaning up any remaining node processes..."
taskkill /F /IM node.exe 2>$null
taskkill /F /IM nodemon.exe 2>$null

Write-Host "All servers stopped successfully!" 