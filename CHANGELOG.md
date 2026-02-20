# Changelog

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
