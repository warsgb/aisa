#!/bin/bash

# AISA 服务状态检查脚本

# Get API URLs from environment or use defaults
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo "📊 AISA 服务状态"
echo "================"

# 检查后端
BACKEND_PID=$(lsof -ti:3001 2>/dev/null || true)
if [ -n "$BACKEND_PID" ]; then
    echo "✅ 后端: 运行中 (PID: $BACKEND_PID)"
    echo "   $BACKEND_URL"
else
    echo "❌ 后端: 未运行"
fi

# 检查前端
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || true)
if [ -n "$FRONTEND_PID" ]; then
    echo "✅ 前端: 运行中 (PID: $FRONTEND_PID)"
    echo "   $FRONTEND_URL"
else
    echo "❌ 前端: 未运行"
fi

echo ""
