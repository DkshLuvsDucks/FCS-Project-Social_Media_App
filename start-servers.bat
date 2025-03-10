@echo off
echo Starting Vendr Social Media App...

:: Kill any existing processes on ports 3000 and 5173
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

:: Clean up any existing node processes
taskkill /F /IM node.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

:: Wait for ports to be cleared
timeout /t 2 /nobreak >nul

:: Start backend server
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

:: Wait for backend to be ready
echo Waiting for backend to start...
:wait_backend
timeout /t 1 /nobreak >nul
netstat -an | find ":3000" >nul
if errorlevel 1 goto wait_backend
echo Backend is ready!

:: Start frontend server
echo Starting frontend server...
start "Frontend Server" cmd /k "cd client && npm run dev"

:: Wait for frontend to be ready
echo Waiting for frontend to start...
:wait_frontend
timeout /t 1 /nobreak >nul
netstat -an | find ":5173" >nul
if errorlevel 1 goto wait_frontend
echo Frontend is ready!

echo.
echo Servers started successfully!
echo Backend running on https://localhost:3000
echo Frontend running on https://localhost:5173
echo.
echo Opening frontend in your default browser...
start https://localhost:5173
echo.
echo Press Ctrl+C in each window to stop the servers
echo.
pause 