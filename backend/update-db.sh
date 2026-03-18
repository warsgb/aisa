#!/bin/bash
# AISA 数据库更新脚本
# 用于执行数据库结构变更

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT/backend"

# 加载环境变量
if [ -f .env ]; then
    source .env
else
    log_error "未找到 .env 文件"
    exit 1
fi

echo ""
log_info "========================================"
log_info "    AISA 数据库更新脚本"
log_info "========================================"
echo ""

# ============================================
# 检查并运行迁移
# ============================================

# 迁移1: 添加 api_token 字段
log_info "检查 api_token 字段..."
API_TOKEN_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='api_token';" 2>/dev/null || echo "0")

if [ "$API_TOKEN_EXISTS" -eq "0" ]; then
    log_info "执行迁移: 添加 api_token 字段..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" -f migrations/add-api-token-field.sql
    log_success "api_token 字段添加完成"
else
    log_info "api_token 字段已存在，跳过"
fi

echo ""
log_success "========================================"
log_success "    数据库更新完成!"
log_success "========================================"
echo ""
