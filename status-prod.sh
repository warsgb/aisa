#!/bin/bash
# AISA Production Status Script
# 生产环境状态检查脚本

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

# 端口配置
BACKEND_PORT=3001
FRONTEND_PORT=5180

echo "📊 AISA Production Services Status"
echo "==================================="
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :$port 2>/dev/null || true
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " | head -1 || true
    fi
}

# Function to get process status
get_process_status() {
    local pid_file=$1
    local port=$2
    local service_name=$3

    local pid=""
    local status="⚫ Stopped"
    local color_reset="\033[0m"
    local color_red="\033[31m"
    local color_green="\033[32m"

    # 先检查 PID 文件
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
    fi

    # 检查端口
    local port_pid=$(check_port $port)

    if [ -n "$port_pid" ]; then
        pid=$port_pid
        status="${color_green}🟢 Running${color_reset}"
    else
        status="${color_red}⚫ Stopped${color_reset}"
    fi

    echo -e "$service_name: $status"
    if [ -n "$pid" ]; then
        echo "  PID: $pid"
    fi
    echo "  Port: $port"
    echo ""
}

# Function to get build info
get_build_info() {
    local dist_dir=$1
    local marker_file=$2
    local name=$3

    if [ ! -d "$dist_dir" ]; then
        echo "  ⚠️  Build directory not found"
        return
    fi

    # 获取最新修改时间
    local latest_file=$(find "$dist_dir" -type f -name "*.js" -o -name "*.css" 2>/dev/null | head -1)
    if [ -n "$latest_file" ]; then
        local build_time=$(stat -c %y "$latest_file" 2>/dev/null || stat -f "%Sm" "$latest_file" 2>/dev/null)
        echo "  Build Time: $build_time"
    fi

    # 获取目录大小
    local size=$(du -sh "$dist_dir" 2>/dev/null | cut -f1)
    echo "  Size: $size"
}

# Backend 状态
echo "1️⃣ Backend Service"
echo "-------------------"
get_process_status "$BACKEND_DIR/.backend.pid" $BACKEND_PORT "Backend"
echo "  Build Info:"
get_build_info "$BACKEND_DIR/dist" "$BACKEND_DIR/.build-hash" "Backend"
echo ""

# Frontend 状态
echo "2️⃣ Frontend Service"
echo "---------------------"
get_process_status "$FRONTEND_DIR/.frontend.pid" $FRONTEND_PORT "Frontend"
echo "  Build Info:"
get_build_info "$FRONTEND_DIR/dist" "$FRONTEND_DIR/.build-hash" "Frontend"
echo ""

# 服务访问地址
echo "3️⃣ Access URLs"
echo "---------------"
echo "  • Frontend: http://69.5.7.242:$FRONTEND_PORT"
echo "  • Backend:  http://69.5.7.242:$BACKEND_PORT"
echo "  • Health:   http://69.5.7.242:$BACKEND_PORT/health"
echo ""

# 健康检查
echo "4️⃣ Health Check"
echo "---------------"
if check_port $BACKEND_PORT >/dev/null 2>&1; then
    if command -v curl >/dev/null 2>&1; then
        health_response=$(curl -s http://localhost:$BACKEND_PORT/health 2>/dev/null || echo "Failed")
        if [ "$health_response" != "Failed" ]; then
            echo "  🟢 Backend API is responding"
        else
            echo "  🔴 Backend API not responding"
        fi
    else
        echo "  ℹ️  Install curl to check health"
    fi
else
    echo "  🔴 Backend is not running"
fi
echo ""

# 日志文件信息
echo "5️⃣ Log Files"
echo "------------"
if [ -f "$BACKEND_DIR/logs/backend.log" ]; then
    size=$(du -h "$BACKEND_DIR/logs/backend.log" 2>/dev/null | cut -f1)
    lines=$(wc -l < "$BACKEND_DIR/logs/backend.log" 2>/dev/null)
    echo "  • Backend:  $BACKEND_DIR/logs/backend.log"
    echo "    Size: $size, Lines: $lines"
fi
if [ -f "$FRONTEND_DIR/logs/frontend.log" ]; then
    size=$(du -h "$FRONTEND_DIR/logs/frontend.log" 2>/dev/null | cut -f1)
    lines=$(wc -l < "$FRONTEND_DIR/logs/frontend.log" 2>/dev/null)
    echo "  • Frontend: $FRONTEND_DIR/logs/frontend.log"
    echo "    Size: $size, Lines: $lines"
fi
echo ""

# 常用命令提示
echo "6️⃣ Useful Commands"
echo "------------------"
echo "  • View backend logs:  tail -f $BACKEND_DIR/logs/backend.log"
echo "  • View frontend logs: tail -f $FRONTEND_DIR/logs/frontend.log"
echo "  • Restart services:   ./stop-prod.sh && ./start-prod.sh"
echo "  • Stop services:      ./stop-prod.sh"
echo ""
