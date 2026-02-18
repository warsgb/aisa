#!/bin/bash
# Stop Backend Script
# Properly kills ALL backend-related processes

set -e

PORT=3001
# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$SCRIPT_DIR}"

echo "🛑 Stopping backend on port $PORT..."

# Count processes before
BEFORE_COUNT=$(ps aux | grep -E "(nest|backend.*main|dist/main)" | grep -v grep | wc -l)
echo "Found $BEFORE_COUNT backend-related processes"

# Method 1: Kill by port (most reliable - kills the final node process)
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "📍 Killing processes on port $PORT: $PIDS"
        echo "$PIDS" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
fi

# Method 2: Kill all processes in the chain (very thorough)
echo "🔍 Searching for nest-related processes..."

# Kill nest CLI wrapper
ps aux | grep "[n]est start" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Kill nest node processes
ps aux | grep "[n]ode.*nest" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Kill shell wrappers executing node
ps aux | grep "[s]h.*node.*dist/main" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Kill the actual node application
ps aux | grep "[n]ode.*dist/main" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Kill any node process with backend in args
ps aux | grep "[n]ode.*backend" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Wait for processes to die
sleep 2

# Count processes after
AFTER_COUNT=$(ps aux | grep -E "(nest|backend.*main|dist/main)" | grep -v grep | wc -l)

# Verify and report
REMAINING=$(ps aux | grep -E "(nest|backend.*main|dist/main)" | grep -v grep || true)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Warning: $AFTER_COUNT processes still remain:"
    echo "$REMAINING"
    echo "💀 Force killing all remaining..."
    echo "$REMAINING" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
    sleep 1
fi

# Final port check
if lsof -ti :$PORT >/dev/null 2>&1; then
    echo "❌ Failed to stop backend on port $PORT"
    echo "Processes still using port $PORT:"
    lsof -i :$PORT
    exit 1
else
    FINAL_COUNT=$(ps aux | grep -E "(nest|backend.*main|dist/main)" | grep -v grep | wc -l)
    echo "✅ Backend stopped successfully"
    echo "📊 Processes: $BEFORE_COUNT → $FINAL_COUNT"
fi
