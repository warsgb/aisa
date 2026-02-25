# AISA 项目管理脚本

## 概述

完整的前后端管理脚本，放在项目根目录。

## 一键安装（新服务器）

### install.sh - 全新服务器一键安装

**路径**: `/install.sh`

用于在全新的 Linux 服务器上自动部署 AISA 项目，从零开始完成所有配置。

**使用方法**:
```bash
# 方式一：使用 curl
curl -sSL https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash

# 方式二：使用 wget
wget -qO- https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash

# 方式三：下载后执行
wget https://raw.githubusercontent.com/warsgb/aisa/master/install.sh
chmod +x install.sh
sudo ./install.sh
```

**功能包括**:
- 检测系统类型（Ubuntu/CentOS）
- 安装系统依赖（Node.js 20.x, PostgreSQL, Git）
- 克隆代码仓库
- 生成安全密钥（JWT）
- 配置数据库（用户和数据库）
- 安装项目依赖
- 构建后端
- 配置 PM2 进程管理
- 启动服务

**环境变量**:
```bash
export AISA_REPO=https://github.com/warsgb/aisa.git  # 仓库地址
export AISA_BRANCH=master                              # 分支名称
export AISA_DIR=/opt/aisa                             # 安装目录
export DB_PASSWORD=your_password                      # 数据库密码
export ZHIPU_API_KEY=your_key                         # 智谱API Key
export SERVER_IP=192.168.1.100                        # 服务器IP
export SKIP_PM2=true                                  # 跳过PM2
```

详细文档请参考: [INSTALL.md](./INSTALL.md)

---

## 项目管理脚本

### 脚本列表

| 脚本 | 路径 | 说明 |
|--------|------|------|
| **install.sh** | 项目根目录 | 全新服务器一键安装 |
| **start-all.sh** | 项目根目录 | 启动前后端所有服务 |
| **stop-all.sh** | 项目根目录 | 停止前后端所有服务 |
| **status.sh** | 项目根目录 | 查看服务运行状态 |
| **deploy.sh** | 项目根目录 | 项目部署脚本（已配置环境） |
| **start-backend.sh** | `backend/` | 后端启动脚本（自动日志） |
| **stop-backend.sh** | `backend/` | 后端停止脚本（彻底清理） |

## 快速开始

### 启动所有服务

```bash
cd /home/presales/aisa

# 方式1: 使用统一脚本（推荐）
./start-all.sh

# 方式2: 使用 npm 命令
npm run start-all
```

### 停止所有服务

```bash
cd /home/presales/aisa

# 方式1: 使用统一脚本（推荐）
./stop-all.sh

# 方式2: 使用 npm 命令
npm run stop-all
```

### 查看状态

```bash
cd /home/presales/aisa

# 使用统一脚本（推荐）
./status.sh

# 使用 npm 命令
npm run status
```

## 单独服务管理

### 后端服务

```bash
cd /home/presales/aisa/backend

# 启动后端（带日志）
npm run start

# 或使用脚本
./start-backend.sh

# 停止后端
npm run stop

# 或使用脚本
./stop-backend.sh

# 重启后端
npm run restart
```

### 前端服务

```bash
cd /home/presales/aisa

# 启动前端
npm run dev

# 或
npm run start:frontend

# 停止前端
npm run stop:frontend

# 或
pkill -f 'vite.*5173'
```

## 功能说明

### start-all.sh

启动前后端所有服务，功能包括：
- 检查端口占用
- 自动停止已存在的服务
- 创建日志目录
- 启动后端（带日志输出到 `logs/backend.log`）
- 检查并安装前端依赖（如需要）
- 启动前端开发服务器

### stop-all.sh

停止所有服务，功能包括：
- 显示停止前的进程统计
- 按顺序停止后端和前端
- 验证端口已释放
- 显示停止后的进程统计

### status.sh

实时显示服务状态，功能包括：
- 后端状态（端口3001）
- 前端状态（端口5173）
- 进程PID和资源占用（内存、运行时间）
- 彩色输出（✅绿色、⏹红色、❓灰色）

## 日志位置

**后端日志**: `/home/presales/aisa/backend/logs/backend.log`

**查看实时日志**:
```bash
tail -f /home/presales/aisa/backend/logs/backend.log
```

## 故障排查

### 端口被占用

如果启动时报错"端口已占用"，脚本会自动尝试停止旧进程。如果失败：

```bash
# 手动停止端口3001
lsof -ti :3001 | xargs kill -9

# 手动停止端口5173
lsof -ti :5173 | xargs kill -9
```

### 进程未正常停止

```bash
# 查看所有相关进程
ps aux | grep -E "(nest|backend|vite.*5173)"

# 强制停止所有
pkill -9 -f "nest.*backend" 2>/dev/null || true
pkill -9 -f "vite.*5173" 2>/dev/null || true
```

## 环境要求

- Bash 4.0+
- lsof 命令（端口检查）
- PostgreSQL 服务运行

## NPM 命令速查

```bash
# 从项目根目录
npm run start-all     # 启动所有
npm run stop-all      # 停止所有
npm run status        # 查看状态

# 仅后端
cd backend && npm run start
cd backend && npm run stop

# 仅前端
npm run dev
npm run stop:frontend
```
