# AISA 传统部署指南

## 概述

本指南适用于在全新的 Linux 服务器上使用传统方式部署 AISA 项目。一键安装脚本会自动完成所有配置和部署步骤。

## 系统要求

- **操作系统**: Ubuntu 20.04+, Debian 10+, CentOS 7+, Rocky Linux 8+
- **架构**: x86_64 / amd64 或 ARM64
- **权限**: root 或 sudo 权限
- **内存**: 建议 2GB 以上
- **磁盘**: 建议 10GB 以上可用空间

## 快速安装

### 方式一：使用 curl（推荐）

```bash
curl -sSL https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
```

### 方式二：使用 wget

```bash
wget -qO- https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
```

### 方式三：下载后执行

```bash
# 下载脚本
wget https://raw.githubusercontent.com/warsgb/aisa/master/install.sh

# 赋予执行权限
chmod +x install.sh

# 执行安装
sudo ./install.sh
```

## 安装过程

脚本会自动执行以下步骤：

### 1. 系统依赖安装
- 检测操作系统类型（Ubuntu/CentOS）
- 安装 Node.js 20.x
- 安装 PostgreSQL 数据库
- 安装 Git、curl、wget 等基础工具

### 2. PM2 进程管理器
- 全局安装 PM2
- 配置开机自启动

### 3. 代码部署
- 克隆代码仓库到 `/opt/aisa`
- 默认分支：`master`

### 4. 数据库配置
- 创建数据库：`aisa_db`
- 创建用户：`aisa_user`
- 自动生成安全密码（或使用环境变量指定）

### 5. 安全密钥生成
- 自动生成 JWT_SECRET
- 自动生成 JWT_REFRESH_SECRET

### 6. 用户配置交互

脚本会提示输入以下信息：

```
请输入智谱AI API Key (从 https://open.bigmodel.cn/ 获取):
请输入服务器IP地址 [默认: 自动检测的IP]:
```

**智谱AI API Key 获取方式**：
1. 访问 https://open.bigmodel.cn/
2. 注册/登录账号
3. 进入控制台获取 API Key

### 7. 配置文件生成

自动创建以下配置文件：
- `backend/.env` - 后端配置
- `.env.local` - 前端配置

### 8. 项目构建
- 安装前端依赖
- 安装后端依赖
- 编译后端代码

### 9. 服务启动
- 使用 PM2 启动后端服务
- 启动前端开发服务器

## 环境变量配置

可以通过环境变量自定义安装参数：

```bash
# 自定义仓库地址
export AISA_REPO=https://your-repo/aisa.git

# 自定义分支
export AISA_BRANCH=develop

# 自定义安装目录
export AISA_DIR=/home/aisa

# 自定义数据库密码
export DB_PASSWORD=your_secure_password

# 预设智谱API Key
export ZHIPU_API_KEY=your_api_key

# 预设服务器IP
export SERVER_IP=192.168.1.100

# 跳过PM2安装（使用项目脚本）
export SKIP_PM2=true

# 然后运行安装
curl -sSL https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
```

## 安装完成后

### 访问地址

安装完成后，脚本会显示访问地址：

```
🌐 访问地址:
  前端:     http://your-server-ip:5173
  后端API:  http://your-server-ip:3001
  健康检查: http://your-server-ip:3001/health
```

### 服务管理

**使用 PM2 管理（默认）**：

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs aisa-backend

# 重启服务
pm2 restart aisa-backend

# 停止服务
pm2 stop aisa-backend

# 查看详细信息
pm2 show aisa-backend
```

**使用项目脚本管理（SKIP_PM2=true）**：

```bash
cd /opt/aisa

# 查看状态
./status.sh

# 启动服务
./start-all.sh

# 停止服务
./stop-all.sh
```

### 查看后端日志

```bash
# 实时查看日志
tail -f /opt/aisa/backend/logs/backend.log

# 查看最后100行
tail -n 100 /opt/aisa/backend/logs/backend.log
```

## 防火墙配置

确保防火墙开放必要端口：

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 3001/tcp  # 后端API
sudo ufw allow 5173/tcp  # 前端
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

## 数据库管理

### 连接数据库

```bash
sudo -u postgres psql -d aisa_db
```

### 备份数据库

```bash
# 备份
pg_dump -U aisa_user -h localhost aisa_db > backup.sql

# 恢复
psql -U aisa_user -h localhost aisa_db < backup.sql
```

### 修改数据库密码

```bash
# 连接到 PostgreSQL
sudo -u postgres psql

# 修改密码
ALTER USER aisa_user WITH PASSWORD 'new_password';
```

## 常见问题

### 问题1：端口被占用

```bash
# 查看端口占用
sudo lsof -i :3001
sudo lsof -i :5173

# 停止占用进程
sudo kill -9 <PID>
```

### 问题2：Node.js 版本过低

```bash
# 卸载旧版本
sudo apt remove nodejs npm  # Ubuntu/Debian
sudo yum remove nodejs npm  # CentOS/RHEL

# 重新安装（参考上面的快速安装）
```

### 问题3：PostgreSQL 连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 启动 PostgreSQL
sudo systemctl start postgresql

# 检查连接
sudo -u postgres psql -c "SELECT version();"
```

### 问题4：权限问题

```bash
# 确保安装目录有正确权限
sudo chown -R $USER:$USER /opt/aisa

# 或使用 root 运行
sudo ./install.sh
```

### 问题5：前端无法访问后端

1. 检查后端是否正常运行：
```bash
curl http://localhost:3001/health
```

2. 检查配置文件中的 CORS 设置：
```bash
cat /opt/aisa/backend/.env | grep CORS
```

3. 检查前端配置：
```bash
cat /opt/aisa/.env.local
```

## 更新项目

### 更新代码并重新部署

```bash
cd /opt/aisa

# 拉取最新代码
git pull origin master

# 更新依赖
npm install
cd backend && npm install && cd ..

# 重新构建
cd backend && npm run build && cd ..

# 重启服务
pm2 restart aisa-backend
# 或
./stop-all.sh && ./start-all.sh
```

## 卸载

### 完全卸载

```bash
# 停止服务
pm2 delete aisa-backend
# 或
cd /opt/aisa && ./stop-all.sh

# 删除项目目录
sudo rm -rf /opt/aisa

# 删除数据库（可选）
sudo -u postgres psql -c "DROP DATABASE aisa_db;"
sudo -u postgres psql -c "DROP USER aisa_user;"

# 卸载 Node.js（可选）
sudo apt remove nodejs npm  # Ubuntu/Debian
# 或
sudo yum remove nodejs npm  # CentOS/RHEL
```

## 生产环境建议

1. **配置 HTTPS**
   - 使用 Nginx 反向代理
   - 配置 SSL 证书（Let's Encrypt）

2. **定期备份**
   - 设置数据库自动备份
   - 备份上传文件目录

3. **监控**
   - 配置 PM2 监控
   - 设置日志轮转

4. **安全加固**
   - 修改默认端口
   - 配置防火墙白名单
   - 定期更新系统补丁

## Nginx 反向代理配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 技术支持

如遇到问题，请：
1. 查看日志文件
2. 检查系统服务状态
3. 参考"常见问题"部分
4. 提交 Issue 到项目仓库
