#!/bin/bash
# 前端启动脚本

set -e

FRONTEND_DIR="/home/presales/aisa"
LOG_FILE="/tmp/frontend.log"

echo "🚀 Starting Frontend..."
echo "=========================="

# 检查工作目录
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 清理旧的日志
mv "$LOG_FILE" "$LOG_FILE.old" 2>/dev/null || true

# 启动前端
echo "📋 Starting Vite dev server..."
nohup npm run dev > "$LOG_FILE" 2>&1 &

FRONTEND_PID=$!

# 等待启动
sleep 5

# 检查是否启动成功
if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "✅ Frontend started successfully!"
    echo "📍 PID: $FRONTEND_PID"
    echo "🌐 Local:   http://localhost:5173"
    echo "🌐 Network: http://172.31.0.2:5173"
    echo ""
    echo "📋 Logs: tail -f $LOG_FILE"
    echo ""
    echo "⏹  To stop: pkill -f 'vite.*5173'"
else
    echo "❌ Frontend failed to start!"
    echo "📋 Check logs: cat $LOG_FILE"
    exit 1
fi

echo "=========================="
