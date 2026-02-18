#!/bin/bash

# AISA 全栈系统停止脚本

echo "🛑 停止 AISA 服务..."

# 查找并停止前端进程
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || true)
if [ -n "$FRONTEND_PID" ]; then
    kill -9 $FRONTEND_PID 2>/dev/null
    echo "✅ 前端进程已停止 (端口 5173)"
else
    pkill -9 -f "vite" 2>/dev/null || true
    echo "✅ 前端进程已停止"
fi

# 查找并停止后端进程
BACKEND_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$BACKEND_PID" ]; then
    kill -9 $BACKEND_PID 2>/dev/null
    echo "✅ 后端进程已停止 (端口 3001)"
else
    pkill -9 -f "nest start" 2>/dev/null || true
    echo "✅ 后端进程已停止"
fi

echo ""
echo "👋 AISA 服务已全部停止"
