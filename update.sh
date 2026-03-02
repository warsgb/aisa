#!/bin/bash
# AISA 项目更新脚本
# 用于在已有服务器上更新到最新版本

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
log_info "项目根目录: $PROJECT_ROOT"
echo ""

# ============================================
# 步骤1: 备份当前版本
# ============================================
log_step "1. 备份当前版本"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份配置文件
cp "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/" 2>/dev/null || log_warning "未找到 backend/.env"
cp "$PROJECT_ROOT/.env.local" "$BACKUP_DIR/" 2>/dev/null || true

# 备份数据库（可选）
read -p "是否备份数据库？(y/N): " backup_db
if [ "$backup_db" = "y" ] || [ "$backup_db" = "Y" ]; then
    source "$PROJECT_ROOT/backend/.env"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USERNAME" "$DB_DATABASE" > "$BACKUP_DIR/database_backup.sql"
    log_success "数据库已备份到: $BACKUP_DIR/database_backup.sql"
fi

log_success "备份完成: $BACKUP_DIR"
echo ""

# ============================================
# 步骤2: 拉取最新代码
# ============================================
log_step "2. 拉取最新代码"
cd "$PROJECT_ROOT"

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    log_warning "工作区有未提交的更改"
    git status --short
    read -p "是否继续？(y/N): " continue_update
    if [ "$continue_update" != "y" ] && [ "$continue_update" != "Y" ]; then
        log_error "取消更��"
        exit 1
    fi
fi

# 拉取最新代码
log_info "执行 git pull..."
git pull origin master

log_success "代码更新完成"
echo ""

# ============================================
# 步骤3: 检查环境变量配置
# ============================================
log_step "3. 检查环境变量配置"
cd "$PROJECT_ROOT/backend"

# 检查新增的环境变量
if ! grep -q "BAIDU_API_KEY" .env; then
    log_warning "检测到新的配置项: BAIDU_API_KEY"
    log_info "如果需要使用搜索功能，请在 .env 中添加:"
    echo "BAIDU_API_KEY=your_baidu_api_key_here"
    echo "BAIDU_ENDPOINT=https://qianfan.baidubce.com"
    echo ""
    read -p "是否现在编辑 .env 文件？(y/N): " edit_env
    if [ "$edit_env" = "y" ] || [ "$edit_env" = "Y" ]; then
        ${EDITOR:-vi} .env
    fi
fi

log_success "环境变量检查完成"
echo ""

# ============================================
# 步骤4: 安装/更新依赖
# ============================================
log_step "4. 安装/更新依赖"

# 更新后端依赖
log_info "更新后端依赖..."
cd "$PROJECT_ROOT/backend"
npm install

# 更新前端依赖
log_info "更新前端依赖..."
cd "$PROJECT_ROOT"
npm install

log_success "依赖更新完成"
echo ""

# ============================================
# 步骤5: 运行数据库迁移
# ============================================
log_step "5. 运行数据库迁移"
cd "$PROJECT_ROOT/backend"

# 检查是否有新的迁移文件
log_info "检查数据库迁移..."
npm run migration:run || {
    log_warning "迁移命令失败，尝试手动执行..."
    node dist/scripts/migrate-search-v2.js || log_warning "迁移脚本执行失败，请检查日志"
}

log_success "数据库迁移完成"
echo ""

# ============================================
# 步骤6: 构建项目
# ============================================
log_step "6. 构建项目"

log_info "构建后端..."
cd "$PROJECT_ROOT/backend"
npm run build

log_info "构建前端..."
cd "$PROJECT_ROOT"
npm run build

log_success "项目构建完成"
echo ""

# ============================================
# 步骤7: 同步技能文件
# ============================================
log_step "7. 同步技能文件到数据库"
cd "$PROJECT_ROOT/backend"

log_info "检查技能同步..."
if [ -f "dist/scripts/check-skill-content.js" ]; then
    node dist/scripts/check-skill-content.js || log_warning "技能检查脚本执行失败"
else
    log_warning "未找到技能检查脚本"
fi

# 技能会在服务启动时自动同步
log_info "技能文件将在服务启动时自动同步"
echo ""

# ============================================
# 步骤8: 重启服务
# ============================================
log_step "8. 重启服务"

# 检查是否使用 PM2
if command -v pm2 &> /dev/null; then
    log_info "使用 PM2 重启服务..."
    
    # 重启后端
    pm2 restart aisa-backend || {
        pm2 stop aisa-backend 2>/dev/null || true
        pm2 delete aisa-backend 2>/dev/null || true
        cd "$PROJECT_ROOT/backend"
        pm2 start dist/main.js --name aisa-backend
    }
    
    log_success "PM2 服务重启完成"
    pm2 status
else
    log_info "使用项目脚本重启服务..."
    cd "$PROJECT_ROOT"
    
    # 停止服务
    ./stop-all.sh || true
    
    # 等待进程完全停止
    sleep 3
    
    # 启动服务
    ./start-all.sh
    
    log_success "服务重启完成"
    sleep 2
    ./status.sh
fi

echo ""

# ============================================
# 步骤9: 验证更新
# ============================================
log_step "9. 验证更新"

# 检查后端健康状态
log_info "检查后端服务..."
if curl -s http://localhost:3001/health > /dev/null; then
    log_success "后端服务正常"
else
    log_warning "后端服务可能未正常启动，请检查日志"
fi

# 检查搜索配置
log_info "检查声明式搜索配置..."
cd "$PROJECT_ROOT/backend"
if [ -f "check-search-configs.js" ]; then
    node check-search-configs.js || log_warning "搜索配置检查失败"
fi

echo ""

# ============================================
# 完成
# ============================================
log_success "========================================"
log_success "       AISA 更新完成!"
log_success "========================================"
echo ""
log_info "更新摘要:"
echo "  - 代码已更新到最新版本"
echo "  - 依赖已更新"
echo "  - 数据库已迁移"
echo "  - 服务已重启"
echo ""
log_info "备份位置: $BACKUP_DIR"
echo ""
log_info "常用命令:"
echo "  查看状态: ./status.sh"
echo "  查看日志: tail -f backend/logs/app.log"
echo "  PM2日志: pm2 logs aisa-backend"
echo ""

# 提示清理旧备份
log_info "旧备份清理提示:"
find "$PROJECT_ROOT/backups" -type d -mtime +7 -exec ls -ld {} \; 2>/dev/null || true
