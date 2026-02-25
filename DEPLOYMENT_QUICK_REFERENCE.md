# AISA 部署快速参考

## 🚀 一键部署命令

### 传统部署方式

```bash
# 1. 克隆代码
git clone git@github.com:warsgb/aisa.git
cd aisa

# 2. 生成密钥
./scripts/generate-secrets.sh

# 3. 配置环境变量
cp .env.example .env.local
vim .env.local              # 修改 VITE_API_URL
cp backend/.env.example backend/.env
vim backend/.env            # 修改所有必需配置

# 4. 创建数据库
sudo -u postgres psql
CREATE USER aisa_user WITH PASSWORD 'your_password';
CREATE DATABASE aisa_db OWNER aisa_user;
GRANT ALL PRIVILEGES ON DATABASE aisa_db TO aisa_user;
\q

# 5. 部署
./deploy.sh
```

### Docker 部署方式

```bash
# 1. 克隆代码
git clone git@github.com:warsgb/aisa.git
cd aisa

# 2. 配置环境变量
cat > .env << 'ENVEOF'
JWT_SECRET=generated_secret_here
JWT_REFRESH_SECRET=generated_secret_here
ZHIPU_API_KEY=your_api_key
POSTGRES_PASSWORD=your_db_password
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
ENVEOF

# 3. 启动
docker compose up -d

# 4. 查看状态
docker compose ps
docker compose logs -f
```

---

## 📋 最小配置清单

### 必须配置的项目

| 配置项 | 文件 | 说明 | 获取方式 |
|-------|------|------|---------|
| VITE_API_URL | .env.local | 后端API地址 | 实际服务器IP |
| DB_PASSWORD | backend/.env | 数据库密码 | 自设强密码 |
| JWT_SECRET | backend/.env | JWT密钥 | openssl rand -base64 32 |
| JWT_REFRESH_SECRET | backend/.env | 刷新密钥 | openssl rand -base64 32 |
| ZHIPU_API_KEY | backend/.env | 智谱AI密钥 | https://open.bigmodel.cn/ |
| CORS_ORIGIN | backend/.env | 允许的前端地址 | 实际服务器IP:5173 |

---

## 🔧 常用命令

### 服务管理

```bash
# 启动所有服务
./start-all.sh

# 停止所有服务
./stop-all.sh

# 查看服务状态
./status.sh

# 查看后端日志
tail -f backend/logs/backend.log

# 使用 PM2 (如果安装)
pm2 status
pm2 logs aisa-backend
pm2 restart aisa-backend
```

### Docker 命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 更新
git pull && docker compose build && docker compose up -d
```

### 数据库操作

```bash
# 连接数据库
psql -h localhost -U aisa_user -d aisa_db

# 备份
pg_dump -U aisa_user aisa_db > backup.sql

# 恢复
psql -U aisa_user aisa_db < backup.sql
```

---

## 🐛 快速故障排除

### 问题: 端口被占用
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### 问题: 数据库连接失败
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 问题: 服务启动失败
```bash
# 查看详细日志
./status.sh
tail -50 backend/logs/backend.log

# 或使用 PM2
pm2 logs aisa-backend --lines 100
```

### 问题: 前端无法连接后端
```bash
# 检查 CORS 配置
cat backend/.env | grep CORS

# 检查前端配置
cat .env.local | grep VITE_API_URL

# 确保两者一致
```

---

## 🌐 访问地址

| 服务 | 默认地址 | 说明 |
|-----|---------|------|
| 前端 | http://localhost:5173 | Vite 开发服务器 |
| 后端 API | http://localhost:3001 | NestJS API |
| 健康检查 | http://localhost:3001/health | 服务健康状态 |
| 数据库 | localhost:5432 | PostgreSQL |

---

## 📞 获取帮助

- 详细部署指南: DEPLOYMENT_GUIDE.md
- Docker 部署: DOCKER_DEPLOYMENT.md
- 部署检查清单: DEPLOYMENT_CHECKLIST.md
- 项目文档: README.md, CLAUDE.md
- GitHub Issues: https://github.com/warsgb/aisa/issues

---

## ✅ 部署验证

```bash
# 1. 检查后端健康
curl http://localhost:3001/health

# 2. 检查前端
curl http://localhost:5173

# 3. 检查数据库
psql -h localhost -U aisa_user -d aisa_db -c "SELECT 1;"

# 4. 功能测试
# - 在浏览器访问前端
# - 注册新用户
# - 登录系统
# - 测试技能执行
```

---

**快速部署: ./deploy.sh 🚀**
