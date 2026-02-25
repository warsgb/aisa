#!/bin/bash
# AISA Production Startup Script
# 生产环境启动脚本 - 自动检测代码变化并重新构建

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR"

# 端口配置
BACKEND_PORT=3001
FRONTEND_PORT=5180

# 构建标记文件（用于跟踪是否需要重新构建）
FRONTEND_BUILD_MARKER="$FRONTEND_DIR/.build-hash"
BACKEND_BUILD_MARKER="$BACKEND_DIR/.build-hash"

echo "🚀 AISA Production Startup"
echo "=================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti :$port 2>/dev/null || true
    elif command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $5}' | cut -d',' -f2 | cut -d'=' -f2 || true
    fi
}

# Function to get process by port
kill_port() {
    local port=$1
    local service_name=$2

    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill $pid 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if check_port $port >/dev/null; then
                kill -9 $pid 2>/dev/null || true
            fi
        fi
    fi
}

# Function to check if rebuild is needed
needs_rebuild() {
    local marker_file=$1
    local source_dir=$2
    local dist_dir=$3
    local name=$4

    # 如果 dist 目录不存在，需要构建
    if [ ! -d "$dist_dir" ]; then
        echo "📦 $name dist directory not found"
        return 0
    fi

    # 如果标记文件不存在，需要构建
    if [ ! -f "$marker_file" ]; then
        echo "📦 $name build marker not found"
        return 0
    fi

    # 检查源代码是否比构建产物新
    if [ "$name" = "Frontend" ]; then
        # 检查关键源文件
        local src_files=$(find "$source_dir/src" -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null | head -10)
        for src_file in $src_files; do
            if [ -f "$src_file" ]; then
                if [ "$src_file" -nt "$dist_dir" ]; then
                    echo "📦 $name source code is newer than build"
                    return 0
                fi
            fi
        done
        # 检查配置文件
        for config_file in "$source_dir/vite.config.ts" "$source_dir/package.json" "$source_dir/index.html"; do
            if [ -f "$config_file" ] && [ "$config_file" -nt "$dist_dir" ]; then
                echo "📦 $name config file is newer than build"
                return 0
            fi
        done
    elif [ "$name" = "Backend" ]; then
        # 检查后端源文件
        local src_files=$(find "$source_dir/src" -type f -name "*.ts" 2>/dev/null | head -10)
        for src_file in $src_files; do
            if [ -f "$src_file" ]; then
                if [ "$src_file" -nt "$dist_dir" ]; then
                    echo "📦 $name source code is newer than build"
                    return 0
                fi
            fi
        done
    fi

    return 1
}

# 1. 停止现有服务
echo "1️⃣ Checking existing services..."

BACKEND_PID=$(check_port $BACKEND_PORT)
FRONTEND_PID=$(check_port $FRONTEND_PORT)

if [ -n "$BACKEND_PID" ]; then
    kill_port $BACKEND_PORT "Backend"
fi

if [ -n "$FRONTEND_PID" ]; then
    kill_port $FRONTEND_PORT "Frontend"
fi

sleep 2

# 2. 检查并重新构建
echo ""
echo "2️⃣ Checking if rebuild is needed..."

# 检查后端
if needs_rebuild "$BACKEND_BUILD_MARKER" "$BACKEND_DIR" "$BACKEND_DIR/dist" "Backend"; then
    echo ""
    echo "🔨 Building Backend..."
    cd "$BACKEND_DIR"
    # Build with permission error tolerance (dist/scripts may be owned by root)
    npm run build 2>&1 | grep -v "EACCES\|permission denied" || true
    # Verify build success by checking main entry file
    if [ -f "dist/src/main.js" ] || [ -f "dist/main.js" ]; then
        # 更新标记文件
        find src -type f -name "*.ts" -exec touch {} \; 2>/dev/null || true
        touch "$BACKEND_BUILD_MARKER"
        echo "✅ Backend build complete"
    else
        echo "⚠️  Backend build had issues, using existing build"
    fi
else
    echo "✅ Backend build is up to date"
fi

# 检查前端
if needs_rebuild "$FRONTEND_BUILD_MARKER" "$FRONTEND_DIR" "$FRONTEND_DIR/dist" "Frontend"; then
    echo ""
    echo "🔨 Building Frontend..."
    cd "$FRONTEND_DIR"
    npm run build 2>&1 | tail -5
    # 更新标记文件
    find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec touch {} \; 2>/dev/null || true
    touch "$FRONTEND_BUILD_MARKER"
    echo "✅ Frontend build complete"
else
    echo "✅ Frontend build is up to date"
fi

echo ""
echo "✅ All build artifacts ready"

# 3. 创建日志目录
echo ""
echo "3️⃣ Preparing directories..."
mkdir -p "$BACKEND_DIR/logs"
mkdir -p "$FRONTEND_DIR/logs"

# 4. 启动后端
echo ""
echo "4️⃣ Starting Backend..."
cd "$BACKEND_DIR"

# 查找后端入口文件
BACKEND_ENTRY=""
if [ -f "dist/main.js" ]; then
    BACKEND_ENTRY="dist/main.js"
elif [ -f "dist/src/main.js" ]; then
    BACKEND_ENTRY="dist/src/main.js"
else
    echo "❌ Error: Cannot find backend entry file"
    exit 1
fi

# 启动后端（生产模式）
NODE_ENV=production nohup node "$BACKEND_ENTRY" > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID, Port: $BACKEND_PORT)"

sleep 2

# 验证后端启动
if ! check_port $BACKEND_PORT >/dev/null; then
    echo "❌ Backend failed to start. Check logs: $BACKEND_DIR/logs/backend.log"
    exit 1
fi

# 5. 启动前端（生产预览模式）
echo ""
echo "5️⃣ Starting Frontend..."
cd "$FRONTEND_DIR"

# 使用 vite preview 启动前端（生产构建的预览）
nohup npx vite preview --port $FRONTEND_PORT --host > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID, Port: $FRONTEND_PORT)"

sleep 2

# 验证前端启动
if ! check_port $FRONTEND_PORT >/dev/null; then
    echo "❌ Frontend failed to start. Check logs: $FRONTEND_DIR/logs/frontend.log"
    exit 1
fi

# 6. 保存 PID 到文件
echo ""
echo "6️⃣ Saving process IDs..."
echo "$BACKEND_PID" > "$BACKEND_DIR/.backend.pid"
echo "$FRONTEND_PID" > "$FRONTEND_DIR/.frontend.pid"
echo "✅ PIDs saved"

# 7. 显示状态
echo ""
echo "=================================="
echo "✅ Production Services Started!"
echo ""
echo "📊 Services Status:"
echo "  • Backend:  http://69.5.7.242:$BACKEND_PORT (PID: $BACKEND_PID)"
echo "  • Frontend: http://69.5.7.242:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo ""
echo "📋 Log Files:"
echo "  • Backend:  $BACKEND_DIR/logs/backend.log"
echo "  • Frontend: $FRONTEND_DIR/logs/frontend.log"
echo ""
echo "💡 View logs:"
echo "  tail -f $BACKEND_DIR/logs/backend.log"
echo "  tail -f $FRONTEND_DIR/logs/frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "  ./stop-prod.sh"
echo ""
