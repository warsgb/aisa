---
name: winai
description: winai
---

# AISA 客户文档管理技能

## 功能说明

本技能用于查询和管理 AISA 客户销售管理系统中的客户文档资料，包括：

### 查询功能
- 团队列表
- 客户列表
- LTC技能列表
- 文档列表
- 文档详细内容

### 写入功能
- 创建客户并触发AI自动调研
- 对客户执行LTC技能（异步）
- 获取客户某LTC技能的最新文档

## 配��

首次使用前，需要在技能目录下创建 `config.yml` 配置文件：

```yaml
# AISA API 配置
AISA_API_URL: "http://localhost:3001"
AISA_API_TOKEN: "your-api-token-here"
AISA_TEAM_ID: ""  # 可选：默认团队ID，或 "fullteam" 查询所有团队
```

## 使用步骤

### 查询功能

#### 1. 列出团队
选择「列出团队」，查看��有可用的团队列表。

#### 2. 列出客户
选择「列出客户」，指定团队ID（可留空使用配置默认值），查看该团队的客户列表。

#### 3. 列出LTC技能
选择「列出LTC技能」，查看团队中所有可执行的LTC技能列表。支持按名称或描述搜索LTC技能。

#### 4. 列出文档
选择「列出文档」，指定客户ID，查看该客户的文档列表。

#### 5. 查看文档
选择「查看文档」，指定文档ID，获取文档的详细内容。

### 写入功能

#### 6. 创建客户（带AI自动调研）
选择「创建客户」，填写客户信息：
- **团队ID**：目标团队
- **客户名称**：必填，至少2个字符
- **行业**：可选
- **公司规模**：可选
- **描述**：可选
- **触发AI调研**：默认开启

创建成功后，AI将自动在后台调研该客户，耗时2-3分钟。

#### 7. 执行LTC技能
选择「执行LTC技能」，指定：
- **客户ID**：目标客户
- **LTC技能ID**：要执行的LTC技能
- **参数**：可选，技能特定参数
- **消息**：可选，用户指令

LTC技能将在后台异步执行，立即返回执行确认。

#### 8. 获取最新文档
选择「获取最新文档」，指定：
- **客户ID**：目标客户
- **LTC技能ID**：查询该LTC技能的最新产出文档

返回该客户执行该LTC技能后生成的最新文档，如无则返回null。

## 使用场景示例

### 场景1：查询并执行LTC技能
```bash
cd scripts

# 1. 查询团队
./query-teams.sh

# 2. 查询LTC技能列表
./query-skills.sh {teamId}

# 3. 搜索特定LTC技能
./query-skills.sh {teamId} "分析"

# 4. 找到LTC技能ID后，执行LTC技能
./execute-skill.sh {customerId} {skillId}
```

### 场景2：批量导入客户
```bash
cd scripts
./create-customer.sh {teamId} '{"name":"示例公司","industry":"软件开发","company_size":"50-200人"}'
```

### 场景2：自动化客户分析
```bash
# 1. 创建客户
./create-customer.sh {teamId} '{"name":"目标公司","industry":"科技"}'

# 2. 等待AI调研完成（2-3分钟）
sleep 180

# 3. 执行分析LTC技能
./execute-skill.sh {customerId} {skillId} '{"message":"请分析这个客户的竞争对手"}'

# 4. 等待技能完成（1-2分钟）
sleep 120

# 5. 获取分析报告
./get-latest-doc.sh {customerId} {skillId}
```

### 场景3：定期客户跟进
```bash
# 对多个客户执行跟进LTC技能
for customer_id in "id1" "id2" "id3"; do
  ./execute-skill.sh $customer_id {skillId}
  echo "已对客户 $customer_id 发起跟进LTC技能"
done
```

## 注意事项

- API Token 需要从 AISA 系统管理员处获取
- 团队ID、客户ID、文档ID 可以通过前序查询步骤获得
- 配置文件中的 `AISA_TEAM_ID` 设置为 `fullteam` 时，默认查询所有团队
- **异步操作**：创建客户和执行LTC技能采用"即发即忘"模式，立即返回确认，后台异步执行
- **AI调研**：创建客户时默认触发AI自动调研，可在参数中设置为false关闭
- **LTC技能执行**：LTC技能执行完成后，可通过"获取最新文档"接口获取结果

## 测试脚本

可以直接执行脚本测试：

```bash
# 测试查询团队
cd scripts
./query-teams.sh

# 测试查询客户（需要团队ID）
./query-customers.sh <team-id>

# 测试创建客户
./create-customer.sh <team-id> '{"name":"测试公司","industry":"科技"}'

# 测试执行LTC技能
./execute-skill.sh <customer-id> <skill-id>

# 测试获取最新文档
./get-latest-doc.sh <customer-id> <skill-id>
```

## 技术说明

### 异步执行模式
写入操作（创建客户、执行LTC技能）采用异步"即发即忘"模式：
- API调用立即返回，无需等待后台操作完成
- AI调研和技能执行在后台异步运行
- 可通过查询接口检查操作结果

### API端点
- `GET /api/mcp/teams` - 查询团队
- `GET /api/mcp/teams/:teamId/customers` - 查询客户
- `GET /api/mcp/customers/:customerId/documents` - 查询文档
- `GET /api/mcp/documents/:id` - 查看文档详情
- `POST /api/mcp/teams/:teamId/customers` - 创建客户
- `POST /api/mcp/customers/:customerId/skills/:skillId/execute` - 执行LTC技能
- `GET /api/mcp/customers/:customerId/skills/:skillId/latest-document` - 获取最新文档

### 详细的API文档
请参考：`backend/MCP_API_REFERENCE.md`
