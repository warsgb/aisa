#!/bin/bash
# AISA Start Script - Start both frontend and backend
# This script starts all services from the project root

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Support environment variable override
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
FRONTEND_DIR="$PROJECT_DIR"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "🚀 AISA Project Startup"
echo "=========================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    local service_name=$2

    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo "⚠️  Port $port is already in use by $service_name (PID: $pid)"
            return 1
        fi
    fi
    return 0
}

# Check backend port
echo "1️⃣  Checking backend port 3001..."
if check_port 3001 "Backend"; then
    echo "🛑 Stopping existing backend..."
    cd "$BACKEND_DIR" && ./stop-backend.sh
    sleep 2
fi

# Check frontend port
echo "2️⃣  Checking frontend port 5173..."
if check_port 5173 "Frontend"; then
    echo "🛑 Stopping existing frontend..."
    pkill -f "vite.*5173" 2>/dev/null || true
    sleep 2
fi

# Start Backend
echo ""
echo "🔧 Starting Backend..."
cd "$BACKEND_DIR"
if [ -d "dist" ]; then
    echo "✅ Dist folder exists"
else
    echo "📦 Building backend first..."
    npm run build --silent
fi

# Create logs directory if not exists
mkdir -p logs

# Start backend with logging
NODE_ENV=production node --enable-source-maps "$BACKEND_DIR/dist/src/main" 2>&1 | tee logs/backend.log &

BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
sleep 1

# Start Frontend
echo ""
echo "🎨 Starting Frontend..."
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
fi

# Start frontend dev server
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

echo "✅ Frontend started (PID: $FRONTEND_PID)"
sleep 1

# Show status
echo ""
echo "=========================="
echo "✅ All Services Started!"
echo ""
echo "📊 Services Status:"
echo "  • Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo "  • Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "📋 Backend logs:  $BACKEND_DIR/logs/backend.log"
echo "💡 To view logs: tail -f $BACKEND_DIR/logs/backend.log"
echo ""
echo "🛑 To stop all services:"
echo "  cd $PROJECT_DIR && ./stop-all.sh"
echo "  Or: npm run stop"
echo ""
