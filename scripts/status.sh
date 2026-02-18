#!/bin/bash

# AISA 服务状态检查脚本

echo "📊 AISA 服务状态"
echo "================"

# 检查后端
BACKEND_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$BACKEND_PID" ]; then
    echo "✅ 后端: 运行中 (PID: $BACKEND_PID)"
    echo "   http://69.5.7.242:3001"
else
    echo "❌ 后端: 未运行"
fi

# 检查前端
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || true)
if [ -n "$FRONTEND_PID" ]; then
    echo "✅ 前端: 运行中 (PID: $FRONTEND_PID)"
    echo "   http://69.5.7.242:5173"
else
    echo "❌ 前端: 未运行"
fi

echo ""
