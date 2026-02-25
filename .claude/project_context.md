# AISA 项目上下文

> 此文件用于帮助 Claude 快速了解项目情况，便于后续交互和开发。

## 项目概述

**AISA** (AI Sales Assistant) 是一个全栈 AI 售前助手应用，提供 13 个专业的售前 AI 技能。

- **仓库**: https://github.com/warsgb/aisa
- **技术栈**: React + NestJS + PostgreSQL + TypeORM
- **前端**: http://localhost:5173
- **后端**: http://localhost:3001

## 最近修改 (2026-02-18)

### 已完成的修复
1. ✅ 修复所有硬编码路径（Shell 脚本动态路径检测）
2. ✅ 移除硬编码 IP 地址（69.5.7.242），改用环境变量
3. ✅ 修复上传目录路径，支持相对路径
4. ✅ 移除 JWT 密钥硬编码，添加启动验证
5. ✅ 创建环境变量模板（.env.example）
6. ✅ 添加密钥生成脚本（scripts/generate-secrets.sh）
7. ✅ 前端服务支持相对路径
8. ✅ 技能目录路径动态检测
9. ✅ 更新 .gitignore 排除敏感文件
10. ✅ 编写完整的中文 README

### 提交记录
- `345d56a` - fix: 修复硬编码路径和配置，支持跨环境部署

## 项目结构

```
aisa/
├── backend/                    # NestJS 后端
│   ├── src/
│   │   ├── modules/           # 业务模块
│   │   │   ├── auth/          # 认证模块
│   │   │   ├── teams/         # 团队管理
│   │   │   ├── customers/     # 客户管理
│   │   │   ├── skills/        # AI 技能
│   │   │   ├── interactions/  # 交互记录
│   │   │   ├── documents/     # 文档管理
│   │   │   └── references/    # 参考资料
│   │   ├── common/            # 公共模块
│   │   │   ├── strategies/    # JWT 策略
│   │   │   ├── guards/        # 守卫
│   │   │   └── services/      # AI 服务
│   │   ├── entities/          # TypeORM 实体
│   │   └── main.ts            # 应用入口
│   ├── .env.example           # 环境变量模板
│   ├── start-backend.sh       # 启动脚本
│   └── stop-backend.sh        # 停止脚本
│
├── src/                       # React 前端
│   ├── components/            # 组件
│   ├── pages/                 # 页面
│   ├── services/              # API 服务
│   └── types/                 # TypeScript 类型
│
├── skills/                    # AI 技能定义（13个）
│   ├── presale-elevator-pitch/
│   ├── financial-customer-research/
│   └── ...
│
├── scripts/                   # 工具脚本
│   ├── generate-secrets.sh   # 生成 JWT 密钥
│   ├── start.sh
│   └── status.sh
│
├── start-all.sh              # 启动所有服务
├── stop-all.sh               # 停止所有服务
├── status.sh                 # 查看状态
├── .env.example              # 前端环境变量模板
├── .gitignore                # 排除 .env 等敏感文件
└── README.md                 # 完整中文文档
```

## 数据库

### 当前配置
- **数据库**: PostgreSQL 16
- **数据库名**: aisa_db
- **用户**: aisa_user
- **密码**: aisa_password_2026
- **端口**: 5432

### 表结构（12张表）
1. `users` - 用户表
2. `teams` - 团队表
3. `team_members` - 团队成员关系
4. `customers` - 客户表
5. `skills` - 技能定义
6. `skill_interactions` - 技能执行记录
7. `interaction_messages` - 交互消息
8. `documents` - 文档
9. `document_versions` - 文档版本
10. `reference_materials` - 参考资料
11. `shared_frameworks` - 共享框架
12. `activity_logs` - 活动日志

### 开发模式
- TypeORM 自动同步开启 (`synchronize: true`)
- 修改 entity 后重启后端即可自动更新表结构

## 环境配置

### 必需的环境变量
- `JWT_SECRET` - JWT 访问令牌密钥
- `JWT_REFRESH_SECRET` - JWT 刷新令牌密钥
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`

### AI 服务配置
- `AI_PROVIDER` - zhipu/anthropic/openai
- `ZHIPU_API_KEY` - 智谱 API 密钥
- `ANTHROPIC_API_KEY` - Claude API 密钥

### 生成密钥
```bash
./scripts/generate-secrets.sh
```

## 已知的测试数据

### 用户账号
- 邮箱: test@aisa.com
- 密码: test123456
- 团队: 北京银行团队 (ID: 539a5f24-a97c-4dff-9234-9a0e91aa2b33)

### 客户
- 北京银行 (ID: c7ad379e-6b67-4a9f-8c60-f8460dcb65d8)

## 技能列表（13个）

1. `financial-customer-research` - 金融行业客户研究
2. `presale-competitor-response` - 竞品反制话术
3. `presale-elevator-pitch` - 电梯演讲生成
4. `viral-title-generator` - 爆款标题生成器
5. `presale-executive-storyline` - 高层汇报故事线
6. `presale-icebreaker-topics` - 破冰话题生成器
7. `presale-industry-jargon` - 行业术语解读器
8. `presale-consulting-methodology` - 咨询方法论应用器
9. `presale-pain-point-analysis` - 客户痛点深度分析
10. `presale-solution-design` - 解决方案设计器
11. `presale-value-proposition` - 价值主张提炼器
12. `presale-objection-handling` - 异议处理话术生成器
13. `presale-demo-scenario` - 演示场景设计器

## 快速命令

### 启动服务
```bash
./start-all.sh    # 启动所有
./stop-all.sh     # 停止所有
./status.sh       # 查看状态
```

### 后端
```bash
cd backend
npm run build              # 构建
NODE_ENV=development node dist/main  # 启动（开发）
NODE_ENV=production node dist/main    # 启动（生产）
```

### 前端
```bash
npm run dev        # 开发模式
npm run build      # 构建
```

### 数据库
```bash
psql -U aisa_user -d aisa_db    # 连接数据库
```

## 关键文件位置

- **主应用入口**: `backend/src/main.ts`
- **AppModule**: `backend/src/app.module.ts`
- **JWT策略**: `backend/src/common/strategies/jwt.strategy.ts`
- **技能加载器**: `backend/src/modules/skills/skill-loader.service.ts`
- **技能执行器**: `backend/src/modules/skills/skill-executor.service.ts`
- **WebSocket网关**: `backend/src/modules/skills/streaming.gateway.ts`
- **前端API服务**: `src/services/api.service.ts`

## 开发注意事项

1. **环境变量**: 所有敏感信息都在 `.env` 文件中，不提交到 git
2. **技能定义**: 技能定义在 `skills/` 目录，修改后需重启后端
3. **数据库同步**: 开发模式自动同步，生产模式需手动迁移
4. **CORS配置**: 开发环境可设置 `CORS_ALLOW_ALL=true`
5. **日志位置**: `backend/logs/backend.log`

## 待办事项

- [ ] 添加生产环境部署配置
- [ ] 添加数据库迁移脚本
- [ ] 添加单元测试
- [ ] 添加 Docker 支持
- [ ] 添加 CI/CD 配置

## Git 信息

- **分支**: master
- **远程**: git@github.com-aisa:warsgb/aisa.git
- **Deploy Key**: ~/.ssh/aisa_deploy

---

最后更新: 2026-02-18
