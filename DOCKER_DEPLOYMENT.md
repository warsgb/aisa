# AISA Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署 AISA 项目。

---

## 🐳 前置要求

### 安装 Docker

**Ubuntu/Debian**:
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin

# 将当前用户添加到 docker 组 (可选, 避免 sudo)
sudo usermod -aG docker $USER
newgrp docker
```

**CentOS/RHEL**:
```bash
# 安装 Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo yum install -y docker-compose-plugin
```

**macOS**:
```bash
# 下载并安装 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### 验证安装
```bash
docker --version
docker compose version
```

---

## 🚀 快速开始

### 1. 克隆代码

```bash
git clone git@github.com:warsgb/aisa.git
cd aisa
```

### 2. 配置环境变量

创建 `.env` 文件:
```bash
cat > .env << 'ENVEOF'
# ==================== 必须修改的配置 ====================

# JWT 密钥 (运行以下命令生成)
# openssl rand -base64 32
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here

# 智谱AI API Key (从 https://open.bigmodel.cn/ 获取)
ZHIPU_API_KEY=your_zhipu_api_key_here

# 数据库密码
POSTGRES_PASSWORD=your_secure_db_password_here

# CORS 配置
CORS_ORIGIN=http://localhost:5173

# 前端配置
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001

# ==================== 可选配置 ====================

# AI 提供商
AI_PROVIDER=zhipu

# 智谱AI 模型
ZHIPU_MODEL=glm-4.7
ENVEOF
```

### 3. 生成 JWT 密钥

```bash
# 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"

# 复制输出的密钥到 .env 文件
```

### 4. 启动服务

```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f

# 查看服务状态
docker compose ps
```

### 5. 初始化数据库

```bash
# 后端会自动初始化数据库表结构
# 查看后端日志确认初始化完成
docker compose logs backend
```

### 6. 访问应用

- 前端: http://localhost:5173
- 后端: http://localhost:3001
- 健康检查: http://localhost:3001/health

---

## 📋 Docker Compose 命令

### 基本操作

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f postgres

# 进入容器
docker compose exec backend sh
docker compose exec postgres sh
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 重新构建镜像
docker compose build

# 3. 重启服务
docker compose down
docker compose up -d

# 或使用 --force-recreate 强制重新创建容器
docker compose up -d --force-recreate
```

### 清理

```bash
# 停止并删除所有容器、网络
docker compose down

# 同时删除数据卷 (⚠️ 会删除数据库数据!)
docker compose down -v

# 清理未使用的镜像
docker image prune
```

---

## 🗄️ 数据库管理

### 备份数据库

```bash
# 备份到文件
docker compose exec postgres pg_dump -U aisa_user aisa_db > backup_$(date +%Y%m%d).sql

# 使用 Docker 卷备份
docker run --rm -v aisa_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz /data
```

### 恢复数据库

```bash
# 从文件恢复
docker compose exec -T postgres psql -U aisa_user aisa_db < backup_20250224.sql
```

### 访问数据库

```bash
# 进入 PostgreSQL 容器
docker compose exec postgres psql -U aisa_user -d aisa_db

# 或从本地连接
psql -h localhost -U aisa_user -d aisa_db
```

---

## 🌐 生产环境配置

### 使用 Nginx 反向代理

1. 启用 Nginx 服务:
```bash
docker compose --profile production up -d
```

2. 配置 SSL/TLS (Let's Encrypt):

```bash
# 创建 SSL 目录
mkdir -p ssl

# 使用 Certbot 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书到 SSL 目录
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
```

### 环境变量配置示例

生产环境的 `.env` 文件示例:

```bash
# 运行模式
NODE_ENV=production

# 域名配置
DOMAIN=your-domain.com

# JWT 密钥 (必须使用强随机值)
JWT_SECRET=very_secure_random_string_at_least_32_chars
JWT_REFRESH_SECRET=another_secure_random_string_at_least_32_chars

# 智谱AI
ZHIPU_API_KEY=your_actual_api_key

# 数据库
POSTGRES_PASSWORD=very_secure_db_password

# CORS
CORS_ORIGIN=https://your-domain.com

# 前端
VITE_API_URL=https://your-domain.com
VITE_WS_URL=https://your-domain.com
```

---

## 🔧 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker compose logs backend
docker compose logs postgres
docker compose logs frontend

# 检查容器状态
docker compose ps

# 检查资源使用
docker stats
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否健康
docker compose ps postgres

# 查看 PostgreSQL 日志
docker compose logs postgres

# 测试数据库连接
docker compose exec backend node -e "const pg = require('pg'); const client = new pg.Client({host: 'postgres', port: 5432, user: 'aisa_user', password: 'aisa_secure_password_change_this', database: 'aisa_db'}); client.connect().then(() => console.log('Connected!')).catch(e => console.error(e));"
```

### 端口冲突

如果端口被占用, 修改 `docker-compose.yml` 中的端口映射:

```yaml
services:
  backend:
    ports:
      - "3002:3001"  # 使用 3002 端口代替 3001

  frontend:
    ports:
      - "5174:5173"  # 使用 5174 端口代替 5173
```

### 内存不足

如果遇到内存问题, 可以限制容器内存使用:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

---

## 📊 监控和日志

### 查看资源使用

```bash
# 实时查看容器资源使用
docker stats

# 查看详细信息
docker inspect aisa-backend
```

### 日志管理

```bash
# 查看实时日志
docker compose logs -f

# 查看最近 100 行日志
docker compose logs --tail=100

# 查看特定时间范围的日志
docker compose logs --since 2025-02-24T00:00:00

# 导出日志到文件
docker compose logs > deployment.log
```

---

## 🔒 安全建议

1. **修改默认密码**
   - 数据库密码 (POSTGRES_PASSWORD)
   - JWT 密钥

2. **限制资源使用**
   - 设置内存和 CPU 限制

3. **使用只读文件系统**
   - 对于不需要写入的容器

4. **定期更新镜像**
   ```bash
   docker compose pull
   docker compose up -d
   ```

5. **使用 Docker Secrets** (在 Swarm 模式下)
   - 存储敏感信息

---

## 📚 参考资源

- Docker 官方文档: https://docs.docker.com/
- Docker Compose 文档: https://docs.docker.com/compose/
- PostgreSQL Docker 镜像: https://hub.docker.com/_/postgres
- Node.js Docker 镜像: https://hub.docker.com/_/node

---

**部署完成! 🎉**

访问: http://localhost:5173 (或配置的域名)
