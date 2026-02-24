#!/bin/bash
# AISA 项目一键部署脚本
# 使���方法: ./deploy.sh [选项]
# 选项:
#   --skip-deps    跳过依赖安装
#   --skip-build   跳过构建
#   --dev          开发模式
#   --help         显示帮助

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 显示帮助
show_help() {
    cat << EOF
AISA 项目一键部署脚本

使用方法:
    ./deploy.sh [选项]

选项:
    --skip-deps    跳过依赖安装
    --skip-build   跳过构建步骤
    --dev          开发模式 (NODE_ENV=development)
    --no-start     配置完成后不启动服务
    --help         显示此帮助信息

示例:
    ./deploy.sh                    # 完整部署
    ./deploy.sh --skip-deps        # 跳过���赖安装
    ./deploy.sh --dev              # 开发模式部署

EOF
}

# 解析参数
SKIP_DEPS=false
SKIP_BUILD=false
DEV_MODE=false
NO_START=false

for arg in "$@"; do
    case $arg in
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --no-start)
            NO_START=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知参数: $arg"
            show_help
            exit 1
            ;;
    esac
done

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log_info "项目根目录: $PROJECT_ROOT"

# 检查必要的命令
check_dependencies() {
    log_info "检查系统依赖..."

    local missing_deps=()

    for cmd in node npm git psql; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少必要的依赖: ${missing_deps[*]}"
        log_info "请先安装缺少的依赖:"
        echo "  Ubuntu/Debian: sudo apt install -y nodejs npm postgresql git"
        echo "  CentOS/RHEL:   sudo yum install -y nodejs npm postgresql git"
        echo "  macOS:         brew install node postgresql@16 git"
        exit 1
    fi

    # 检查 Node.js 版本
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js 版本过低 (需要 >= 18.0)"
        log_info "当前版本: $(node -v)"
        exit 1
    fi

    log_success "系统依赖检查通过"
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."

    # 加载后端环境变量
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        log_error "后端配置文件不存在: backend/.env"
        log_info "请先复制 backend/.env.example 到 backend/.env 并配置"
        exit 1
    fi

    source "$PROJECT_ROOT/backend/.env"

    # 测试数据库连接
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -c "SELECT 1;" &> /dev/null; then
        log_warning "数据库连接失败或数据库不存在"
        log_info "请确保:"
        echo "  1. PostgreSQL 服务已启动"
        echo "  2. 数据库 '$DB_DATABASE' 已创建"
        echo "  3. 用户 '$DB_USERNAME' 已创建并有权限"
        echo ""
        log_info "创建数据库和用户:"
        echo "  sudo -u postgres psql"
        echo "  CREATE USER $DB_USERNAME WITH PASSWORD 'your_password';"
        echo "  CREATE DATABASE $DB_DATABASE OWNER $DB_USERNAME;"
        echo "  GRANT ALL PRIVILEGES ON DATABASE $DB_DATABASE TO $DB_USERNAME;"
        echo "  \\q"
        exit 1
    fi

    log_success "数据库连接正常"
}

# 安装依赖
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log_warning "跳过依赖安装"
        return
    fi

    log_info "安装项目依赖..."

    # 安装前端依赖
    log_info "安装前端依赖..."
    npm install --production=false

    # 安装后端依赖
    log_info "安装后端依赖..."
    cd "$PROJECT_ROOT/backend"
    npm install --production=false
    cd "$PROJECT_ROOT"

    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "跳过构建步骤"
        return
    fi

    log_info "构建项目..."

    # 构建后端
    log_info "构建后端..."
    cd "$PROJECT_ROOT/backend"
    npm run build

    if [ ! -d "dist" ]; then
        log_error "后端构建失败: dist 目录不存在"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    log_success "项目构建完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."

    mkdir -p "$PROJECT_ROOT/backend/uploads"
    mkdir -p "$PROJECT_ROOT/backend/logs"

    chmod -R 755 "$PROJECT_ROOT/backend/uploads"
    chmod -R 755 "$PROJECT_ROOT/backend/logs"

    log_success "目录创建完成"
}

# 检查配置
check_config() {
    log_info "检查配置文件..."

    # 检查前端配置
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_warning "前端配置文件不存在"
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_info "从 .env.example 创建 .env.local"
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env.local"
            log_warning "请编辑 .env.local 并配置正确的服务器地址"
        fi
    fi

    # 检查后端配置
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        log_error "后端配置文件不存在: backend/.env"
        log_info "请先复制 backend/.env.example 到 backend/.env 并配置"
        exit 1
    fi

    # 检查关键配置项
    source "$PROJECT_ROOT/backend/.env"

    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_jwt_secret_key_generate_with_openssl" ]; then
        log_error "JWT_SECRET 未配置或使用默认值"
        log_info "请运行 ./scripts/generate-secrets.sh 生成安全密钥"
        exit 1
    fi

    if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "your_secure_password_here" ]; then
        log_error "数据库密码未配置或使用默认值"
        exit 1
    fi

    if [ -z "$ZHIPU_API_KEY" ] || [ "$ZHIPU_API_KEY" = "your_zhipu_api_key_here" ]; then
        log_error "智谱AI API Key 未配置"
        log_info "请从 https://open.bigmodel.cn/ 获取 API Key"
        exit 1
    fi

    log_success "配置检查通过"
}

# 启动服务
start_services() {
    if [ "$NO_START" = true ]; then
        log_warning "跳过服务启动"
        return
    fi

    log_info "启动服务..."

    # 检查是否使用 PM2
    if command -v pm2 &> /dev/null; then
        log_info "使用 PM2 启动服务..."

        # 停止旧进程
        pm2 stop aisa-backend 2>/dev/null || true
        pm2 delete aisa-backend 2>/dev/null || true

        # 启动后端
        cd "$PROJECT_ROOT/backend"
        pm2 start dist/main.js --name aisa-backend

        # 启动前端 (可选)
        if [ "$DEV_MODE" = true ]; then
            pm2 stop aisa-frontend 2>/dev/null || true
            pm2 delete aisa-frontend 2>/dev/null || true
            cd "$PROJECT_ROOT"
            pm2 start "npm run dev" --name aisa-frontend
        fi

        pm2 save

        log_success "服务启动成功 (PM2)"
        pm2 status
    else
        log_info "使用项目脚本启动服务..."
        cd "$PROJECT_ROOT"
        chmod +x start-all.sh stop-all.sh status.sh
        ./start-all.sh

        log_success "服务启动成功"
        ./status.sh
    fi
}

# 显示访问信息
show_access_info() {
    log_success "========================================"
    log_success "       AISA 部署完成!"
    log_success "========================================"
    echo ""
    log_info "服务访问地址:"

    # 尝试获取服务器IP
    local server_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$server_ip" ]; then
        server_ip="your-server-ip"
    fi

    echo "  前端: http://$server_ip:5173"
    echo "  后端: http://$server_ip:3001"
    echo "  健康检查: http://$server_ip:3001/health"
    echo ""
    log_info "常用命令:"
    echo "  查看状态: ./status.sh"
    echo "  停止服务: ./stop-all.sh"
    echo "  启动服务: ./start-all.sh"
    if command -v pm2 &> /dev/null; then
        echo "  PM2 状态: pm2 status"
        echo "  PM2 日志: pm2 logs aisa-backend"
    fi
    echo ""
    log_warning "请确保防火墙已开放相应端口"
    echo ""
}

# 主流程
main() {
    echo ""
    log_info "========================================="
    log_info "       AISA 项目部署脚本"
    log_info "========================================="
    echo ""

    check_dependencies
    check_config
    check_database
    create_directories
    install_dependencies
    build_project
    start_services
    show_access_info

    log_success "部署完成!"
}

# 运行主流程
main
