#!/bin/bash

# AISA 全栈系统启动脚本

echo "🚀 启动 AISA 服务..."

# 停止现有进程
echo "🛑 停止现有进程..."
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "nest start" 2>/dev/null || true
sleep 2

# 启动后端
echo "📦 启动后端服务..."
cd /home/presales/aisa/backend
nohup npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
echo "⏳ 等待后端启动..."
for i in {1..15}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ 后端已启动"
        break
    fi
    sleep 1
done

# 启动前端
echo "🎨 启动前端服务..."
cd /home/presales/aisa
nohup npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端 PID: $FRONTEND_PID"

# 等待前端启动
echo "⏳ 等待前端启动..."
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ 前端已启动"
        break
    fi
    sleep 1
done

echo ""
echo "🎉 AISA 服务已启动!"
echo "📡 后端: http://69.5.7.242:3001"
echo "🌐 前端: http://69.5.7.242:5173"
echo ""
echo "日志查看:"
echo "  后端: tail -f /tmp/backend.log"
echo "  前端: tail -f /tmp/frontend.log"
