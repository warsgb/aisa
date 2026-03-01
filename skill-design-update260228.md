# Skills 搜索框架设计 - 声明式搜索

**日期**: 2026-03-01
**版本**: v1.0.0
**作者**: Claude

---

## 一、概述

### 声明式搜索架构

搜索采用**声明式公共服务模式**，彻底解决了提示词污染问题。

| 特性 | 说明 |
|------|------|
| 配置方式 | YAML frontmatter 声明 |
| 搜索触发 | 自动执行（基于配置） |
| 结果注入 | {{search_variable}} 占位符 |
| 提示词大小 | ~500 tokens |
| 维护方式 | 只需修改 YAML 配置 |

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Skill Markdown (SKILL.md)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ---                                                       │   │
│  │ slug: presale-industry-jargon                            │   │
│  │ name: 行业黑话速成指南                                     │   │
│  │ searches:                                                │   │
│  │   - name: industry_trend                                 │   │
│  │     type: industry_trend                                  │   │
│  │     query_template: "{industry}信息化最新政策..."          │   │
│  │     inject_as: search_industry_trend                      │   │
│  │     on_error: skip                                       │   │
│  │ ---                                                       │   │
│  │                                                          │   │
│  │ # 行业黑话速成指南                                         │   │
│  │                                                          │   │
│  │ {{search_industry_trend}}  ← 搜索结果注入位置              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SkillLoaderService                             │
│  1. 解析 YAML frontmatter 中的 search_configs                  │
│  2. 解析 searches 数组                                          │
│  3. 存储到数据库 (search_configs jsonb 字段)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (skills 表)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ id: uuid                                                 │   │
│  │ slug: presale-industry-jargon                           │   │
│  │ system_prompt: (技能内容，无框架引用)                     │   │
│  │ search_configs: [{                                       │   │
│  │     name: "industry_trend",                              │   │
│  │     type: "industry_trend",                              │   │
│  │     query_template: "{industry}信息化...",               │   │
│  │     inject_as: "search_industry_trend",                  │   │
│  │     on_error: "skip"                                     │   │
│  │ }]                                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SkillExecutorService                           │
│  1. 加载 skill（包含 search_configs）                         │
│  2. 检查是否有 search_configs                                   │
│  3. 调用 SearchService.executeDeclarativeSearches()             │
│  4. 替换 {{search_variable}} 占位符                            │
│  5. 执行 AI 生成                                                │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SearchService                               │
│  1. 遍历 search_configs 数组                                   │
│  2. 替换 {variable} 变量                                       │
│  3. 调用 AI Service 执行百度搜索                                 │
│  4. 格式化搜索结果                                             │
│  5. 返回 { inject_as: SearchResult }                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 SearchService

**路径**: `backend/src/common/services/search.service.ts`

```typescript
interface SearchConfig {
  name: string;           // 搜索名称
  type: string;          // 搜索类型 (industry_trend, background, etc.)
  query_template: string; // 查询模板，支持 {variable} 变量替换
  inject_as: string;      // 注入变量名 (如: search_industry_trend)
  on_error?: 'fail' | 'skip' | 'placeholder'; // 错误处理策略
  industry_type?: string; // 行业类型
  top_k?: number;        // 返回结果数量
  deep_search?: boolean; // 深度搜索
}

@Injectable()
export class SearchService {
  async executeDeclarativeSearches(
    configs: SearchConfig[],
    context: SearchContext
  ): Promise<Record<string, SearchResult>>;
}
```

#### 2.2.2 Skill 实体扩展

**路径**: `backend/src/entities/skill.entity.ts`

```typescript
@Column({ type: 'jsonb', nullable: true })
search_configs: SearchConfig[];
```

#### 2.2.3 数据库迁移

```sql
ALTER TABLE skills
ADD COLUMN IF NOT EXISTS search_configs jsonb;

CREATE INDEX IF NOT EXISTS IDX_skills_search_configs ON skills USING GIN (search_configs);
```

---

## 三、YAML 配置格式

### 3.1 基本格式

```yaml
---
slug: skill-name
name: 技能名称
searches:
  - name: <搜索名称>
    type: <搜索类型>
    query_template: <查询模板>
    inject_as: <注入变量名>
    on_error: <错误处理策略>
---
```

### 3.2 完整示例

```yaml
---
slug: presale-industry-jargon
name: 行业黑话速成指南
searches:
  - name: industry_trend
    type: industry_trend
    query_template: "{industry}信息化行业最新政策热点、标杆案例，请重点搜索最近6个月（180天）的政策、规范、指导意见和案例。"
    inject_as: search_industry_trend
    on_error: skip
    top_k: 20

parameters:
  - name: industry
    type: select
    label: 行业名称
    options:
      - label: 银行业
        value: banking
      - label: 保险业
        value: insurance
      - label: 证券业
        value: securities
      - label: 能源行业
        value: energy
      - label: 教育行业
        value: education
---

# 技能内容

## 行业热点

{{search_industry_trend}}

## 黑话三维表

...
```

### 3.3 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `searches` | 是 | 搜索配置数组 |
| `searches[].name` | 是 | 搜索名称（用于日志） |
| `searches[].type` | 是 | 搜索类型（industry_trend, background, etc.） |
| `searches[].query_template` | 是 | 查询模板，支持变量替换 |
| `searches[].inject_as` | 是 | 注入变量名，对应 {{变量名}} 占位符 |
| `searches[].on_error` | 否 | 错误处理策略：fail/skip/placeholder，默认 skip |
| `searches[].top_k` | 否 | 返回结果数量，默认 20 |
| `searches[].deep_search` | 否 | 是否深度搜索，默认 false |

---

## 四、变量替换

### 4.1 支持的变量

| 变量 | 说明 | 来源 |
|------|------|------|
| `{customer_name}` | 客户名称 | 参数或客户信息 |
| `{industry}` | 行业名称 | 参数或客户信息 |
| `{current_year}` | 当前年份 | 自动生成 |
| `{product_name}` | 产品名称 | 参数 |
| `{scenario}` | 场景 | 参数 |
| `{query}` | 查询 | 参数 |

### 4.2 示例

```yaml
# 查询模板
query_template: "{customer_name} {industry}数字化转型案例，请重点搜索最近6个月的标杆案例。"

# 实际执行时（customer_name=北京科技大学, industry=教育）
# 替换后: "北京科技大学 教育数字化转型案例，请重点搜索最近6个月的标杆案例。"
```

---

## 五、执行流程

### 5.1 完整执行流程

```
1. SkillExecutorService.executeSkill()
   │
   ▼
2. 加载 Skill (包含 search_configs)
   │
   ▼
3. 检查是否有 search_configs
   │
   ├── 有 → 执行声明式搜索
   │         │
   │         ▼
   │    3.1 SearchService.executeDeclarativeSearches()
   │         │
   │         ▼
   │    3.2 遍历 search_configs
   │         │
   │         ▼
   │    3.3 替换 {variable} 变量
   │         │
   │         ▼
   │    3.4 调用 Baidu Web Search API
   │         │
   │         ▼
   │    3.5 格式化搜索结果
   │         │
   │         ▼
   │    3.6 返回 { inject_as: SearchResult }
   │
   └── 无 → 跳过搜索
             │
             ▼
4. 替换 {{search_variable}} 占位符
   │
   ▼
5. 执行 AI 生成
```

### 5.2 错误处理策略

| 策略 | 行为 |
|------|------|
| `fail` | 搜索失败抛出异常，中断技能执行 |
| `skip` | 跳过该搜索，不注入任何内容（默认） |
| `placeholder` | 注入占位符文本：`[搜索失败: xxx]` |

---

## 六、最佳实践

### 6.1 技能设计原则

1. **配置集中管理**: 搜索配置放在 YAML frontmatter
2. **内容与实现分离**: 技能内容不包含框架说明
3. **变量命名规范**: 使用有意义的 inject_as 名称
4. **错误处理**: 根据业务需求选择合适的 on_error 策略

### 6.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| search name | snake_case | industry_trend, customer_background |
| inject_as | search_ + 描述 | search_industry_trend, search_competitor |
| query_template | {variable} + 描述 | "{customer_name} {industry}案例" |

### 6.3 错误处理建议

- **关键搜索** (影响生成质量): `on_error: fail` 或 `on_error: placeholder`
- **可选搜索** (增强信息): `on_error: skip`

---

## 七、相关文件

### 7.1 后端文件

- `backend/src/common/services/search.service.ts` - 搜索服务
- `backend/src/modules/skills/skill-executor.service.ts` - 技能执行器
- `backend/src/modules/skills/skill-loader.service.ts` - 技能加载器
- `backend/src/entities/skill.entity.ts` - Skill 实体

### 7.2 技能文件

- `skills/presale-industry-jargon/SKILL.md` - 行业黑话速成指南 (示例)

---

## 八、常见问题

### Q1: 如何调试搜索？

查看后端日志中的搜索执行记录：
```bash
tail -f backend/logs/app.log | grep SearchService
```

### Q2: 搜索失败怎么办？

1. 检查 query_template 变量是否正确填写
2. 确认 type 类型是否支持
3. 查看 on_error 策略设置
4. 检查 Baidu API 是否正常

---

## 九、技能搜索配置案例

### 9.1 教育行业客户深度研究 (education-customer-research)

```yaml
searches:
  - name: wps_cooperation_history
    type: background
    query_template: "{customer_name} WPS 合作 金山办公 案例 中标"
    inject_as: search_wps_cooperation
    on_error: skip
    top_k: 10
  - name: education_digitalization
    type: industry_trend
    query_template: "{customer_name} 智慧校园 信创 协同办公 数字化转型 信息化建设"
    inject_as: search_education_digitalization
    on_error: skip
    top_k: 15
  - name: education_bidding
    type: background
    query_template: "{customer_name} 招标 采购 协同办公 OA系统 信息化"
    inject_as: search_education_bidding
    on_error: skip
    top_k: 10
```

**使用说明**:
- `search_wps_cooperation`: 注入到"历史合作情况"章节，验证现有合作基础
- `search_education_digitalization`: 注入到行业动态分析，获取最新数字化转型信息
- `search_education_bidding`: 注入到招投标信息表，获取相关采购信息

### 9.2 金融与国企客户深度研究 (financial-customer-research)

```yaml
searches:
  - name: digital_transformation
    type: industry_trend
    query_template: "{customer_name} 数字化转型 信创 国产化 协同办公"
    inject_as: search_digital_transformation
    on_error: skip
    top_k: 15
  - name: cooperation_bidding
    type: background
    query_template: "{customer_name} 协同办公 OA系统 招标 中标 采购"
    inject_as: search_cooperation_bidding
    on_error: skip
    top_k: 10
  - name: company_annual_report
    type: background
    query_template: "{customer_name} 2025 年报 年度报告 战略规划"
    inject_as: search_annual_report
    on_error: skip
    top_k: 10
```

**使用说明**:
- `search_digital_transformation`: 注入到"数字化转型"分析章节
- `search_cooperation_bidding`: 注入到招投标信息表
- `search_annual_report`: 注入到公司基本面分析，获取年报摘要

### 9.3 财报年报战略解码 (presale-strategy-decoder)

```yaml
searches:
  - name: annual_report_search
    type: background
    query_template: "{company_name} {year} 年报 年度报告 战略规划"
    inject_as: search_annual_report
    on_error: skip
    top_k: 10
  - name: digital_strategy
    type: industry_trend
    query_template: "{company_name} 数字化转型 {year} 战略 信创 协同办公"
    inject_as: search_digital_strategy
    on_error: skip
    top_k: 10
  - name: company_news
    type: industry_trend
    query_template: "{company_name} 最新动态 信息化 CIO 办公系统"
    inject_as: search_company_news
    on_error: skip
    top_k: 10
```

**使用说明**:
- `search_annual_report`: 当用户未提供年报内容时，自动搜索年报信息
- `search_digital_strategy`: 注入到战略关键词分析，获取数字化转型战略
- `search_company_news`: 注入到最新动态分析，获取CIO观点和信息化建设动态

### 9.4 搜索配置设计原则

#### 数据源优先级理解

```
技能执行时的完整数据流：

1. [客户背景资料] ← CustomerProfile 实体
   - background_info: 背景资料（MD格式）
   - decision_chain: 决策链（MD格式）
   - history_notes: 历史笔记（MD格式）
   ↓ 自动加载（如果客户有配置）

2. [历史文档] ← 用户手动选择
   - 用户执行技能时可以选择相关历史文档
   - 文档内容会被添加到上下文中
   ↓ 用户选择

3. [百度智能搜索] ← 声明式搜索配置
   - 根据搜索配置自动执行
   - 获取最新外部信息（补充验证）
   - 结果通过 {{search_variable}} 占位符注入
   ↓ 自动执行

4. [最终提示词] = 系统提示词 + 搜索结果 + 客户背景 + 历史文档
   ↓ 传给大模型执行
```

#### 搜索类型选择

| type | 使用场景 | 示例 |
|------|---------|------|
| `background` | 历史信息、合作案例、招投标信息 | WPS合作历史、中标信息、年报 |
| `industry_trend` | 行业动态、趋势分析、战略方向 | 数字化转型、智慧校园、信创 |

#### top_k 参数设置

| 场景 | top_k 值 | 理由 |
|------|----------|------|
| 合作历史/招投标 | 10 | 精准匹配，避免噪音 |
| 行业趋势/年报 | 15 | 覆盖面广，获取更多信息 |

## 十、占位符处理与输出格式

### 10.1 问题描述

在实现声明式搜索后，发现两个输出格式问题：

1. **报告开头格式问题**
   - **现象**：报告以"⚠️ 自动注入信息（必须使用）"开头
   - **原因**：这部分是输入数据说明，不应该出现在最终报告中
   - **影响**：用户体验差，报告不够专业

2. **占位符显示问题**
   - **现象**：数据来源部分显示 `{{search_annual_report}}` 等占位符
   - **原因**：模板中的描述性文本直接引用了占位符语法
   - **影响**：搜索结果已注入但占位符仍显示在输出中

### 10.2 解决方案

#### 10.2.1 区分注入点和描述性文本

```markdown
# ✅ 保留：实际的注入点（会被替换）
{{customer_background}}
{{search_wps_cooperation}}
{{search_annual_report}}

# ❌ 修改：描述性文本中的占位符引用
# 修改前：
**数据来源**：百度搜索（{{search_education_digitalization}}）

# 修改后：
**数据来源**：百度搜索（教育数字化转型信息）
```

#### 10.2.2 添加输出格式要求

在每个技能 SKILL.md 末尾添加：

```markdown
---

## ⚠️ 输出格式要求

**重要**：在生成最终报告时，请遵循以下规则：

1. **不要包含"自动注入信息"部分**：开头的"⚠️ 自动注入信息（必须使用）"部分是输入数据说明，不要出现在最终报告中
2. **报告从核心内容开始**：最终报告的第一部分应该是核心摘要/研究目标，直接进入报告内容
3. **使用实际数据而非占位符**：
   - 不要在输出中使用 `{{customer_background}}`、`{{search_*}}` 等占位符
   - 直接使用注入的实际数据内容生成报告
4. **数据引用**：在相应表格中引用注入的数据，并在数据来源栏标注

**正确输出格式示例**：
```markdown
# [公司名称] 客户研究报告

## 核心摘要
...
（直接开始内容，不包含"自动注入信息"部分）
```
```

### 10.3 修复记录

| 技能 | 修复内容 | 状态 |
|------|---------|------|
| **financial-customer-research** | 修改4处占位符引用，添加输出格式要求 | ✅ 已完成 |
| **presale-strategy-decoder** | 修改1处占位符引用，添加输出格式要求 | ✅ 已完成 |
| **education-customer-research** | 修改8处占位符引用，添加输出格式要求 | ✅ 已完成 |

### 10.4 关键原则

1. **保留注入点**：所有 `{{placeholder}}` 注入点必须保留
2. **修改描述文本**：只修改给人看的说明文字
3. **添加格式要求**：在每个技能末尾添加输出格式说明
4. **测试验证**：修改后必须测试验证搜索注入和报告输出

---

## 十一、后续计划

- [x] 为3个高优先级技能配置声明式搜索
- [x] 修复占位符显示问题
- [x] 优化报告输出格式
- [ ] 添加更多搜索类型支持
- [ ] 实现搜索结果缓存
- [ ] 添加并行搜索优化
- [ ] 开发可视化配置编辑器
