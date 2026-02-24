# AISA 项目服务器部署指南

## 📋 部署前准备

### 服务器要求

- **操作系统**: Linux (Ubuntu 20.04+/CentOS 8+) 或 macOS
- **Node.js**: 18.0.0 或更高版本
- **PostgreSQL**: 14.0 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间
- **网络**: 开放 3001 (后端API), 5173 (前端开发服务器, 生产环境可选)

### 必需的账号和服务

- [ ] 服务器 root 或 sudo 权限
- [ ] Git 仓库访问权限 (git@github.com:warsgb/aisa.git)
- [ ] 智谱AI API Key (从 https://open.bigmodel.cn/ 获取)

---

## 🚀 快速部署步骤

### 1. 服务器环境准备

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib git curl

# CentOS/RHEL
sudo yum install -y nodejs npm postgresql-server postgresql-contrib git curl

# macOS (开发环境)
brew install node postgresql@16 git curl
```

**验证安装**:
```bash
node --version   # 应该 >= 18.0.0
npm --version
psql --version   # 应该 >= 14.0
git --version
```

### 2. 克隆代码仓库

```bash
# 创建项目目录
sudo mkdir -p /opt/aisa
sudo chown $USER:$USER /opt/aisa

# 克隆代码
cd /opt
git clone git@github.com:warsgb/aisa.git aisa
cd /opt/aisa

# 检查代码结构
ls -la
```

### 3. 生成安全密钥

```bash
cd /opt/aisa
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

**保存输出的密钥**, 后续配置需要使用!

### 4. 配置数据库

```bash
# 启动 PostgreSQL 服务
# macOS
brew services start postgresql@16

# Linux (systemd)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
```

在 PostgreSQL 命令行中执行:
```sql
-- 创建用户 (请修改密码!)
CREATE USER aisa_user WITH PASSWORD 'your_secure_password_here';

-- 创建数据库
CREATE DATABASE aisa_db OWNER aisa_user;

-- 授权
GRANT ALL PRIVILEGES ON DATABASE aisa_db TO aisa_user;

-- 退出
\q
```

### 5. 配置环境变量

#### 5.1 前端配置

```bash
cd /opt/aisa
cp .env.example .env.local
vim .env.local  # 或使用 nano
```

**编辑内容** (将 localhost 改为实际服务器地址):
```bash
# 后端 API URL
VITE_API_URL=http://your-server-ip:3001

# WebSocket URL
VITE_WS_URL=http://your-server-ip:3001
```

#### 5.2 后端配置

```bash
cd /opt/aisa/backend
cp .env.example .env
vim .env
```

**必须修改的配置项**:

```bash
# ==================== 必须修改 ====================

# 运行模式
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aisa_user
DB_PASSWORD=your_secure_password_here    # 修改为步骤4设置的密码
DB_DATABASE=aisa_db

# JWT 密钥 (使用步骤3生成的密钥)
JWT_SECRET=generated_jwt_secret_here
JWT_REFRESH_SECRET=generated_refresh_secret_here

# 智谱AI API Key (从 https://open.bigmodel.cn/ 获取)
ZHIPU_API_KEY=your_zhipu_api_key_here

# CORS 配置
CORS_ORIGIN=http://your-server-ip:5173   # 修改为实际服务器IP

# ==================== 可选配置 ====================

# 端口 (默认 3001)
PORT=3001

# AI 提供商 (zhipu/anthropic/openai)
AI_PROVIDER=zhipu

# 智谱AI 模型
ZHIPU_MODEL=glm-4.7

# 文件上传目录
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### 6. 安装依赖

```bash
cd /opt/aisa

# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install

# 返回项目根目录
cd ..
```

### 7. 构建项目

```bash
# 构建后端
cd /opt/aisa/backend
npm run build

# 验证构建结果
ls -la dist/

# 返回项目根目录
cd ..
```

### 8. 创建必要目录

```bash
# 创建上传文件目录
mkdir -p /opt/aisa/backend/uploads

# 创建日志目录
mkdir -p /opt/aisa/backend/logs

# 设置权限
chmod -R 755 /opt/aisa/backend/uploads
chmod -R 755 /opt/aisa/backend/logs
```

### 9. 启动服务

#### 方式一: 使用项目脚本 (推荐开发环境)

```bash
cd /opt/aisa
chmod +x start-all.sh stop-all.sh status.sh
./start-all.sh

# 检查状态
./status.sh
```

#### 方式二: 使用 PM2 (推荐生产环境)

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd /opt/aisa/backend
pm2 start dist/main.js --name aisa-backend

# 启动前端 (如果需要独立运行)
cd /opt/aisa
pm2 start "npm run dev" --name aisa-frontend

# 保存 PM2 配置
pm2 save
pm2 startup  # 按照提示执行输出的命令
```

### 10. 验证部署

```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 检查前端 (如果在服务器上直接访问)
curl http://localhost:5173

# 查看日志
tail -f /opt/aisa/backend/logs/backend.log

# 如果使用 PM2
pm2 status
pm2 logs aisa-backend
```

---

## 🔧 防火墙配置

### Ubuntu (UFW)

```bash
# 开放必要端口
sudo ufw allow 3001/tcp  # 后端 API
sudo ufw allow 5173/tcp  # 前端 (如果需要外部访问)
sudo ufw allow 22/tcp    # SSH

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### CentOS (firewalld)

```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=22/tcp

# 重载防火墙
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

---

## 🌐 Nginx 反向代理配置 (可选, 生产环境推荐)

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 配置文件

创建配置文件 `/etc/nginx/sites-available/aisa`:

```nginx
# AISA 应用配置
server {
    listen 80;
    server_name your-domain.com;  # 修改为实际域名或IP

    # 客户端最大请求体大小
    client_max_body_size 10M;

    # 前端代理
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 超时设置
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/aisa /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 配置 HTTPS (使用 Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书并自动配置
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 📝 验证测试清单

部署完成后, 请按以下步骤验证:

- [ ] PostgreSQL 服务正常运行
- [ ] 数据库 `aisa_db` 创建成功
- [ ] 后端服务启动 (访问 http://localhost:3001/health)
- [ ] 前端服务启动 (访问 http://localhost:5173)
- [ ] 可以注册新用户
- [ ] 可以登录系统
- [ ] 技能列表正常加载
- [ ] 技能执行正常 (WebSocket 流式输出)
- [ ] 文件上传功能正常
- [ ] 团队管理功能正常

---

## 🐛 常见问题排查

### 问题 1: 端口被占用

```bash
# 查找占用端口的进程
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### 问题 2: 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接配置
cat /opt/aisa/backend/.env | grep DB_

# 测试数据库连接
psql -h localhost -U aisa_user -d aisa_db
```

### 问题 3: JWT 错误

```bash
# 重新生成密钥
cd /opt/aisa
./scripts/generate-secrets.sh

# 更新 backend/.env 文件
vim backend/.env
```

### 问题 4: AI 调用失败

```bash
# 检查 API Key 配置
cat /opt/aisa/backend/.env | grep ZHIPU

# 查看 AI 调用日志
tail -f /opt/aisa/backend/logs/backend.log | grep -i "ai\|error"
```

### 问题 5: 前端无法连接后端

```bash
# 检查 CORS 配置
cat /opt/aisa/backend/.env | grep CORS

# 检查前端 API URL 配置
cat /opt/aisa/.env.local | grep VITE_API_URL

# 确保两个配置一致
```

### 问题 6: PM2 进程异常

```bash
# 查看进程状态
pm2 status

# 查看详细日志
pm2 logs aisa-backend --lines 100

# 重启进程
pm2 restart aisa-backend

# 删除并重新启动
pm2 delete aisa-backend
pm2 start dist/main.js --name aisa-backend
pm2 save
```

---

## 🔄 更新部署

当有新代码需要部署时:

```bash
cd /opt/aisa

# 1. 拉取最新代码
git pull origin master

# 2. 安装新依赖 (如果有)
npm install
cd backend && npm install && cd ..

# 3. 重新构建后端
cd backend
npm run build
cd ..

# 4. 重启服务
# 使用 PM2
pm2 restart aisa-backend

# 或使用脚本
./stop-all.sh
./start-all.sh
```

---

## 📞 获取帮助

如遇到问题:

1. 查看日志文件: `/opt/aisa/backend/logs/backend.log`
2. 检查配置文件: `backend/.env` 和 `.env.local`
3. 查看项目文档: `README.md`, `CLAUDE.md`
4. GitHub Issues: https://github.com/warsgb/aisa/issues

---

## 🔒 安全建议

1. **定期更新系统和依赖**
   ```bash
   sudo apt update && sudo apt upgrade
   npm audit fix
   ```

2. **配置防火墙, 只开放必要端口**

3. **使用强密码**
   - 数据库密码
   - JWT 密钥
   - 服务器登录密码

4. **定期备份数据库**
   ```bash
   # 备份数据库
   pg_dump -U aisa_user aisa_db > backup_$(date +%Y%m%d).sql

   # 恢复数据库
   psql -U aisa_user aisa_db < backup_20250224.sql
   ```

5. **配置 SSL/TLS** (生产环境必须)

6. **限制数据库访问**
   ```sql
   -- 在 PostgreSQL 中
   -- 修改 pg_hba.conf 只允许本地连接
   -- 或使用 VPN/SSH 隧道
   ```

---

**部署完成! 🎉**

访问: http://your-server-ip:5173 (或配置的域名)
