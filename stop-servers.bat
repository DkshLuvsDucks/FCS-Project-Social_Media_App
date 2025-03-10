@echo off
echo Stopping Vendr Social Media App...

:: Kill processes on ports 3000 and 5173
echo Stopping backend server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Stopping frontend server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

:: Clean up any remaining node processes
echo Cleaning up remaining processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM nodemon.exe 2>nul

echo.
echo All servers stopped successfully!
echo.
pause 