# AISA LTC 客户销售管理系统重构项目

## 项目概述

基于Lead To Cash（LTC）销售全流程的AI客户销售管理系统重构，目标：
- 全新界面设计：一屏展示所有功能（顶部客户选择 → 中间LTC流程+技能 → 底部历史）
- 新增LTC流程管理：8个默认节点，支持自定义配置
- 节点-技能绑定：每个节点可直接展示绑定技能
- 客户背景资料：每个客户可补充MD格式的额外信息
- 极简铁三角角色：AR/SR/FR，仅用于筛选常用技能
- 技能管理：位于系统设置下的子菜单，按新UI风格重新设计
- 第三方数据对接：在客户维护页面预留前端入口

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**：NestJS + TypeORM + PostgreSQL + Socket.IO
- **AI**：支持智谱AI(GLM)和Anthropic Claude
- **UI规范**：主色#1677FF，底色#FFFFFF，辅助色#F5F7FA，全圆角卡片、轻阴影

## 团队角色与任务

---

## 产品经理 (Product)

### 职责
1. 需求细化与原型确认
2. 功能优先级排序
3. UI/UX验收标准制定
4. 用户流程验证

### 详细任务

#### 阶段一：基础数据模型
- [ ] 确认LTC流程8个默认节点名称
- [ ] 确认客户背景资料字段（历史合作、决策链等）
- [ ] 确认铁三角角色(AR/SR/FR)的技能筛选逻辑
- [ ] 确认技能执行时引用历史文档的交互流程

#### 阶段二：前端核心页面
- [ ] 确认首页布局：顶部客户选择框样式
- [ ] 确认LTC横向流程节点展示样式（滚动/平铺）
- [ ] 确认技能卡片展示样式
- [ ] 确认历史时间线样式
- [ ] 确认"我的常用技能"/"全部技能"切换交互

#### 阶段三：配置与详情
- [ ] 确认LTC配置页面拖拽排序交互
- [ ] 确认节点-技能绑定可视化勾选UI
- [ ] 确认客户维护列表第三方入口样式
- [ ] 确认系统设置-技能管理页面结构

#### 验收标准
- [ ] 编写功能验收测试用例
- [ ] 制定UI验收checklist
- [ ] 编写用户操作手册初稿

---

## 前端开发 (Frontend)

### 职责
1. React组件开发
2. 页面路由配置
3. 状态管理实现
4. UI样式实现
5. 与后端API对接

### 详细任务

#### 阶段一：后端配合（数据准备）
- [ ] **T1.1** 创建LtcNode、NodeSkillBinding、CustomerProfile、TeamMemberPreference类型定义
- [ ] **T1.2** 扩展现有Customer、SkillInteraction类型
- [ ] **T1.3** 在api.service.ts添加所有新API接口方法

#### 阶段二：前端核心
- [ ] **T2.1** 创建Zustand stores:
  - currentCustomerStore（当前客户状态）
  - ltcConfigStore（LTC流程配置）
  - skillFilterStore（技能过滤：ALL/AR/SR/FR）
- [ ] **T2.2** 重构MainLayout组件：
  - 添加顶部客户搜索选择框(CustomerSearchSelect)
  - 添加技能切换按钮(SkillFilterToggle)
  - 添加LTC配置入口按钮
- [ ] **T2.3** 创建CustomerSearchSelect组件：
  - 下拉显示团队所有客户
  - 支持模糊搜索
  - 选中显示"当前客户：XXX"
  - 支持清除选择
- [ ] **T2.4** 创建HomePage首页：
  - 未选择客户时显示引导提示
  - LTC横向流程展示区(LtcProcessTimeline)
  - 底部历史时间线(InteractionTimeline)
- [ ] **T2.5** 创建LtcProcessTimeline组件：
  - 8个横向节点卡片
  - 节点内技能列表展示
  - 横向滚动容器
- [ ] **T2.6** 创建SkillCard组件：
  - 技能标题（加粗）+ 描述（灰色小字）+ 执行按钮
- [ ] **T2.7** 创建SkillExecuteModal弹窗：
  - 参数输入表单（动态生成）
  - 引用文档选择器
  - 流式输出区域
- [ ] **T2.8** 创建InteractionTimeline组件：
  - 按时间倒序展示历史记录
  - 显示节点、技能名称、执行时间

#### 阶段三：配置与详情
- [ ] **T3.1** 创建LtcConfigPage页面：
  - 节点列表拖拽排序
  - 节点名称/描述编辑
  - 节点-技能绑定配置
  - 重置默认/保存按钮
- [ ] **T3.2** 集成@dnd-kit实现拖拽排序
- [ ] **T3.3** 创建节点-技能绑定可视化组件
- [ ] **T3.4** 改造客户维护页面：
  - 卡片式列表
  - 预留第三方数据入口UI（天眼查按钮，暂不实现功能）
- [ ] **T3.5** 创建系统设置-技能管理子页面：
  - 技能列表管理
  - 按新UI风格重新设计
- [ ] **T3.6** 创建客户背景资料编辑组件

#### 阶段四：优化
- [ ] **T4.1** 实现铁三角角色筛选功能
- [ ] **T4.2** 优化横向滚动体验
- [ ] **T4.3** UI样式统一和微调
- [ ] **T4.4** 响应式适配（移动端）

### 关键文件路径
- 类型定义：`src/types/index.ts`
- API服务：`src/services/api.service.ts`
- 状态管理：`src/stores/`
- 布局组件：`src/components/layout/MainLayout.tsx`
- 首页：`src/pages/home/HomePage.tsx`
- LTC配置：`src/pages/ltc-config/LtcConfigPage.tsx`
- 技能管理：`src/pages/settings/SkillsManagementPage.tsx`
- 客户维护：`src/pages/customers/CustomersPage.tsx`

---

## 后端开发 (Backend)

### 职责
1. 数据库实体设计
2. REST API开发
3. WebSocket流式输出维护
4. AI服务集成

### 详细任务

#### 阶段一：数据模型
- [ ] **B1.1** 创建LtcNode实体：
  ```typescript
  // backend/src/entities/ltc-node.entity.ts
  - id: uuid
  - team_id: string (外键Team)
  - name: string
  - order: number
  - description: string
  - created_at, updated_at
  ```
- [ ] **B1.2** 创建NodeSkillBinding实体：
  ```typescript
  // backend/src/entities/node-skill-binding.entity.ts
  - id: uuid
  - node_id: string (外键LtcNode)
  - skill_id: string (外键Skill)
  - order: number
  ```
- [ ] **B1.3** 创建CustomerProfile实体：
  ```typescript
  // backend/src/entities/customer-profile.entity.ts
  - id: uuid
  - customer_id: string (外键Customer, unique)
  - background_info: text (MD格式)
  - decision_chain: text (MD格式)
  - history_notes: text (MD格式)
  - metadata: jsonb
  ```
- [ ] **B1.4** 创建TeamMemberPreference实体：
  ```typescript
  // backend/src/entities/team-member-preference.entity.ts
  - id: uuid
  - team_member_id: string (外键TeamMember)
  - iron_triangle_role: enum (AR/SR/FR)
  - favorite_skill_ids: jsonb
  ```
- [ ] **B1.5** 修改Customer实体：添加ltc_context字段(jsonb)
- [ ] **B1.6** 修改SkillInteraction实体：添加node_id字段

#### 阶段二：API开发
- [ ] **B2.1** 创建LTC模块 `backend/src/modules/ltc/`:
  - GET /teams/:teamId/ltc-nodes - 获取LTC流程配置
  - POST /teams/:teamId/ltc-nodes - 创建节点
  - PUT /teams/:teamId/ltc-nodes/:id - 更新节点
  - DELETE /teams/:teamId/ltc-nodes/:id - 删除节点
  - PUT /teams/:teamId/ltc-nodes/reorder - 批量更新顺序
  - POST /teams/:teamId/ltc-nodes/reset - 重置为默认8节点

- [ ] **B2.2** 创建节点-技能绑定API:
  - GET /teams/:teamId/ltc-nodes/:nodeId/bindings
  - POST /teams/:teamId/ltc-nodes/:nodeId/bindings
  - DELETE /teams/:teamId/ltc-nodes/:nodeId/bindings/:bindingId

- [ ] **B2.3** 创建客户背景资料API:
  - GET /teams/:teamId/customers/:customerId/profile
  - PUT /teams/:teamId/customers/:customerId/profile

- [ ] **B2.4** 创建用户偏好API:
  - GET /teams/:teamId/members/:memberId/preference
  - PUT /teams/:teamId/members/:memberId/preference

- [ ] **B2.5** 创建首页数据聚合API:
  - GET /teams/:teamId/home - 返回：客户列表、LTC配置、常用技能

- [ ] **B2.6** 修改技能执行接口：
  - 添加nodeId参数
  - 添加referenceDocumentId参数

#### 阶段三：集成
- [ ] **B3.1** 创建系统设置-技能管理相关API：
  - 技能CRUD
  - 技能审核状态管理

#### 关键文件路径
- 实体：`backend/src/entities/`
- LTC模块：`backend/src/modules/ltc/`
- 客户模块：`backend/src/modules/customers/`
- 团队模块：`backend/src/modules/teams/`
- 首页API：`backend/src/modules/home/`
- 技能执行：`backend/src/modules/skills/skill-executor.service.ts`

---

## 测试工程师 (QA)

### 职责
1. 测试用例编写
2. 功能测试执行
3. 回归测试
4. Bug跟踪验证

### 详细任务

#### 阶段一：测试准备
- [ ] **Q1.1** 编写数据库实体测试用例
- [ ] **Q1.2** 编写API接口测试用例（Postman/curl）
- [ ] **Q1.3** 准备测试数据：
  - 测试团队和用户
  - 测试客户数据
  - 测试LTC流程配置
  - 测试技能数据

#### 阶段二：功能测试
- [ ] **Q2.1** LTC流程配置测试：
  - 创建/编辑/删除节点
  - 节点排序
  - 重置默认
- [ ] **Q2.2** 节点-技能绑定测试：
  - 添加/移除绑定
  - 绑定顺序
- [ ] **Q2.3** 首页功能测试：
  - 客户选择
  - LTC节点展示
  - 技能执行
  - 历史记录展示
- [ ] **Q2.4** 技能执行测试：
  - 参数输入
  - 文档引用
  - 流式输出

#### 阶段三：集成测试
- [ ] **Q3.1** 客户背景资料测试：
  - 编辑/保存
  - 技能执行时引用
- [ ] **Q3.2** 铁三角角色测试：
  - 角色切换
  - 常用技能筛选
- [ ] **Q3.3** 客户维护测试：
  - CRUD操作
  - 第三方入口UI验证
- [ ] **Q3.4** 技能管理测试：
  - 技能列表
  - 审核流程

#### 阶段四：回归与验收
- [ ] **Q4.1** 完整回归测试（现有功能不受影响）
- [ ] **Q4.2** 性能测试（大量客户/技能场景）
- [ ] **Q4.3** UI验收测试（对比Figma设计）
- [ ] **Q4.4** Bug修复验证

### 测试用例模板
```markdown
## [功能名称] 测试用例

### 用例1：[场景描述]
- **前置条件**：[setup]
- **操作步骤**：
  1. [step1]
  2. [step2]
- **预期结果**：[expected]
- **实际结果**：[actual]
- **状态**：Pass/Fail
```

---

## 里程碑与依赖

### 里程碑1：数据模型完成（后端）
- 验收标准：所有实体创建完成，基础API可调用
- 依赖：后端完成B1.1-B1.6

### 里程碑2：核心页面完成（前端）
- 验收标准：首页完整可用，客户可选择，LTC流程展示，技能可执行
- 依赖：前端完成T2.1-T2.8，后端完成B2.1-B2.5

### 里程碑3：配置功能完成
- 验收标准：LTC配置页面完整，客户维护页面完整
- 依赖：前端完成T3.1-T3.6，后端完成B2.1-B2.5

### 里程碑4：上线验收
- 验收标准：所有功能测试通过，UI验收通过
- 依赖：测试完成Q4.1-Q4.4

---

## 关键决策记录

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 拖拽排序库 | @dnd-kit | React 19兼容，社区活跃 |
| 状态管理 | Zustand | 轻量，TypeScript友好 |
| Markdown编辑 | @uiw/react-md-editor | 已有依赖，满足需求 |
| 客户360 | 暂不做 | 产品确认 |

---

## Figma设计参考

- **首页**：https://www.figma.com/design/qFR7FOjCjOyocOfv0kxUrF/LTC%E8%AE%BE%E8%AE%A1?node-id=4-310
- **客户维护**：https://www.figma.com/design/qFR7FOjCjOyocOfv0kxUrF/LTC%E8%AE%BE%E8%AE%A1?node-id=5-854
- **LTC流程配置**：https://www.figma.com/design/qFR7FOjCjOyocOfv0kxUrF/LTC%E8%AE%BE%E8%AE%A1?node-id=5-1163

---

## 沟通机制

1. **每日站会**：每个角色同步进度，阻塞问题及时升级
2. **周报**：里程碑进度汇总
3. **代码审查**：PR必须经过至少1人review
4. **文档更新**：重大变更同步更新本文档
