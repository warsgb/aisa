#!/bin/bash
# AISA Stop Script - Stop both frontend and backend
# This script stops all services from the project root

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Support environment variable override
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
FRONTEND_DIR="$PROJECT_DIR"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "🛑 AISA Project Shutdown"
echo "======================"
echo ""

# Count processes before
BEFORE_BACKEND=$(ps aux | grep "dist/src/main" | grep -v grep | wc -l)
BEFORE_FRONTEND=$(ps aux | grep "vite.*5173" | grep -v grep | wc -l)

echo "📊 Processes before stop:"
echo "  • Backend: $BEFORE_BACKEND processes"
echo "  • Frontend: $BEFORE_FRONTEND processes"
echo ""

# Stop Backend
echo "1️⃣  Stopping Backend..."
cd "$BACKEND_DIR"
if [ -f "stop-backend.sh" ]; then
    ./stop-backend.sh
else
    echo "ℹ️  Backend stop script not found, killing by port..."
    lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
    sleep 2
    ps aux | grep "[d]ist/src/main" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
fi

# Stop Frontend
echo ""
echo "2️⃣  Stopping Frontend..."
pkill -f "vite.*5173" 2>/dev/null || true

# Wait for processes to die
sleep 2

# Count processes after
AFTER_BACKEND=$(ps aux | grep "dist/src/main" | grep -v grep | wc -l)
AFTER_FRONTEND=$(ps aux | grep "vite.*5173" | grep -v grep | wc -l)

echo ""
echo "📊 Processes after stop:"
echo "  • Backend: $AFTER_BACKEND processes"
echo "  • Frontend: $AFTER_FRONTEND processes"
echo ""

# Verify ports released
if command -v lsof >/dev/null 2>&1; then
    BACKEND_PORT=$(lsof -ti :3001 2>/dev/null || true)
    FRONTEND_PORT=$(lsof -ti :5173 2>/dev/null || true)

    if [ -n "$BACKEND_PORT" ] || [ -n "$FRONTEND_PORT" ]; then
        echo "⚠️  Warning: Some ports still in use:"
        [ -n "$BACKEND_PORT" ] && echo "  • Backend port 3001 (PID: $BACKEND_PORT)"
        [ -n "$FRONTEND_PORT" ] && echo "  • Frontend port 5173 (PID: $FRONTEND_PORT)"
        echo ""
        echo "💀 Force killing remaining processes..."
        lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
        lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
        sleep 1
        echo "✅ All processes stopped"
    else
        echo "✅ All services stopped successfully"
    fi
else
    echo "⚠️  lsof command not available, cannot verify ports"
fi
echo ""
echo "======================"
