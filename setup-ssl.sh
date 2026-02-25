#!/bin/bash
# AISA SSL Certificate Setup Script (使用阿里云证书)
# SSL 证书配置脚本 - 使用已申请的阿里云证书

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔐 AISA SSL Certificate Setup (阿里云证书)"
echo "======================================"
echo ""

# 配置
DOMAIN="winai.top"
WWW_DOMAIN="www.winai.top"
SSL_DIR="/home/sslconf"
NGINX_CONF="/etc/nginx/sites-available/aisa"

# 证书文件
CERT_FILE="$SSL_DIR/www.winai.top.pem"
KEY_FILE="$SSL_DIR/www.winai.top.key"

# 检查是否有 root 权限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}错误: 此脚本需要 root 权限运行${NC}"
    echo "请使用: sudo $0"
    exit 1
fi

# 1. 检查证书文件是否存在
echo "1️⃣ 检查证书文件..."
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ 证书文件不存在: $CERT_FILE${NC}"
    exit 1
fi
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ 私钥文件不存在: $KEY_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 证书文件已找到${NC}"
echo "  证书: $CERT_FILE"
echo "  私钥: $KEY_FILE"
echo ""

# 2. 设置证书文件权限
echo "2️⃣ 设置证书权限..."
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"
echo -e "${GREEN}✅ 证书权限已设置${NC}"
echo ""

# 3. 备份当前 nginx 配置
echo "3️⃣ 备份 Nginx 配置..."
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ 配置已备份${NC}"
fi
echo ""

# 4. 创建 SSL nginx 配置
echo "4️⃣ 更新 Nginx 配置（添加 SSL 支持）..."
cat > "$NGINX_CONF" << 'NGINX_EOF'
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name winai.top www.winai.top;

    # 所有请求重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name winai.top www.winai.top;

    # SSL 证书配置 (阿里云证书)
    ssl_certificate /home/sslconf/www.winai.top.pem;
    ssl_certificate_key /home/sslconf/www.winai.top.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /home/sslconf/www.winai.top.pem;

    # 安全头部
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:5180;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket (通用)
    location /ws/ {
        proxy_pass http://127.0.0.1:3001/ws/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

echo -e "${GREEN}✅ Nginx 配置已更新${NC}"
echo ""

# 5. 测试 Nginx 配置
echo "5️⃣ 测试 Nginx 配置..."
if nginx -t; then
    echo -e "${GREEN}✅ Nginx 配置有效${NC}"
else
    echo -e "${RED}❌ Nginx 配置有误${NC}"
    echo "正在恢复备份..."
    if [ -f "$NGINX_CONF.backup"* ]; then
        cp $(ls -t $NGINX_CONF.backup.* | head -1) "$NGINX_CONF"
        echo "已恢复之前的配置"
    fi
    exit 1
fi
echo ""

# 6. 更新前端 .env 配置为 HTTPS
echo "6️⃣ 更新前端配置..."
ENV_FILE="/home/aisa/.env"
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

    cat > "$ENV_FILE" << 'ENV_EOF'
# 默认环境配置（提交到git作为示例）
# 本地开发请使用 .env.local 文件覆盖这些配置
# 服务器部署时使用域名访问 (HTTPS)
VITE_API_URL=https://winai.top/api
VITE_WS_URL=wss://winai.top
ENV_EOF

    echo -e "${GREEN}✅ 前端配置已更新为 HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  前端 .env 文件不存在${NC}"
fi
echo ""

# 7. 重载 Nginx
echo "7️⃣ 重载 Nginx..."
systemctl reload nginx
echo -e "${GREEN}✅ Nginx 已重载${NC}"
echo ""

# 8. 证书信息
echo "🔋 SSL 证书信息"
echo "---------------"
echo "  证书文件: $CERT_FILE"
openssl x509 -in "$CERT_FILE" -noout -subject -dates 2>/dev/null || echo "  无法读取证书详细信息"
echo ""

# 9. 测试 HTTPS 访问
echo "9️⃣ 测试 HTTPS 连接..."
if command -v curl >/dev/null 2>&1; then
    if curl -s -I https://localhost:443 2>/dev/null | head -1; then
        echo -e "${GREEN}✅ HTTPS 连接正常${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS 连接测试失败，请手动检查${NC}"
    fi
fi
echo ""

# 完成
echo "======================================"
echo -e "${GREEN}✅ SSL 配置完成！${NC}"
echo ""
echo "📋 配置信息:"
echo "  • HTTPS: https://winai.top"
echo "  • HTTP → HTTPS: 已启用"
echo "  • 证书: $CERT_FILE"
echo "  • 私钥: $KEY_FILE"
echo ""
echo "🔧 后续步骤:"
echo "  1. 重新构建前端:"
echo "     cd /home/aisa && npm run build"
echo ""
echo "  2. 重启前端服务:"
echo "     ./stop-prod.sh && ./start-prod.sh"
echo ""
echo "  3. 访问测试:"
echo "     https://winai.top"
echo ""
echo "📝 证书管理提醒:"
echo "  • 阿里云证书有效期通常为 1 年"
echo "  • 到期前需要在阿里云控制台重新申请"
echo "  • 更新证书后运行此脚本即可"
echo ""
