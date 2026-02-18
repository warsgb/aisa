#!/bin/bash
# AISA Status Check
set -e

PROJECT_DIR="/home/presales/aisa"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "📊 AISA Project Status"
echo "=========================="
echo ""

echo "🔧 Backend (Port 3001):"
if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -ti :3001 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "  \033[32m✅ Running\033[0m (PID: $PID)"
    else
        echo -e "  \033[31m⏹ Stopped\033[0m"
    fi
fi
echo ""

echo "🎨 Frontend (Port 5173):"
if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -ti :5173 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "  \033[32m✅ Running\033[0m (PID: $PID)"
    else
        echo -e "  \033[31m⏹ Stopped\033[0m"
    fi
fi
echo ""

echo "=========================="
echo ""
echo "Available commands:"
echo "  npm run start-all      Start all services"
echo "  npm run stop-all       Stop all services"
echo "  npm run status        Show this status"
echo ""
