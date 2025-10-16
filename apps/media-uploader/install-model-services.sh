#!/bin/bash

echo "========================================"
echo "Installing Model Uploader Services..."
echo "========================================"
echo ""

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install from https://nodejs.org/"
    exit 1
fi

echo "Node.js version:"
node --version
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to service-server
echo "Installing Service-Server..."
cd "$SCRIPT_DIR/src/subtools/service-server"

# Create required directories
echo "Creating directories..."
mkdir -p data logs temp

# Initialize database
echo "Initializing database..."
node db/init-db.js
if [ $? -ne 0 ]; then
    echo "ERROR: Database initialization failed"
    exit 1
fi

echo "Service-Server setup complete!"
echo ""

# Navigate to service-interface
echo "Installing Service-Interface..."
cd "$SCRIPT_DIR/src/subtools/service-interface"

# Install dependencies
echo "Installing npm dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed"
    exit 1
fi

echo "Service-Interface setup complete!"
echo ""

# Make startup script executable
chmod +x "$SCRIPT_DIR/start-model-uploader.sh"

echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "To start the services, run:"
echo "  ./start-model-uploader.sh"
echo ""
echo "Or use individual commands:"
echo "  Service Server:    node src/subtools/service-server/server.js"
echo "  Service Interface: npm run dev (from service-interface folder)"
echo ""
