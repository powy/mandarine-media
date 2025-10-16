#!/bin/bash

echo "========================================"
echo "Starting Model Uploader Services..."
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install from https://nodejs.org/"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing instances
echo "Stopping existing services..."
pkill -f "node.*service-server/server.js" 2>/dev/null
pkill -f "vite.*service-interface" 2>/dev/null

# Navigate to service-server directory
cd "$SCRIPT_DIR/src/subtools/service-server"

# Start service-server in background
echo "Starting Service Server (Port 3011)..."
node server.js > /dev/null 2>&1 &
SERVER_PID=$!
echo "Service Server PID: $SERVER_PID"

# Wait for server
sleep 3

# Navigate to service-interface directory
cd "$SCRIPT_DIR/src/subtools/service-interface"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing service-interface dependencies..."
    npm install
fi

# Start service-interface in background
echo "Starting Service Interface (Port 3010)..."
npm run dev > /dev/null 2>&1 &
INTERFACE_PID=$!
echo "Service Interface PID: $INTERFACE_PID"

# Wait before opening browser
sleep 3

# Open browser (cross-platform)
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3010
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3010 2>/dev/null || echo "Please open http://localhost:3010 in your browser"
fi

echo ""
echo "========================================"
echo "Model Uploader Services Started!"
echo "========================================"
echo "Service Server API: http://localhost:3011 (PID: $SERVER_PID)"
echo "Service Interface:  http://localhost:3010 (PID: $INTERFACE_PID)"
echo "========================================"
echo ""
echo "To stop services, run:"
echo "  kill $SERVER_PID $INTERFACE_PID"
echo ""
echo "Or press Ctrl+C to stop both services"
echo ""

# Save PIDs to file for easy cleanup
echo "$SERVER_PID" > "$SCRIPT_DIR/.service-server.pid"
echo "$INTERFACE_PID" > "$SCRIPT_DIR/.service-interface.pid"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $SERVER_PID $INTERFACE_PID 2>/dev/null; rm -f '$SCRIPT_DIR/.service-server.pid' '$SCRIPT_DIR/.service-interface.pid'; exit" INT TERM

# Keep script running
wait
