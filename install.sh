#!/bin/bash
#
# AISA 一键安装脚本
# 用于在全新的 Linux 服务器上自动部署 AISA 项目
#
# 使用方法:
#   curl -sSL https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
#   或
#   wget -qO- https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
#
# 环境变量（可选）:
#   AISA_REPO          - 仓库地址 (默认: https://github.com/warsgb/aisa.git)
#   AISA_BRANCH        - 分支名称 (默认: master)
#   AISA_DIR           - 安装目录 (默认: /opt/aisa)
#   DB_PASSWORD        - 数据库密码 (默认: 随机生成)
#   ZHIPU_API_KEY      - 智谱AI API Key (必需，会提示输入)
#   SERVER_IP          - 服务器IP (默认: 自动检测)
#   SKIP_PM2           - 跳过PM2安装 (默认: false)
#

set -e

# ============================================
# 调试模式
# ============================================
DEBUG="${DEBUG:-false}"
if [ "$DEBUG" = "true" ]; then
    set -x
    log_info "调试模式已启用"
fi

# ============================================
# 配置变量
# ============================================
AISA_REPO="${AISA_REPO:-https://github.com/warsgb/aisa.git}"
AISA_BRANCH="${AISA_BRANCH:-master}"
AISA_DIR="${AISA_DIR:-/opt/aisa}"
DB_PASSWORD="${DB_PASSWORD:-}"
SERVER_IP="${SERVER_IP:-}"
SKIP_PM2="${SKIP_PM2:-false}"

# 数据库配置
DB_NAME="aisa_db"
DB_USER="aisa_user"
DB_PORT=5432

# 服务端口
BACKEND_PORT=3001
FRONTEND_PORT=5173

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================
# 工具函数
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}${BOLD}$1${NC}"
    echo "=================================="
}

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        OS="centos"
        OS_VERSION=$(rpm -q \*release | grep -E "el|centos" | head -1)
    else
        log_error "无法检测操作系统类型"
        exit 1
    fi

    log_info "检测到操作系统: $OS $OS_VERSION"
}

# 检测系统架构
detect_arch() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            NODE_ARCH="x64"
            ;;
        aarch64)
            NODE_ARCH="arm64"
            ;;
        armv7l)
            NODE_ARCH="armv7l"
            ;;
        *)
            log_error "不支持的系统架构: $ARCH"
            exit 1
            ;;
    esac
    log_info "系统架构: $ARCH"
}

# 获取服务器IP
get_server_ip() {
    if [ -n "$SERVER_IP" ]; then
        echo "$SERVER_IP"
        return
    fi

    # 尝试多种方式获取IP
    local ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$ip" ]; then
        ip=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    fi
    if [ -z "$ip" ]; then
        ip=$(ifconfig 2>/dev/null | grep -E "inet [0-9]" | awk '{print $2}' | head -1)
    fi
    if [ -z "$ip" ]; then
        ip="your-server-ip"
    fi

    echo "$ip"
}

# 生成随机密码
generate_password() {
    openssl rand -base64 16 | tr -d "=+/" | cut -c1-16
}

# ============================================
# 安装系统依赖
# ============================================
install_system_dependencies() {
    log_step "1. 安装系统依赖"

    detect_os
    detect_arch

    case $OS in
        ubuntu|debian)
            log_info "更新软件包列表..."
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq

            log_info "安装基础软件包..."
            apt-get install -y -qq curl wget git build-essential

            # 安装 Node.js 20.x
            log_info "安装 Node.js 20.x..."
            if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
                apt-get install -y -qq nodejs
            else
                log_info "Node.js 已安装: $(node -v)"
            fi

            # 安装 PostgreSQL
            log_info "安装 PostgreSQL..."
            if ! command -v psql &> /dev/null; then
                apt-get install -y -qq postgresql postgresql-contrib
                systemctl enable postgresql
                systemctl start postgresql
            else
                log_info "PostgreSQL 已安装"
            fi
            ;;

        centos|rhel|rocky|almalinux)
            log_info "更新软件包列表..."
            yum update -y -q

            log_info "安装基础软件包..."
            yum install -y -q curl wget git gcc-c++ make

            # 安装 Node.js 20.x
            log_info "安装 Node.js 20.x..."
            if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
                curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
                yum install -y -q nodejs
            else
                log_info "Node.js 已安装: $(node -v)"
            fi

            # 安装 PostgreSQL
            log_info "安装 PostgreSQL..."
            if ! command -v psql &> /dev/null; then
                yum install -y -q postgresql postgresql-server postgresql-contrib
                # 初始化数据库（CentOS）
                if ! [ -d /var/lib/pgsql/data ]; then
                    postgresql-setup initdb
                fi
                systemctl enable postgresql
                systemctl start postgresql
            else
                log_info "PostgreSQL 已安装"
            fi
            ;;

        *)
            log_error "不支持的操作系统: $OS"
            log_info "请手动安装: Node.js 18+, PostgreSQL, Git"
            exit 1
            ;;
    esac

    # 验证安装
    log_info "验证安装..."
    node -v
    npm -v
    psql --version

    log_success "系统依赖安装完成"
}

# ============================================
# 安装 PM2
# ============================================
install_pm2() {
    if [ "$SKIP_PM2" = "true" ]; then
        log_warning "跳过 PM2 安装"
        return
    fi

    log_step "2. 安装 PM2 进程管理器"

    if ! command -v pm2 &> /dev/null; then
        log_info "全局安装 PM2..."
        npm install -g pm2

        # 设置 PM2 开机自启
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            pm2 startup systemd -u root --hp /root 2>/dev/null || true
        fi

        log_success "PM2 安装完成"
    else
        log_info "PM2 已安装: $(pm2 -v)"
    fi
}

# ============================================
# 克隆代码仓库
# ============================================
clone_repository() {
    log_step "3. 克隆代码仓库"

    # 如果目录已存在，先备份
    if [ -d "$AISA_DIR" ]; then
        local backup_dir="${AISA_DIR}.backup.$(date +%Y%m%d%H%M%S)"
        log_warning "目录 $AISA_DIR 已存在，备份到 $backup_dir"
        mv "$AISA_DIR" "$backup_dir"
    fi

    log_info "克隆仓库: $AISA_REPO (分支: $AISA_BRANCH)"
    git clone --depth 1 --branch "$AISA_BRANCH" "$AISA_REPO" "$AISA_DIR"

    cd "$AISA_DIR"
    log_success "代码克隆完成"
    log_info "当前目录: $AISA_DIR"
}

# ============================================
# 配置数据库
# ============================================
configure_database() {
    log_step "4. 配置数据库"

    # 生成数据库密码
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(generate_password)
        log_info "已生成随机数据库密码"
    fi

    log_info "数据库配置:"
    echo "  数据库名: $DB_NAME"
    echo "  用户名: $DB_USER"
    echo "  密码: $DB_PASSWORD"
    echo "  端口: $DB_PORT"

    # 创建数据库和用户
    log_info "创建数据库和用户..."

    # 检测 PostgreSQL 连接方式
    local PG_CMD=""
    if [ "$OS" = "darwin" ]; then
        # macOS: 使用当前用户（通常是 Homebrew 安装）
        PG_CMD="psql"
    else
        # Linux: 使用 postgres 用户
        PG_CMD="sudo -u postgres psql"
    fi

    # 检查数据库连接
    if ! $PG_CMD -c "SELECT 1;" &> /dev/null; then
        log_error "无法连接到 PostgreSQL"
        log_info "请确保 PostgreSQL 服务已启动"
        exit 1
    fi

    # 先创建用户（如果不存在）
    log_info "创建数据库用户..."
    $PG_CMD -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD'; END IF; END \$\$;" 2>/dev/null || {
        log_warning "用户可能已存在，继续..."
    }

    # 创建数据库（如果不存在）
    log_info "创建数据库..."
    $PG_CMD -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || {
        log_warning "数据库可能已存在，继续..."
    }

    # 授予权限
    log_info "配置数据库权限..."
    $PG_CMD -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

    # 连接到数据库并授予 schema 权限
    log_info "配置 schema 权限..."
    $PG_CMD -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
    $PG_CMD -d "$DB_NAME" -c "ALTER SCHEMA public OWNER TO $DB_USER;" 2>/dev/null || true

    log_success "数据库配置完成"
}

# ============================================
# 生成安全密钥
# ============================================
generate_secrets() {
    log_step "5. 生成安全密钥"

    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)

    log_info "已生成安全的 JWT 密钥"
}

# ============================================
# 获取用户输入
# ============================================
get_user_input() {
    log_step "6. 获取配置信息"

    # 检查是否在交互模式 (stdin 是否为终端)
    if [ ! -t 0 ]; then
        log_warning "检测到非交互模式（通过管道运行）"
        log_info "请使用以下方式之一提供配置："
        echo "  1. 设置环境变量: export ZHIPU_API_KEY=your_key"
        echo "  2. 下载后直接运行: wget install.sh && chmod +x install.sh && sudo ./install.sh"
        echo ""

        # 验证必需的环境变量
        if [ -z "$ZHIPU_API_KEY" ] || [ "$ZHIPU_API_KEY" = "your_zhipu_api_key_here" ]; then
            log_error "ZHIPU_API_KEY 环境变量未设置"
            log_info "请先设置: export ZHIPU_API_KEY=your_key"
            exit 1
        fi

        # 使用环境变量
        SERVER_IP="${SERVER_IP:-$(get_server_ip)}"

        log_info "使用环境变量配置"
        log_info "配置摘要:"
        echo "  智谱AI API Key: ${ZHIPU_API_KEY:0:8}..."
        echo "  服务器IP: $SERVER_IP"
        echo "  数据库密码: $DB_PASSWORD"
        echo ""
        return
    fi

    # 交互模式：提示用户输入
    log_info "检测到交互模式，将提示输入配置信息"

    # 获取智谱AI API Key
    echo ""
    if [ -n "$ZHIPU_API_KEY" ] && [ "$ZHIPU_API_KEY" != "your_zhipu_api_key_here" ]; then
        log_info "使用预设的 ZHIPU_API_KEY: ${ZHIPU_API_KEY:0:8}..."
        read -p "按回车使用预设值，或输入新的 API Key: " input_key
        if [ -n "$input_key" ]; then
            ZHIPU_API_KEY="$input_key"
        fi
    else
        while true; do
            read -p "请输入智谱AI API Key (从 https://open.bigmodel.cn/ 获取): " ZHIPU_API_KEY
            if [ -n "$ZHIPU_API_KEY" ] && [ "$ZHIPU_API_KEY" != "your_zhipu_api_key_here" ]; then
                break
            fi
            log_error "API Key 不能为空"
        done
    fi

    # 确认服务器IP
    local detected_ip=$(get_server_ip)
    echo ""
    read -p "请输入服务器IP地址 [默认: $detected_ip]: " input_ip
    SERVER_IP="${input_ip:-$detected_ip}"

    echo ""
    log_info "配置摘要:"
    echo "  智谱AI API Key: ${ZHIPU_API_KEY:0:8}..."
    echo "  服务器IP: $SERVER_IP"
    echo "  数据库密码: $DB_PASSWORD"
    echo ""
}

# ============================================
# 创建配置文件
# ============================================
create_config_files() {
    log_step "7. 创建配置文件"

    cd "$AISA_DIR"

    # 创建后端 .env 文件
    log_info "创建后端配置文件..."
    cat > backend/.env <<EOF
# Application
NODE_ENV=production
PORT=$BACKEND_PORT

# Database
DB_HOST=localhost
DB_PORT=$DB_PORT
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# AI API Configuration
AI_PROVIDER=zhipu
ZHIPU_API_KEY=$ZHIPU_API_KEY
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
ZHIPU_MODEL=glm-4.7
ZHIPU_MAX_TOKENS=65536
ZHIPU_TEMPERATURE=0.7

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ORIGIN=http://$SERVER_IP:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT
CORS_ALLOW_ALL=false
EOF

    # 创建前端 .env.local 文件
    log_info "创建前端配置文件..."
    cat > .env.local <<EOF
# Frontend Environment Configuration
VITE_API_URL=http://$SERVER_IP:$BACKEND_PORT
VITE_WS_URL=http://$SERVER_IP:$BACKEND_PORT
EOF

    # 设置文件权限
    chmod 600 backend/.env
    chmod 600 .env.local

    log_success "配置文件创建完成"
}

# ============================================
# 安装项目依赖
# ============================================
install_project_dependencies() {
    log_step "8. 安装项目依赖"

    cd "$AISA_DIR"

    # 安装前端依赖
    log_info "安装前端依赖..."
    npm install --production=false --silent

    # 安装后端依赖
    log_info "安装后端依赖..."
    cd "$AISA_DIR/backend"
    npm install --production=false --silent

    cd "$AISA_DIR"

    log_success "项目依赖安装完成"
}

# ============================================
# 构建项目
# ============================================
build_project() {
    log_step "9. 构建项目"

    cd "$AISA_DIR"

    # 构建后端
    log_info "构建后端..."
    cd "$AISA_DIR/backend"
    npm run build --silent

    if [ ! -d "dist" ]; then
        log_error "后端构建失败: dist 目录不存在"
        exit 1
    fi

    # 创建必要目录
    mkdir -p "$AISA_DIR/backend/uploads"
    mkdir -p "$AISA_DIR/backend/logs"
    chmod -R 755 "$AISA_DIR/backend/uploads"
    chmod -R 755 "$AISA_DIR/backend/logs"

    cd "$AISA_DIR"

    log_success "项目构建完成"
}

# ============================================
# 配置 PM2
# ============================================
configure_pm2() {
    if [ "$SKIP_PM2" = "true" ]; then
        log_warning "跳过 PM2 配置"
        return
    fi

    log_step "10. 配置 PM2 进程管理"

    cd "$AISA_DIR"

    # 停止旧进程
    pm2 stop aisa-backend 2>/dev/null || true
    pm2 delete aisa-backend 2>/dev/null || true

    # 启动后端
    log_info "配置后端进程..."
    cd "$AISA_DIR/backend"

    # 检查构建产物位置
    if [ -f "dist/main.js" ]; then
        pm2 start dist/main.js --name aisa-backend
    elif [ -f "dist/src/main.js" ]; then
        pm2 start dist/src/main.js --name aisa-backend
    else
        log_error "找不到后端入口文件"
        exit 1
    fi

    # 保存 PM2 配置
    pm2 save

    log_success "PM2 配置完成"
}

# ============================================
# 启动服务
# ============================================
start_services() {
    log_step "11. 启动服务"

    cd "$AISA_DIR"

    if [ "$SKIP_PM2" = "true" ]; then
        log_info "使用项目脚本启动服务..."
        chmod +x start-all.sh stop-all.sh status.sh
        ./start-all.sh
    else
        # 后端已通过 PM2 启动，启动前端
        log_info "启动前端开发服务器..."

        # 创建前端启动脚本
        cat > "$AISA_DIR/start-frontend-dev.sh" <<'EOF'
#!/bin/bash
cd /opt/aisa
nohup npm run dev > /opt/aisa/frontend.log 2>&1 &
echo $! > /opt/aisa/.frontend.pid
EOF
        chmod +x "$AISA_DIR/start-frontend-dev.sh"

        # 启动前端
        "$AISA_DIR/start-frontend-dev.sh"
    fi

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5

    log_success "服务启动完成"
}

# ============================================
# 显示访问信息
# ============================================
show_access_info() {
    echo ""
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo -e "${GREEN}${BOLD}     AISA 安装完成!${NC}"
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo ""
    echo -e "${CYAN}${BOLD}🌐 访问地址:${NC}"
    echo "  前端:     ${BOLD}http://$SERVER_IP:$FRONTEND_PORT${NC}"
    echo "  后端API:  ${BOLD}http://$SERVER_IP:$BACKEND_PORT${NC}"
    echo "  健康检查: ${BOLD}http://$SERVER_IP:$BACKEND_PORT/health${NC}"
    echo ""
    echo -e "${CYAN}${BOLD}📋 重要信息:${NC}"
    echo "  数据库名:     $DB_NAME"
    echo "  数据库用户:   $DB_USER"
    echo "  数据库密码:   ${BOLD}$DB_PASSWORD${NC}"
    echo "  安装目录:     $AISA_DIR"
    echo ""
    echo -e "${CYAN}${BOLD}🔧 常用命令:${NC}"
    if [ "$SKIP_PM2" = "true" ]; then
        echo "  查看状态:   cd $AISA_DIR && ./status.sh"
        echo "  停止服务:   cd $AISA_DIR && ./stop-all.sh"
        echo "  启动服务:   cd $AISA_DIR && ./start-all.sh"
    else
        echo "  查看状态:   pm2 status"
        echo "  查看日志:   pm2 logs aisa-backend"
        echo "  停止服务:   pm2 stop aisa-backend"
        echo "  启动服务:   pm2 start aisa-backend"
        echo "  重启服务:   pm2 restart aisa-backend"
    fi
    echo ""
    echo -e "${CYAN}${BOLD}📖 后端日志:${NC}"
    echo "  tail -f $AISA_DIR/backend/logs/backend.log"
    echo ""
    echo -e "${YELLOW}⚠️  提示:${NC}"
    echo "  1. 请确保防火墙已开放端口 $BACKEND_PORT 和 $FRONTEND_PORT"
    echo "  2. 建议定期备份数据库"
    echo "  3. 生产环境建议配置 HTTPS"
    echo ""
}

# ============================================
# 主流程
# ============================================
main() {
    echo ""
    echo -e "${CYAN}${BOLD}========================================${NC}"
    echo -e "${CYAN}${BOLD}     AISA 一键安装脚本${NC}"
    echo -e "${CYAN}${BOLD}========================================${NC}"
    echo ""

    # 检查是否为 root 用户
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户或 sudo 运行此脚本"
        exit 1
    fi

    # 执行安装步骤
    install_system_dependencies
    install_pm2
    clone_repository
    configure_database
    generate_secrets
    get_user_input
    create_config_files
    install_project_dependencies
    build_project
    configure_pm2
    start_services
    show_access_info

    log_success "安装完成!"
}

# 运行主流程
main
