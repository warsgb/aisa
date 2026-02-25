# AISA - AI售前助手全栈应用

AISA (AI Sales Assistant) 是一个基于 **React + NestJS + PostgreSQL** 的全栈AI售前助手应用，提供13个专业的售前AI技能，帮助售前团队高效完成客户研究、方案设计、竞品分析等工作。

## 📋 目录

- [一键安装](#一键安装)
- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [启动服务](#启动服务)
- [使用指南](#使用指南)
- [项目结构](#项目结构)
- [常见问题](#常见问题)

## 🚀 技术栈

### 前端
- **React 18** - 用户界面库
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Socket.IO Client** - WebSocket 通信

### 后端
- **NestJS** - Node.js 企业级框架
- **TypeScript** - 类型安全
- **TypeORM** - ORM 框架
- **PostgreSQL** - 数据库
- **Socket.IO** - WebSocket 服务
- **JWT** - 身份认证
- **Zhipu AI / Anthropic Claude** - AI 模型支持

## ✨ 功能特性

- 🔐 **用户认证系统** - 注册、登录、团队管理
- 👥 **团队协作** - 支持多团队、多成员协作
- 🏢 **客户管理** - 客户信息管理、项目跟踪
- 🤖 **13个AI技能** - 覆盖售前全流程
  - 金融行业客户研究
  - 竞品反制话术
  - 电梯演讲生成
  - 痛点分析
  - 方案设计
  - 价值主张提炼
  - 演示场景设计
  - 等等...
- 📄 **文档管理** - 支持文档版本控制
- 📎 **参考资料** - 上传和管理参考资料
- 🔄 **实时流式响应** - AI 技能实时流式输出

## 🚀 一键安装

**全新服务器部署**：在全新的 Linux 服务器上，可以使用一键安装脚本自动完成所有配置：

```bash
curl -sSL https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
```

或使用 wget：

```bash
wget -qO- https://raw.githubusercontent.com/warsgb/aisa/master/install.sh | bash
```

一键安装脚本会自动：
- 检测操作系统类型（Ubuntu/CentOS）
- 安装系统依赖（Node.js 20.x, PostgreSQL, Git）
- 克隆代码仓库
- 生成安全密钥（JWT）
- 配置数据库（用户和数据库）
- 安装项目依赖
- 构建后端
- 配置 PM2 进程管理
- 启动服务

详细文档：[INSTALL.md](./INSTALL.md)

---

## 📦 环境要求

在开始之前，请确保您的系统已安装以下软件：

- **Node.js** >= 18.x ([下载地址](https://nodejs.org/))
- **PostgreSQL** >= 14.x
  - macOS: `brew install postgresql@16`
  - Ubuntu: `sudo apt install postgresql`
  - Windows: [下载安装包](https://www.postgresql.org/download/windows/)
- **npm** 或 **yarn** (随 Node.js 安装)
- **Git** (可选，用于克隆代码)

## 🏁 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd aisa
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 3. 配置环境变量

项目提供了环境变量模板文件，需要复制并填写实际配置：

```bash
# 前端环境配置
cp .env.example .env

# 后端环境配置
cp backend/.env.example backend/.env
```

### 4. 生成安全密钥

使用提供的脚本生成 JWT 密钥：

```bash
./scripts/generate-secrets.sh
```

将生成的密钥复制到 `backend/.env` 文件中的对应位置：

```bash
JWT_SECRET=<生成的密钥1>
JWT_REFRESH_SECRET=<生成的密钥2>
```

### 5. 配置数据库

#### 创建数据库和用户

```bash
# macOS/Linux
psql -U postgres

# Windows
psql -U postgres
```

在 PostgreSQL 命令行中执行：

```sql
CREATE USER aisa_user WITH PASSWORD 'aisa_password_2026';
CREATE DATABASE aisa_db OWNER aisa_user;
GRANT ALL PRIVILEGES ON DATABASE aisa_db TO aisa_user;
\q
```

#### 启动 PostgreSQL 服务

```bash
# macOS (Homebrew)
brew services start postgresql@16

# Linux (systemd)
sudo systemctl start postgresql

# Windows (服务管理器)
net start postgresql-x64-16
```

### 6. 配置 AI API 密钥

编辑 `backend/.env` 文件，配置你选择的 AI 服务商密钥：

#### 使用智谱 AI (GLM)

```bash
AI_PROVIDER=zhipu
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4.7
```

获取 API Key: https://open.bigmodel.cn/

#### 使用 Anthropic Claude

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 7. 构建后端

```bash
cd backend
npm run build
cd ..
```

### 8. 启动服务

使用项目提供的启动脚本：

```bash
# 启动所有服务（前端 + 后端）
./start-all.sh

# 或者单独启动
./start-frontend.sh  # 仅启动前端
./backend/start-backend.sh  # 仅启动后端
```

### 9. 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

## 🔧 详细配置

### 环境变量说明

#### 前端 `.env` 文件

```bash
# 后端 API 地址（开发环境默认 localhost）
VITE_API_URL=http://localhost:3001

# WebSocket 地址
VITE_WS_URL=http://localhost:3001
```

#### 后端 `backend/.env` 文件

```bash
# 应用配置
NODE_ENV=development          # 运行模式：development/production
PORT=3001                     # 后端服务端口

# 数据库配置
DB_HOST=localhost             # 数据库主机
DB_PORT=5432                  # 数据库端口
DB_USERNAME=aisa_user         # 数据库用户名
DB_PASSWORD=aisa_password_2026  # 数据库密码
DB_DATABASE=aisa_db           # 数据库名称

# JWT 配置（必需！）
JWT_SECRET=your_jwt_secret_key_here              # JWT 访问令牌密钥
JWT_EXPIRES_IN=1h                                # 访问令牌有效期
JWT_REFRESH_SECRET=your_refresh_secret_key_here  # JWT 刷新令牌密钥
JWT_REFRESH_EXPIRES_IN=7d                        # 刷新令牌有效期

# AI 服务配置
AI_PROVIDER=zhipu              # AI 提供商：zhipu/anthropic/openai

# 智谱 AI 配置
ZHIPU_API_KEY=your_key_here    # 智谱 API Key
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
ZHIPU_MODEL=glm-4.7            # 模型选择
ZHIPU_MAX_TOKENS=65536         # 最大 token 数
ZHIPU_TEMPERATURE=0.7          # 温度参数

# 文件上传配置
UPLOAD_DIR=./uploads           # 上传文件存储目录（相对路径）
MAX_FILE_SIZE=10485760         # 最大文件大小（10MB）

# CORS 配置
CORS_ORIGIN=http://localhost:5173    # 允许的前端域名
CORS_ALLOW_ALL=false                 # 开发环境可设为 true 允许所有域名
```

### 目录结构说明

```
aisa/
├── backend/                    # 后端代码
│   ├── src/                   # 源代码
│   │   ├── modules/          # 业务模块
│   │   ├── common/           # 公共模块
│   │   ├── entities/         # 数据库实体
│   │   └── main.ts           # 应用入口
│   ├── dist/                 # 编译后的代码
│   ├── logs/                 # 日志文件
│   ├── uploads/              # 上传文件存储
│   ├── .env                  # 环境变量（不提交到 Git）
│   └── package.json          # 后端依赖
├── src/                       # 前端源代码
│   ├── components/           # React 组件
│   ├── pages/                # 页面组件
│   ├── services/             # API 服务
│   ├── types/                # TypeScript 类型
│   └── main.tsx              # 应用入口
├── skills/                    # AI 技能定义
│   ├── presale-elevator-pitch/
│   ├── financial-customer-research/
│   └── ...
├── scripts/                   # 工具脚本
│   ├── generate-secrets.sh   # 生成密钥
│   ├── start.sh              # 启动脚本
│   └── status.sh             # 状态检查
├── start-all.sh              # 启动所有服务
├── stop-all.sh               # 停止所有服务
├── status.sh                 # 查看服务状态
├── .env.example              # 前端环境变量模板
├── .gitignore                # Git 忽略文件
└── README.md                 # 项目说明
```

## 🎯 启动服务

### 使用启动脚本（推荐）

```bash
# 启动所有服务
./start-all.sh

# 停止所有服务
./stop-all.sh

# 查看服务状态
./status.sh
```

### 手动启动

```bash
# 启动后端（开发模式）
cd backend
NODE_ENV=development npm run start:dev

# 启动后端（生产模式）
NODE_ENV=production node dist/main

# 启动前端
npm run dev
```

### 服务端口

- **前端**: http://localhost:5173
- **后端**: http://localhost:3001
- **数据库**: localhost:5432

## 📖 使用指南

### 1. 注册账号

首次使用需要注册账号：

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_password",
    "full_name": "您的姓名",
    "team_name": "团队名称"
  }'
```

### 2. 登录系统

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_password"
  }'
```

### 3. 创建客户

登录后，在前端界面或通过 API 创建客户：

```bash
curl -X POST "http://localhost:3001/teams/{team_id}/customers" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "客户名称",
    "industry": "行业",
    "description": "客户描述"
  }'
```

### 4. 调用 AI 技能

在前端界面选择要调用的技能，输入相关参数，即可获得 AI 生成的售前内容。

**注意**: 技能执行使用 WebSocket 进行实时流式输出，需要保持连接稳定。

## 🛠️ 常用命令

```bash
# 安装依赖
npm install              # 前端依赖
cd backend && npm install # 后端依赖

# 构建项目
npm run build            # 前端构建
cd backend && npm run build  # 后端构建

# 开发模式
npm run dev              # 前端开发服务器
cd backend && npm run start:dev  # 后端开发服务器

# 代码检查
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化

# 数据库操作
psql -U aisa_user -d aisa_db  # 连接数据库
```

## 🐛 常见问题

### 1. 端口被占用

如果遇到端口被占用的错误：

```bash
# 查看占用端口的进程
lsof -ti:3001  # 后端端口
lsof -ti:5173  # 前端端口

# 杀死占用端口的进程
lsof -ti:3001 | xargs kill -9
```

### 2. 数据库连接失败

检查 PostgreSQL 服务是否启动：

```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# 启动服务
brew services start postgresql@16  # macOS
sudo systemctl start postgresql   # Linux
```

### 3. JWT 密钥错误

确保在 `backend/.env` 中正确配置了 JWT 密钥：

```bash
# 生成新的密钥
./scripts/generate-secrets.sh

# 将生成的密钥填入 backend/.env
JWT_SECRET=<生成的密钥1>
JWT_REFRESH_SECRET=<生成的密钥2>
```

### 4. AI API 调用失败

- 检查 API Key 是否正确配置
- 确认 API Key 有足够的额度
- 检查网络连接是否正常

### 5. 技能加载失败

检查 `skills/` 目录是否存在且包含技能定义文件。如果修改了技能文件，需要重启后端服务。

### 6. 前端无法连接后端

检查以下配置：

1. `.env` 文件中的 `VITE_API_URL` 是否正确
2. 后端服务是否正常运行
3. 防火墙是否阻止了连接

## 📝 开发说明

### 技能定义

技能定义在 `skills/` 目录中，每个技能包含：

```
skills/<skill-slug>/
├── SKILL.md              # 技能说明文档（带 frontmatter）
└── ...                   # 其他相关文件
```

技能的 frontmatter 定义：

```yaml
---
slug: skill-slug
name: 技能名称
description: 技能描述
category: 技能分类
usage_hint: 使用提示
parameters:
  - name: param_name
    type: string
    label: 参数名称
    required: true
---
```

### 数据库同步

在开发模式下，TypeORM 会自动同步数据库表结构。

如果需要重置数据库：

```bash
psql -U aisa_user -d aisa_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

然后重启后端，表会自动重新创建。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 支持

如有问题或建议，请提交 Issue 或联系项目维护者。

---

**祝您使用愉快！** 🎉
