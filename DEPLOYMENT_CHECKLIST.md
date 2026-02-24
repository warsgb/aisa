# AISA 部署前检查清单

在执行部署之前, 请逐项检查并确认以下内容:

---

## 📋 服务器准备

### 系统要求
- [ ] 操作系统: Linux (Ubuntu 20.04+/CentOS 8+) 或 macOS
- [ ] 可用内存: 至少 2GB RAM
- [ ] 可用磁盘: 至少 10GB
- [ ] 有 sudo 或 root 权限

### 软件依赖
- [ ] Node.js 18+ 已安装 (`node --version`)
- [ ] npm 已安装 (`npm --version`)
- [ ] Git 已安装 (`git --version`)
- [ ] PostgreSQL 14+ 已安装 (`psql --version`)

---

## 🔑 准备配置信息

### 必需的密钥和密码
- [ ] **智谱AI API Key** - 从 https://open.bigmodel.cn/ 获取
- [ ] **数据库密码** - 为 aisa_user 设置的强密码
- [ ] **JWT 密钥** - 使用 `./scripts/generate-secrets.sh` 生成

### 服务器信息
- [ ] 服务器 IP 地址或域名
- [ ] SSH 登录信息 (如果远程部署)

---

## 📝 配置文件检查

### 前端配置 (.env.local)
- [ ] `VITE_API_URL` 已设置为正确的后端地址
- [ ] `VITE_WS_URL` 已设置为正确的 WebSocket 地址

### 后端配置 (backend/.env)
- [ ] `NODE_ENV` 已设置 (development 或 production)
- [ ] `DB_HOST` 已设置 (通常为 localhost)
- [ ] `DB_PORT` 已设置 (默认 5432)
- [ ] `DB_USERNAME` 已设置 (默认 aisa_user)
- [ ] `DB_PASSWORD` 已设置 (强密码)
- [ ] `DB_DATABASE` 已设置 (默认 aisa_db)
- [ ] `JWT_SECRET` 已设置 (使用生成的密钥)
- [ ] `JWT_REFRESH_SECRET` 已设置 (使用生成的密钥)
- [ ] `ZHIPU_API_KEY` 已设置 (从智谱AI获取)
- [ ] `CORS_ORIGIN` 已设置 (前端地址)

---

## 🗄️ 数据库准备

### PostgreSQL 配置
- [ ] PostgreSQL 服务已启动
- [ ] 数据库 `aisa_db` 已创建
- [ ] 用户 `aisa_user` 已创建
- [ ] 用户已授权访问数据库
- [ ] 可以成功连接数据库
  ```bash
  psql -h localhost -U aisa_user -d aisa_db
  ```

---

## 🌐 网络配置

### 防火墙设置
- [ ] 端口 3001 已开放 (后端 API)
- [ ] 端口 5173 已开放 (前端, 如需外部访问)
- [ ] 端口 22 已开放 (SSH)
- [ ] 如使用远程数据库, 端口 5432 已开放

### DNS/域名 (可选)
- [ ] 域名已解析到服务器 IP
- [ ] 如使用 Nginx, 配置文件已准备

---

## 📦 部署步骤确认

### 代码部署
- [ ] 代码已克隆到服务器 (/opt/aisa 或其他目录)
- [ ] 当前分支正确 (master 或其他)
- [ ] 最新代码已拉取 (`git pull`)

### 依赖安装
- [ ] 前端依赖已安装 (`npm install`)
- [ ] 后端依赖已安装 (`cd backend && npm install`)

### 构建项目
- [ ] 后端已构建 (`cd backend && npm run build`)
- [ ] dist 目录存在且包含编译后的文件

### 目录权限
- [ ] uploads 目录存在且有正确权限
- [ ] logs 目录存在且有正确权限

---

## 🚀 部署执行

### 启动服务
选择以下方式之一:

**方式一: 自动部署脚本**
```bash
./deploy.sh
```

**方式二: 手动启动**
```bash
./start-all.sh
```

**方式三: 使用 PM2**
```bash
pm2 start backend/dist/main.js --name aisa-backend
pm2 save
```

---

## ✅ 部署后验证

### 服务状态
- [ ] 后端服务正在运行
  ```bash
  curl http://localhost:3001/health
  ```
- [ ] 前端服务正在运行 (如启动)
  ```bash
  curl http://localhost:5173
  ```
- [ ] PM2 进程正常 (如使用 PM2)
  ```bash
  pm2 status
  ```

### 功能测试
- [ ] 可以访问前端界面
- [ ] 可以注册新用户
- [ ] 可以登录系统
- [ ] 技能列表正常显示
- [ ] 技能执行正常 (流式输出)
- [ ] 文件上传功能正常

---

## 🔒 安全检查

### 安全配置
- [ ] 所有默认密码已更改
- [ ] JWT 密钥已使用强随机值
- [ ] API Key 已正确配置
- [ ] 数据库只监听本地 (除非需要远程访问)
- [ ] 防火墙已正确配置
- [ ] 生产环境已配置 HTTPS (使用 Nginx + Let's Encrypt)

---

## 📞 获取帮助

如遇到问题:

1. 查看日志: `tail -f backend/logs/backend.log`
2. 检查配置: 确认 .env 文件配置正确
3. 查看文档: `README.md`, `DEPLOYMENT_GUIDE.md`
4. GitHub Issues: https://github.com/warsgb/aisa/issues

---

## 🔄 更新部署检查清单

当更新部署新版本时:

- [ ] 备份当前版本和数据库
- [ ] 拉取最新代码 (`git pull`)
- [ ] 检查是否有新的依赖需要安装
- [ ] 重新构建后端 (`npm run build`)
- [ ] 重启服务
- [ ] 验证功能正常

---

**准备就绪? 开始部署: `./deploy.sh` 🚀**
