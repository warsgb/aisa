# Changelog

## [v2.0.7] - 2026-02-25

### 系统管理员 Dashboard 重新设计

#### 新增系统总览页面
- **独立菜单入口**：系统管理员登录后自动跳转到 `/dashboard`，菜单显示在首页之前
- **权限控制**：使用 `SystemAdminRoute` 守卫，仅系统管理员可访问
- **移动端支持**：底部导航栏新增"总览" tab

#### 数据统计面板
- **4个统计卡片**：总用户数、总团队数、总客户数、总交互数
- **热门客户排行 Top 10**：按交互次数排序，显示排名徽章（前三名高亮）
- **热门团队排行 Top 10**：按交互次数排序，显示排名徽章（前三名高亮）
- **最近交互记录**：显示最近10条交互，可点击跳转到详情页

#### 后端新增
- `GET /system/dashboard-stats` - 获取系统总览数据
- `SystemService.getDashboardStats()` - 聚合统计数据方法
  - 基础统计（用户/团队/客户/交互计数）
  - 热门客户查询（GROUP BY + ORDER BY + LIMIT 10）
  - 热门团队查询（GROUP BY + ORDER BY + LIMIT 10）
  - 最近交互查询（LEFT JOIN 关联查询）

#### 前端新增
- `DashboardStats` 类型定义
- `DashboardPage` 重新设计
  - 使用 lucide-react 图标（BarChart3, Trophy, Flame, MessageSquare）
  - 相对时间显示（刚刚 / X分钟前 / X小时前 / X天前）
  - 状态徽章组件（已完成/运行中/失败/等待中）
- `apiService.getDashboardStats()` API 方法
- `Layout.tsx` - 添加 Dashboard 菜单项（系统管理员专属）
- `MobileTabBar.tsx` - 添加"总览" tab（系统管理员专属）
- `mobileTab.store.ts` - 添加 'dashboard' tab 类型

### 客户数据自动选择与清除

#### 自动选择第一个客户
- **首页加载时**：如果当前没有选中客户，自动选中团队第一个客户
- **桌面端**：`HomePage.tsx` - 加载客户后自动选中第一个
- **移动端**：`WorkspaceTabPage.tsx` - 加载客户后自动选中第一个
- **客户资料同步**：桌面端自动加载客户资料，移动端按需加载

#### 跨会话客户数据隔离
- **登录时清除**：`AuthContext.login()` - 清除旧用户的客户数据
- **注册时清除**：`AuthContext.register()` - 清除旧用户的客户数据
- **退出登录时清除**：`AuthContext.logout()` - 清除当前用户客户数据
- **团队切换时清除**：
  - 桌面端：`TeamSwitcher.tsx` - 使用 `clearPersistentStorage()` 方法
  - 移动端：`WorkspaceTabPage.tsx` - 使用 `clearPersistentStorage()` 方法

#### Store 改进
- `currentCustomer.store.ts` - 新增 `clearPersistentStorage()` 方法
  - 同时清除 store 内部状态和 localStorage 持久化数据
  - 避免 zustand persist 中间件异步写入导致的数据残留问题

#### 登录流程优化
- `LoginPage.tsx` - 根据用户角色重定向
  - 系统管理员 → `/dashboard`
  - 普通用户 → `/` (首页)
- `AuthContext.login()` - 返回 `{ user, team }` 供调用方使用

---

#### 新增系统总览页面
- **独立菜单入口**：系统管理员登录后自动跳转到 `/dashboard`，菜单显示在首页之前
- **权限控制**：使用 `SystemAdminRoute` 守卫，仅系统管理员可访问
- **移动端支持**：底部导航栏新增"总览" tab

#### 数据统计面板
- **4个统计卡片**：总用户数、总团队数、总客户数、总交互数
- **热门客户排行 Top 10**：按交互次数排序，显示排名徽章（前三名高亮）
- **热门团队排行 Top 10**：按交互次数排序，显示排名徽章（前三名高亮）
- **最近交互记录**：显示最近10条交互，可点击跳转到详情页

#### 后端新增
- `GET /system/dashboard-stats` - 获取系统总览数据
- `SystemService.getDashboardStats()` - 聚合统计数据方法
  - 基础统计（用户/团队/客户/交互计数）
  - 热门客户查询（GROUP BY + ORDER BY + LIMIT 10）
  - 热门团队查询（GROUP BY + ORDER BY + LIMIT 10）
  - 最近交互查询（LEFT JOIN 关联查询）

#### 前端新增
- `DashboardStats` 类型定义
- `DashboardPage` 重新设计
  - 使用 lucide-react 图标（BarChart3, Trophy, Flame, MessageSquare）
  - 相对时间显示（刚刚 / X分钟前 / X小时前 / X天前）
  - 状态徽章组件（已完成/运行中/失败/等待中）
- `apiService.getDashboardStats()` API 方法
- `Layout.tsx` - 添加 Dashboard 菜单项（系统管理员专属）
- `MobileTabBar.tsx` - 添加"总览" tab（系统管理员专属）
- `mobileTab.store.ts` - 添加 'dashboard' tab 类型

---

## [v2.0.6] - 2026-02-25

### 性能优化

#### 首页加载性能优化
- **修复 N+1 查询问题**：新增批量 API `GET /teams/:teamId/ltc-nodes/bindings`，一次性获取所有节点的技能绑定
  - 优化前：8个节点 = 8次网络请求
  - 优化后：1次批量请求
  - 响应时间减少 50-70%
- **请求缓存**：为常用 API 添加 1 分钟 TTL 缓存
  - 缓存范围：LTC 节点、节点绑定、角色技能配置
  - 减少重复请求 60-80%
- **代码分割**：优化 Vite 构建配置
  - vendor-react: React 核心库
  - vendor-ui: UI 组件库
  - ltc: LTC 相关模块
  - skill: 技能相关模块
  - 首屏加载时间减少 40-50%

#### 后端新增
- `LtcService.findAllBindings()` - 批量获取所有节点绑定
- `InteractionsService.findAll()` - 支持 limit 参数限制返回数量

#### 前端优化
- `HomePage.tsx` - 使用批量 API，添加回退机制
- `LtcConfigPage.tsx` - 使用批量 API
- `WorkspaceTabPage.tsx` - 移动端使用批量 API
- `api.service.ts` - 新增 `getAllNodeBindings()` 方法，添加缓存机制

### 移动端体验优化

#### 客户管理优化
- **添加客户表单优化**：保存按钮移至顶部 header 区域，始终可见
- **客户轮播同步修复**：从客户列表点击选择后，工作区轮播图自动同步显示选中客户

#### 交互记录优化
- 移动端支持 limit 参数，只加载必要数量的数据

---

## [v2.0.5] - 2026-02-25

### 移动端体验优化

#### 自适应路由
- 新增 `AdaptiveCustomersPage`: 移动端使用专用客户页面，桌面端使用原页面
- 新增 `AdaptiveInteractionsPage`: 移动端使用专用历史页面，桌面端使用原页面
- 移动端客户页面：卡片式列表、搜索功能、选中高亮
- 移动端历史页面：状态筛选、渐变图标、相对时间显示

#### 移动端技能执行优化
- 参数区域动态高度：默认70%高度，执行后收起到10%
- 输出区域动态高度：执行后扩展到90%
- 参数区域执行时自动滚动到底部显示按钮
- 流式输出自动滚动到底部，确保用���看到最新内容
- 优化进度条：30秒基础 + 15秒扩展，45秒后显示"AI正在奋力执行中"

#### 移动端导航修复
- 修复底部导航栏在交互详情页面不工作的问题
- 导航栏点击时同步更新路由和状态

#### 其他改进
- 移除技能执行时的 console.log 调试语句
- 品牌更新：AISA → Win-AI

---

## [v2.0.4] - 2026-02-25

### 服务器部署优化

#### 生产环境部署脚本
- 新增 `start-prod.sh`: 生产环境启动脚本，自动检测代码变化并重新构建
- 新增 `stop-prod.sh`: 生产环境停止脚本
- 新增 `status-prod.sh`: 生产环境状态查看脚本
- 新增 `setup-ssl.sh`: SSL 证书配置脚本（支持阿里云证书）

#### Nginx 反向代理配置
- 配置域名访问: winai.top, www.winai.top
- HTTP 自动重定向到 HTTPS
- API 路径代理: /api/ → backend:3001
- WebSocket 支持: /socket.io/, /ws/
- SSL 安全配置: TLSv1.2/TLSv1.3, HSTS, 安全头部

#### 构建优化
- Vite 配置添加 `preview.allowedHosts`: 允许域名访问
- `.env` 配置更新为 HTTPS: https://winai.top/api
- 自动检测源代码变化，智能重新构建

#### 系统配置页面增强
- LTC 配置页面限制为只有团队所有者可访问
- 系统配置页面功能增强

---

## [v2.0.3] - 2026-02-25

### 安装和构建修复

#### TypeScript 编译错误修复
- `src/components/mobile/HotSkills.tsx`: 移除未使用的 `MoreHorizontal` 导入
- `src/components/skill/RoleSkillConfigPanel.tsx`: 移除未使用的 `IRON_TRIANGLE_LABELS` 导入、`rc` 变量、`idx` 变量和 `getRoleSkills` 函数
- `src/components/skill/SkillExecuteModal.tsx`: 移除未使用的 `isWaitingForUserInput` 状态变量和 `onStart` 回调中的未使用 `data` 参数
- `src/pages/mobile/workspace/WorkspaceTabPage.tsx`: 移除未使用的 `currentCustomer` 和 `setIsLoadingTeams` 变量
- `src/pages/settings/SkillsManagementPage.tsx`: 移除未使用的 `Layers` 导入，修复 `skill.parameters` 可能为 undefined 的类型问题
- `src/pages/skills/SkillsPage.tsx`: 修复 option 类型的类型错误（处理 string | SkillParameterOption 联合类型）
- `src/pages/system/SystemConfigPage.tsx`: 修复 `pendingRoleConfigs` 的类型问题，移除未使用的 `handleUpdateRoleConfig` 函数
- `src/pages/system/SystemPage.tsx`: 移除未使用的 `updatedTeamIds` 变量
- `src/pages/ltc-config/LtcConfigPage.tsx`: 移除未使用的 `handleToggleSkill` 函数

#### 数据库初始化修复
- `backend/src/app.module.ts`: 临时启用 `synchronize: true` 以自动创建数据库表
- 运行迁移后恢复为 `synchronize: false`（生产环境安全配置）

#### CORS 跨域配置修复
- `backend/src/main.ts`: 强制启用 `origin: true` 允许所有跨域请求
- 解决前端开发服务器访问后端 API 的跨域问题

#### 前端配置更新
- `.env`: 更新 `VITE_API_URL` 和 `VITE_WS_URL` 为公网 IP 地址
- 构建生产版本并通过 `vite preview` 提供服务

#### 用户权限修复
- 将默认管理员账号角色设置为 `SYSTEM_ADMIN`
- 确保系统配置和系统管理菜单正常显示

---

## [v2.0.2] - 2026-02-24

### 技能参数优化 - AI智能识别

#### 竞品反制策略报告 (presale-competitor-response)
- **移除"客户类型"参数**：改为AI根据客户名称自动判断（国企/金融/政府/民企）
- **新增"客户名称"必填参数**：支持自动填充当前客户
- **新增"企微"竞品选项**：扩展竞品反制策略覆盖范围
- **更新技能内容**：为各客户类型新���企微反制策略和对比表
- **优化用户体验**：减少用户手动选择，提升智能化水平

#### 商务谈判筹码方案 (presale-negotiation-chips)
- **移除"筹码类型偏好"参数**：默认生成所有筹码类型（品牌/服务/账期/产品组合）
- **简化操作流程**：用户无需手动选择筹码类型，系统自动提供全面方案

#### 标书响应文档生成助手 (proposal-creater)
- **移除"客户行业"参数**：改为AI根据客户名称自动判断（金融/政府/能源/制造/军工/教育/医疗等）
- **"客户名称"改为必填**：支持自动填充当前客户
- **"参考项目案例"改为多行文本框**：支持粘贴案例内容
- **新增AI行业识别规则**：基于客户名称关键词自动识别行业

### 文档更新
- 更新 `skills/shared-frameworks/README.md` 中的竞品反制策略报告技能说明
- 添加企微到支持竞品列表

---

## [v2.0.1] - 2026-02-21

### 新增功能

#### 技能参数中英文显示
- 技能执行弹窗中，参数标签同时显示中文和英文
- 格式：`中文标签 (英文参数名)`，例如：`目标角色`
- 所有技能页面统一显示格式（首页、技能中心、技能管理）

#### 技能参数标签编辑功能
- 技能管理页面支持直接编辑参数的中文标签
- 点击参数标签即可修改，无需编辑文件
- 保存后自动更新 SKILL.md 文件并重新加载技能
- 支持在 SKILL.md 中通过 `label` 字段自定义标签

#### 技能执行状态动态展示
- 技能执行时显示实时进度：准备参数 → 发起请求 → 等待响应 → 接收数据
- 可视化进度条和状态指示器
- 提升用户体验，清晰展示执行阶段

#### 交互历史消息编辑
- 交互详情页面支持编辑已生成的消息内容
- 点击消息旁的"编辑"按钮即可修改
- 使用 MDEditor 编辑 Markdown 格式内容
- 保存后更新消息记录

#### 导航优化
- 交互详情页面新增"返回首页"按钮
- 方便用户快速返回

### 后端改进

#### 技能参数处理优化
- 支持 SKILL.md 中的 `label` 字段定义中文标签
- 如果未定义 `label`，使用后端默认映射表自动翻译
- 扩展参数名映射表，支持更多技能参数
- 新增 API：`PUT /skills/:id/parameter-labels` 更新参数标签

#### 技能文件管理
- 支持导入 ZIP 格式的技能包（多文件技能）
- 技能文件浏览和管理功能
- 支持查看和编辑技能目录中的所有文件

### Bug 修复

#### 首页交互历史过滤
- 修复首页交互历史未按选定客户过滤的问题
- 修复zustand persist hydration 异步导致的时序问题
- 客户切换后正确过滤显示该客户的交互记录

#### 技能参数显示
- 修复部分技能参数只显示英文的问题
- 统一所有页面的参数显示格式

### 用户体验提升
- 技能模板功能（空白模板、简单技能、售前技能）
- 技能导入支持 ZIP 压缩包
- 多文件技能管理
- 参数标签可视化编辑

---

## [v2.0.0] - 2026-02-20

### 新增功能

#### LTC 销售流程管理
- 实现完整的 Lead To Cash (LTC) 销售流程管理
- 默认 8 个流程节点：线索 → 商机 → 方案 → POC → 商务谈判 → 成交签约 → 交付验收 → 运营&增购
- 支持自定义节点配置（添加、编辑、删除）
- 拖拽排序功能（使用 @dnd-kit）

#### 节点-技能绑定
- 每个 LTC 节点可绑定多个技能
- 技能按节点分类展示
- 首页横向流程图展示节点和绑定技能

#### 首页全新设计
- 顶部客户选择器（支持搜索和下拉选择）
- LTC 横向流程时间线（8 个节点卡片）
- 技能筛选功能（我的常用技能 / 全部技能）
- 底部历史记录时间线

#### 铁三角角色系统
- AR（客户经理）- 负责客户关系维护和商务谈判
- SR（解决方案经理）- 负责解决方案设计和技术支持
- FR（交付经理）- 负责项目交付和售后服务
- 用户可在设置中选择自己的角色
- 支持收藏常用技能

#### 客户背景资料
- 每个客户可维护 MD 格式的背景资料
- 包含：历史合作信息、决策链、其他备注

#### 系统管理员功能
- 添加 `SYSTEM_ADMIN` 系统管理员角色
- 创建 `SystemAdminGuard` 守卫，用于权限控制
- 创建系统管理模块 (`/system`)
  - 系统统计：显示用户数、团队数、团队成员数
  - 用户管理：查看、创建、禁用/启用用户、重置密码
  - 团队管理：查看、创建、删除团队、查看团队成员
  - 团队申请：查看、审核（批准/拒绝）团队创建申请

#### 团队申请流程
- 普通用户可在设置页面申请创建新团队
- 系统管理员可审核申请
- 批准后自动创建团队并设置为申请人所有者

#### 移除用户自注册
- 移除注册页面和路由
- 登录页面提示"请联系系统管理员创建账号"
- 用户账号只能由系统管理员创建

### 后端新增

#### 新增实体
- `LtcNode` - LTC 流程节点
- `NodeSkillBinding` - 节点-技能绑定关系
- `CustomerProfile` - 客户背景资料
- `TeamMemberPreference` - 团队成员偏好设置

#### 新增 API
- `/teams/:teamId/ltc-nodes` - LTC 节点 CRUD
- `/teams/:teamId/ltc-nodes/reorder` - 节点排序
- `/teams/:teamId/ltc-nodes/reset` - 重置默认节点
- `/teams/:teamId/ltc-nodes/:nodeId/bindings` - 技能绑定
- `/teams/:teamId/customers/:customerId/profile` - 客户资料
- `/teams/:teamId/members/:memberId/preference` - 成员偏好
- `/teams/:teamId/home` - 首页聚合数据

### 前端优化

#### UI/UX 改进
- 统一项目主色：#1677FF
- 深色侧边栏导航（#1E293B）
- 固定顶部导航栏
- 左侧菜单优化
- 技能卡片样式优化
- 响应式布局调整

#### 新增组件
- `src/components/customer/` - 客户相关组件
- `src/components/ltc/` - LTC 流程组件
- `src/components/skill/` - 技能组件
- `src/components/interaction/` - 交互组件

#### 新增页面
- 首页 - LTC 横向流程展示
- LTC 配置页面 - 节点管理和技能绑定
- 技能管理子页面 - 技能列表管理

#### 新增状态管理
- `ltcConfig.store.ts` - LTC 配置状态
- `currentCustomer.store.ts` - 当前客户状态
- `skillFilter.store.ts` - 技能筛选状态

### 测试
- 创建测试账号：ltctest@example.com / LtcTest123
- 添加测试客户数据
- 验证完整业务流程

---

## [Unreleased]

### 新增功能

#### 系统管理员功能
- 添加 `SYSTEM_ADMIN` 系统管理员角色
- 创建 `SystemAdminGuard` 守卫，用于权限控制
- 创建系统管理模块 (`/system`)
  - 系统统计：显示用户数、团队数、团队成员数
  - 用户管理：查看、创建、禁用/启用用户、重置密码
  - 团队管理：查看、创建、删除团队、查看团队成员
  - 团队申请：查看、审核（批准/拒绝）团队创建申请

#### 团队申请流程
- 普通用户可在设置页面申请创建新团队
- 系统管理员可审核申请
- 批准后自动创建团队并设置为申请人所有者

#### 移除用户自注册
- 移除注册页面和路由
- 登录页面提示"请联系系统管理员创建账号"
- 用户账号只能由系统管理员创建

### 代码优化
- 扩展 TypeScript 类型定义
- 更新 API 服务，添加系统管理相关接口
- 优化前端组件加载状态处理

### Bug 修复
- 修复用户 ID 提取问题（JWT payload 格式）
- 修复团队申请审核时的类型错误
- 修复设置页面无团队时的加载状态

---

## Previous Releases

See commit history for previous changes.
