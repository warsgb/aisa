# 技能执行上下文增强 - v2.0.2

## 发布日期
2026-02-22

## 变更摘要

增强技能执行时的上下文信息，AI 现在可以访问客户档案和引用历史文档，提供更加个性化和连贯的回复。

## 问题修复

### 1. 客户信息缺失
- **问题**: 技能执行时 AI 不知道当前处理的客户名称
- **修复**: 在技能执行时自动加载并传递客户基本信息

### 2. 客户档案未传递
- **问题**: 客户的背景资料、决策链、历史笔记等信息没有传递给 AI
- **修复**: 加载 CustomerProfile 并将所有档案信息格式化后传递给 AI

### 3. 文档引用功能未实现
- **问题**: 前端有文档选择 UI，但选中的文档没有被引用
- **修复**: 实现完整的文档引用链路，前端 → WebSocket → 后端 → AI

### 4. 依赖注入缺失
- **问题**: 添加新依赖后后端启动失败
- **修复**: 在 SkillsModule 中注册 CustomerProfile 实体

## 后端变更

### 修改的文件

#### `backend/src/modules/skills/skill-executor.service.ts`
- 新增 `Customer` 和 `CustomerProfile` repository 注入
- 新增 `referenceDocumentId` 参数到 `ExecuteSkillOptions` 接口
- 新增客户上下文加载逻辑（名称、行业、背景资料、决策链、历史笔记）
- 新增参考文档加载逻辑
- 新增调试日志用于排查问题

#### `backend/src/modules/skills/skills.module.ts`
- 新增 `CustomerProfile` 到 TypeORM.forFeature 注册

#### `backend/src/modules/skills/streaming.gateway.ts`
- 新增 `referenceDocumentId` 到 `ExecuteSkillDto` 接口
- 传递 `referenceDocumentId` 到 skill executor service

## 前端变更

### 修改的文件

#### `src/services/websocket.service.ts`
- 新增 `referenceDocumentId` 参数到 `executeSkill` 方法

#### `src/components/skill/SkillExecuteModal.tsx`
- `handleExecute`: 传递 `referenceDocumentId`
- `handleSendMessage`: 传递 `referenceDocumentId` 到后续对话

## AI 上下文格式

技能执行时，AI 会收到以下格式的上下文信息：

```
[客户信息]
客户名称: XXX公司
行业: 软件/SaaS

背景资料:
专注CRM系统，正在评估AI解决方案...

决策链:
- 张总（CTO）：技术决策者
- 李经理（产品总监）：需求发起人

历史笔记:
2024年1月首次接触，对AI功能感兴趣...

[参考文档]
标题: 需求分析报告
内容:
完整的项目需求和技术规格说明...

请基于以上上下文信息回答问题。
```

## 数据依赖

- `customers` 表: 需要包含 `name`, `industry` 字段
- `customer_profiles` 表: 需要包含 `background_info`, `decision_chain`, `history_notes` 字段
- `documents` 表: 用于文档引用功能

## 向后兼容性

- 所有变更向后兼容
- `customerId` 和 `referenceDocumentId` 均为可选参数
- 没有客户或文档时，技能仍然正常执行

## 测试建议

1. 创建测试客户并填写完整档案信息
2. 执行技能并验证 AI 知道客户名称
3. 验证 AI 使用了背景资料、决策链等信息
4. 创建历史文档并测试引用功能
5. 检查后端日志确认上下文加载成功

## 相关 Issue

- 用户反馈: 技能执行缺少客户上下文
- 用户反馈: 文档引用功能不起作用
