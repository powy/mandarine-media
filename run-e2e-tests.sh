#!/bin/bash

echo "🚀 Kyool Media End-to-End Test Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "packages/share" ]; then
    print_error "Please run this script from the kyool-media root directory"
    exit 1
fi

print_status "Preparing environment..."

# Step 1: Build the shared package
print_status "Building shared package..."
cd packages/share
if npm run build; then
    print_success "Shared package built successfully"
else
    print_error "Failed to build shared package"
    exit 1
fi
cd ../..

# Step 2: Check if admin user exists in backend
print_status "Checking backend setup..."
cd backend

# Check if admin user script exists
if [ ! -f "scripts/create_admin.py" ]; then
    print_error "Admin creation script not found"
    exit 1
fi

# Step 3: Start backend server if not running
print_status "Checking if backend server is running..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend server is already running"
else
    print_status "Starting backend server..."
    if [ -f "start_server.sh" ]; then
        chmod +x start_server.sh
        ./start_server.sh &
        SERVER_PID=$!
        
        # Wait for server to start
        print_status "Waiting for server to be ready..."
        for i in {1..30}; do
            if curl -s http://localhost:8000/health > /dev/null 2>&1; then
                print_success "Server is ready!"
                break
            fi
            echo -n "."
            sleep 2
        done
        
        if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_error "Server failed to start within timeout"
            exit 1
        fi
    else
        print_error "start_server.sh not found in backend directory"
        exit 1
    fi
fi

# Step 4: Create admin user if it doesn't exist
print_status "Ensuring admin user exists..."
if python3 scripts/create_admin.py; then
    print_success "Admin user ready"
else
    print_warning "Admin user creation script ran (user may already exist)"
fi

cd ..

# Step 5: Run the end-to-end tests
print_status "Running end-to-end tests..."
echo ""

if node e2e-test.js; then
    echo ""
    print_success "End-to-end tests completed successfully!"
    echo ""
    echo "✅ Integration Verified:"
    echo "   • Backend server is running correctly"
    echo "   • Shared package is working with live API"
    echo "   • Authentication flow is functional"
    echo "   • All major API endpoints are accessible"
    echo "   • Error handling is working properly"
    echo ""
    echo "🎉 The system is ready for production use!"
else
    echo ""
    print_error "End-to-end tests failed!"
    echo ""
    echo "❌ Issues detected in integration:"
    echo "   • Check server logs for backend issues"
    echo "   • Verify shared package build"
    echo "   • Check database connectivity"
    echo "   • Review API endpoint compatibility"
    echo ""
    echo "🔍 Debug steps:"
    echo "   1. Check server health: curl http://localhost:8000/health"
    echo "   2. View server logs: docker compose -f backend/docker-compose.dev.yml logs"
    echo "   3. Test API manually: curl http://localhost:8000/docs"
    echo ""
    exit 1
fi