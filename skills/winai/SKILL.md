---
name: winai
description: winai 客户销售管理系统。支持团队/客户/技能/文档的查询，以及创建客户、执行LTC技能，获取客户最新的文档等
---

# AISA 客户文档管理

## 配置

`config.yml` 位于技能根目录，使用前需 `source scripts/config.sh` 加载。
其中包含了 请求的地址、token、team_id 这些关键信息


## 技能描述

winai客户销售管理系统的  技能，提供以下核心功能：

### 核心功能

1. **团队管理**
   - 查询用户所属的团队列表
   - 支持按名称搜索团队

2. **客户管理**
   - 查询团队下的客户列表
   - 支持按名称搜索客户
   - 创建新客户并自动触发 AI 调研

3. **技能管理**
   - 查询团队可用的 LTC 技能列表
   - 查询客户可用的技能列表
   - 支持按名称搜索技能

4. **文档管理**
   - 查询客户的文档列表
   - 获取文档详情
   - 获取技能产出的最新文档

5. **LTC技能执行**
   - 执行 LTC 技能（异步）
   - 支持传入参数和消息
   - **重要**：执行技能时需要客户ID（UUID格式），如果只有客户名称，需要先查询。
   - **使用脚本**: `scripts/query-customers.sh <team_id> <客户名称>`


### 适用场景

- **售前客户研究**：查询客户信息，执行研究技能
- **客户信息维护**：创建客户，更新客户背景资料
- **技能自动化**：执行LTC技能，生成分析报告
- **文档管理**：查询技能产出，获取最新分析结果


## 查询和写入的相关参数

### 查询

| 脚本 | 用法 | 说明 |
|------|------|------|
| `query-teams.sh` | 无参数 | 团队列表 |
| `query-customers.sh <team_id> [search]` | 必传团队 ID | 客户列表 |
| `query-skills.sh [team_id] [search]` | 团队ID可选（用config默认值） | 团队LTC技能列表 |
| `query-customer-skills.sh <customer_id>` | 必传客户 ID | 客户可用LTC技能列表 |
| `query-docs.sh <customer_id>` | 必传客户 ID | 客户文档列表 |
| `get-document.sh <doc_id>` | 必传文档 ID | 文档详情 |

### 写入

| 脚本 | 用法 | 说明 |
|------|------|------|
| `create-customer.sh <team_id> '<json>'` | JSON: `{"name":"公司","industry":"行业"}` | 创建客户并触发AI调研（异步） |
| `execute-skill.sh <customer_id> <skill_id> ['<json>']` | 可选JSON参数，如 `{"message":"提示"}` | 执行LTC技能（异步） |
| `get-latest-doc.sh <customer_id> <skill_id>` | — | 获取技能产出的最新文档 |

### 调用示例

```bash
cd ~/.openclaw/skills/winai
source scripts/config.sh
bash scripts/query-teams.sh
bash scripts/query-skills.sh "team-uuid" "分析"
bash scripts/create-customer.sh "team-uuid" '{"name":"测试公司","industry":"科技"}'
bash scripts/execute-skill.sh "customer-uuid" "skill-uuid"
bash scripts/get-latest-doc.sh "customer-uuid" "skill-uuid"
```


## ⚠️ 重要提示

1. **customer_id 必须是 UUID**
   - 不能直接使用客户名称
   - 必须先通过 `query-customers.sh` 查询获取
   - 错误示例：`execute-skill.sh "招商银行" "破冰话题库"` ❌
   - 正确示例：`execute-skill.sh "customer-uuid-123" "破冰话题库"` ✅

2. **skill_id 支持两种格式**
   - UUID: `abc-123-def-456`
   - 中文名称: `破冰话题库`（推荐，更易记）

3. **异步执行**
   - 创建客户和执行技能都是异步操作
   - 立即返回结果，但实际执行在后台进行
   - 需要等待 30 秒到数分钟后使用 `get-latest-doc.sh` 获取结果

## 注意

- 异步操作（创建客户、执行技能）立即返回，后台运行
- AI调研约2-3分钟，技能执行约30秒到数分钟，完成后用 `get-latest-doc.sh` 获取结果
- `fullteam` 不是有效的团队ID参数，需逐个查询