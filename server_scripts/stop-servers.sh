#!/bin/bash

echo "Stopping Vendr Social Media App..."

# Navigate to the project root directory
cd "$(dirname "$0")/.."

# Kill processes on ports 3000 and 5173
echo "Stopping backend server..."
kill $(lsof -t -i:3000) 2>/dev/null || echo "No process found on port 3000"

echo "Stopping frontend server..."
kill $(lsof -t -i:5173) 2>/dev/null || echo "No process found on port 5173"

# Clean up any remaining node processes
echo "Cleaning up remaining processes..."
pkill node 2>/dev/null || echo "No node processes found"
pkill nodemon 2>/dev/null || echo "No nodemon processes found"

echo ""
echo "All servers stopped successfully!"
echo "" 