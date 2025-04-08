#!/bin/bash

echo "Starting Vendr Social Media App..."

# Navigate to the project root directory
cd "$(dirname "$0")/.."

# Kill any existing processes on ports 3000 and 5173
echo "Cleaning up existing processes..."
kill $(lsof -t -i:3000) 2>/dev/null || true
kill $(lsof -t -i:5173) 2>/dev/null || true

# Clean up any existing node processes
pkill node 2>/dev/null || true
pkill nodemon 2>/dev/null || true

# Wait for ports to be cleared
sleep 2

# Start backend server in a new terminal
echo "Starting backend server..."
gnome-terminal --title="Backend Server" -- bash -c "cd backend && npm run dev; exec bash" 2>/dev/null || \
xterm -T "Backend Server" -e "cd backend && npm run dev; exec bash" 2>/dev/null || \
konsole --new-tab -p tabtitle="Backend Server" -e "cd backend && npm run dev; exec bash" 2>/dev/null || \
(cd backend && npm run dev &)

# Wait for backend to be ready
echo "Waiting for backend to start..."
while ! nc -z localhost 3000 2>/dev/null; do
  sleep 1
done
echo "Backend is ready!"

# Start frontend server in a new terminal
echo "Starting frontend server..."
gnome-terminal --title="Frontend Server" -- bash -c "cd frontend && npm run dev; exec bash" 2>/dev/null || \
xterm -T "Frontend Server" -e "cd frontend && npm run dev; exec bash" 2>/dev/null || \
konsole --new-tab -p tabtitle="Frontend Server" -e "cd frontend && npm run dev; exec bash" 2>/dev/null || \
(cd frontend && npm run dev &)

# Wait for frontend to be ready
echo "Waiting for frontend to start..."
while ! nc -z localhost 5173 2>/dev/null; do
  sleep 1
done
echo "Frontend is ready!"

echo ""
echo "Servers started successfully!"
echo "Backend running on https://localhost:3000"
echo "Frontend running on https://localhost:5173"
echo ""
echo "Opening frontend in your default browser..."

# Try different browser opener commands based on the system
xdg-open https://localhost:5173 2>/dev/null || \
open https://localhost:5173 2>/dev/null || \
sensible-browser https://localhost:5173 2>/dev/null || \
echo "Could not open browser automatically. Please open https://localhost:5173 in your browser."

echo ""
echo "Press Ctrl+C in each terminal window to stop the servers"
echo "Or run server_scripts/stop-servers.sh to stop all servers"
echo "" 