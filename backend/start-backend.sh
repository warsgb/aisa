#!/bin/bash
# Start Backend Script
# Stops any existing backend processes before starting

set -e

# Get the parent directory of this script (backend directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$SCRIPT_DIR}"
PORT=3001

# Change to backend directory
cd "$BACKEND_DIR"

echo "🚀 Starting backend..."

# Check if port is already in use
if command -v lsof >/dev/null 2>&1; then
    EXISTING_PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$EXISTING_PID" ]; then
        echo "⚠️  Port $PORT is already in use (PID: $EXISTING_PID)"
        echo "🧹 Stopping existing backend first..."
        "$BACKEND_DIR/stop-backend.sh"
        echo "⏳ Waiting for port to be released..."
        sleep 2
    fi
fi

# Double-check no processes are running
COUNT=$(ps aux | grep "dist/src/main" | grep -v grep | wc -l)
if [ "$COUNT" -gt 0 ]; then
    echo "⚠️  Found $COUNT existing backend processes"
    echo "🧹 Cleaning up..."
    "$BACKEND_DIR/stop-backend.sh"
fi

# Always build to ensure src changes are reflected
echo "📦 Building backend..."
npm run build

# Create logs directory
mkdir -p "$BACKEND_DIR/logs"

# Start backend directly with node (avoiding nest wrapper)
# This reduces process chain from 4 to 1
echo "▶️  Starting backend with node..."
echo "📋 Logs will be saved to: $BACKEND_DIR/logs/backend.log"

NODE_ENV=production node --enable-source-maps "$BACKEND_DIR/dist/src/main" 2>&1 | tee "$BACKEND_DIR/logs/backend.log" &

# Save the PID
BACKEND_PID=$!
echo "📍 Backend started with PID: $BACKEND_PID"
echo "$BACKEND_PID" > "$BACKEND_DIR/.backend.pid"

# Wait a moment for startup
sleep 2

# Check if process is still running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running (PID: $BACKEND_PID)"
    echo "🌐 Server: http://0.0.0.0:$PORT"
    echo ""
    echo "💡 To view logs: tail -f $BACKEND_DIR/logs/backend.log"
    echo "💡 To stop backend: npm run stop"
else
    echo "❌ Backend failed to start"
    exit 1
fi
