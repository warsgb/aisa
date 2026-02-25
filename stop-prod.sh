#!/bin/bash
# AISA Production Stop Script
# 生产环境停止脚本

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

echo "🛑 Stopping AISA Production Services"
echo "======================================"
echo ""

# Function to kill process by PID file
kill_from_pid_file() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if [ -n "$pid" ]; then
            # 检查进程是否还在运行
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "🛑 Stopping $service_name (PID: $pid)..."
                kill "$pid" 2>/dev/null || true
                sleep 1

                # 如果还在运行，强制杀死
                if ps -p "$pid" > /dev/null 2>&1; then
                    echo "⚠️  Force killing $service_name..."
                    kill -9 "$pid" 2>/dev/null || true
                fi
            else
                echo "ℹ️  $service_name (PID: $pid) not running"
            fi
        fi
        rm -f "$pid_file"
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Function to kill process by port
kill_by_port() {
    local port=$1
    local service_name=$2

    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo "🛑 Stopping $service_name on port $port (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1

            # 如果还在运行，强制杀死
            if lsof -ti :$port >/dev/null 2>&1; then
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    elif command -v ss >/dev/null 2>&1; then
        local pid_info=$(ss -tlnp 2>/dev/null | grep ":$port " | head -1)
        if [ -n "$pid_info" ]; then
            local pid=$(echo "$pid_info" | awk '{print $5}' | cut -d',' -f2 | cut -d'=' -f2)
            if [ -n "$pid" ]; then
                echo "🛑 Stopping $service_name on port $port (PID: $pid)..."
                kill "$pid" 2>/dev/null || true
                sleep 1
            fi
        fi
    fi
}

# 1. 停止后端
echo "1️⃣ Stopping Backend..."
kill_from_pid_file "$BACKEND_DIR/.backend.pid" "Backend"
# 额外检查端口
kill_by_port 3001 "Backend"

# 2. 停止前端
echo ""
echo "2️⃣ Stopping Frontend..."
kill_from_pid_file "$FRONTEND_DIR/.frontend.pid" "Frontend"
# 额外检查端口
kill_by_port 5180 "Frontend"

# 额外清理 vite 相关进程
echo ""
echo "3️⃣ Cleaning up vite processes..."
pkill -f "vite preview" 2>/dev/null || true
pkill -f "vite.*5180" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true

# 4. 验证所有服务已停止
echo ""
echo "4️⃣ Verifying services stopped..."
sleep 1

if check_port 3001 >/dev/null 2>&1; then
    echo "⚠️  Warning: Port 3001 still in use"
else
    echo "✅ Backend port 3001 is free"
fi

if check_port 5180 >/dev/null 2>&1 || check_port 5173 >/dev/null 2>&1; then
    echo "⚠️  Warning: Frontend port still in use"
else
    echo "✅ Frontend ports are free"
fi

echo ""
echo "======================================"
echo "✅ All services stopped!"
echo ""
