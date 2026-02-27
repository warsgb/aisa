# WinAI Skills 体系说明

本文档说明 WinAI 项目中 Skills 体系的结构、使用方法和扩展规范。

---

## 目录结构

```
skills/
├── shared-frameworks/          # 共享框架文件
│   ├── README.md              # 框架使用指南
│   ├── wps-365-capabilities.md # WPS 365 产品能力清单
│   ├── industry-pain-points.md # 行业痛点库
│   ├── competitor-analysis.md  # 竞品分析库
│   ├── decision-chain-framework.md # 决策链分析框架
│   ├── objection-defense-framework.md # 异议攻防框架
│   ├── negotiation-chips-framework.md # 商务谈判筹码框架
│   ├── requirements-discovery-framework.md # 需求发现框架
│   └── project-case-studies.md # 项目案例库
│
├── presale-strategy-decoder/   # NO.01 财报年报战略解码
├── presale-tech-stack-detect/  # NO.02 技术栈侦探
├── presale-industry-jargon/    # NO.03 行业黑话速成
├── presale-competitor-response/# NO.04 竞品"杀手锏"反制
├── presale-elevator-pitch/     # NO.05 "电梯演讲"生成器
├── presale-executive-storyline/ # NO.06 高层拜访故事线规划
├── presale-requirements-discovery/ # NO.07 需求发现 SPIN 向导
├── presale-objection-simulator/ # NO.08 异议攻防模拟器
├── presale-negotiation-chips/  # NO.09 商务谈判筹码
├── presale-icebreaker-topics/  # NO.11 破冰话题库
├── financial-customer-research/ # NO.10 财报客户调研
├── viral-title-generator/      # NO.12 病毒标题生成器
├── contract-analyzer/          # 合同分析器（待完善）
├── proposal-creater/           # 方案建议书生成器（待完善）
└── test-skill/                 # 测试技能模板
```

---

## 核心概念

### Skill（技能）

每个 Skill 是一个独立的售前工具，包含：
- **SKILL.md**：技能定义文件，定义技能名称、描述、触发条件、执行流程
- **README.md**：技能使用说明，包含功能介绍、使用示例
- **examples/**：示例文件（可选）
- **frameworks/**：私有框架文件（可选）

### Shared Framework（共享框架）

共享框架是多个 Skill 共同引用的知识库文件，确保：
1. **数据一致性**：所有 Skill 使用相同的产品信息、案例数据
2. **易于维护**：集中管理，一次更新，全局生效
3. **快速引用**：Skill 通过 `@filename` 语法引用框架内容

---

## 12 个核心技能

### NO.01 财报年报战略解码 (presale-strategy-decoder)

**用途**：从客户年报/战略规划中提取销售机会

**核心功能**：
- 提取战略关键词（降本增效/合规风控/数字创新/安全可信）
- 深度推理业务痛点
- 匹配 WPS 365 解决方案
- 生成三种话术（初次见面/方案汇报/投标答辩）

**使用示例**：
```
"帮我分析招商银行2025年年报"
"解码国家电网的战略规划"
```

**依赖框架**：
- `wps-365-capabilities.md`
- `industry-pain-points.md`

---

### NO.02 技术栈侦探 (presale-tech-stack-detect)

**用途**：从 JD（职位描述）推断客户技术架构

**核心功能**：
- 识别技术栈（编程语言/数据库/中间件/认证/部署）
- 识别技术债务信号
- 分析 WPS 365 部署兼容性
- 生成技术对接话术

**使用示例**：
```
"帮我分析这个JD：[JD文本]"
"从招商银行的JD推断技术栈"
```

**依赖框架**：
- `wps-365-capabilities.md`

---

### NO.03 行业黑话速成 (presale-industry-jargon)

**用途**：快速掌握行业术语建立信任

**核心功能**：
- 提供行业四级分类体系
- 黑话三维表（黑话/解释/用法/风险）
- 装懂红线（避免露怯）
- 万能句式

**使用示例**：
```
"银行行业的常用术语有哪些？"
"保险业黑话速成"
```

**依赖框架**：
- `industry-pain-points.md`

---

### NO.04 竞品"杀手锏"反制 (presale-competitor-response)

**用途**：FUD 策略应对竞品优势

**核心功能**：
- 分析竞品优势和弱点
- FUD 策略应用（捧杀-转折-重构）
- AI 自动判断客户类型
- 针对性反制话术

**支持竞品**：微软 365、飞书、钉钉、企微、石墨、腾讯文档

**使用示例**：
```
"客户说微软 365 更好用，怎么回应？"
"飞书和 WPS 365 的区别是什么？"
```

**依赖框架**：
- `wps-365-capabilities.md`
- `competitor-analysis.md`
- `project-case-studies.md`

---

### NO.05 "电梯演讲"生成器 (presale-elevator-pitch)

**用途**：生成 30 秒销售话术

**核心功能**：
- 基于金字塔原理
- 三套钩子（焦虑/贪婪/愿景）
- 针对不同角色定制
- 口语化转换

**使用示例**：
```
"给我一个向 CEO 介绍的话术"
"金融行业 CIO 的 30 秒话术"
```

**依赖框架**：
- `wps-365-capabilities.md`
- `decision-chain-framework.md`
- `project-case-studies.md`

---

### NO.06 高层拜访故事线规划 (presale-executive-storyline)

**用途**：生成针对 CXO 级别高层的拜访故事线

**核心功能**：
- 技术痛点升华为商业指标
- SCQA/QSCA 故事线框架
- 北极星方案（一句话）
- 针对高层四大关注点（影响力/业务增长/安全/提效）

**使用示例**：
```
"帮我分析北京建工，并生成 CEO 拜访故事线"
"快速生成金融行业 CEO 故事线"
```

**依赖框架**：
- `wps-365-capabilities.md`
- `decision-chain-framework.md`
- `project-case-studies.md`

---

### NO.07 需求发现 SPIN 向导 (presale-requirements-discovery)

**用途**：生成 SPIN 问题脚本，挖掘客户潜在需求

**核心功能**：
- SPIN 模型（背景/难点/影响/价值）
- 根据客户角色和行业定制问题
- 生成开放式和封闭式问题组合
- 提供问题优先级和提问顺序

**使用示例**：
```
"帮我准备银行 CIO 的需求调研问题"
"生成制造业 CEO 的 SPIN 提问脚本"
```

**依赖框架**：
- `requirements-discovery-framework.md`

---

### NO.08 异议攻防模拟器 (presale-objection-simulator)

**用途**：AI 角色扮演挑剔客户，提供异议应对训练

**核心功能**：
- AI 扮演各种类型挑剔客户
- 多轮攻防对话，持续追问
- 教练复盘模式，提供专业点评
- 心态脱敏训练

**使用示例**：
```
"帮我模拟一个技术控CIO，我在推销混合云方案"
"模拟信创强硬派CEO，我在推销私有化部署"
```

**依赖框架**：
- `objection-defense-framework.md`

---

### NO.09 商务谈判筹码 (presale-negotiation-chips)

**用途**：生成非货币筹码交换方案

**核心功能**：
- 四大筹码类型（服务/品牌/账期/产品组合）
- 基于客户角色精准匹配筹码
- 配套专业谈判话术
- 心理学原理支撑

**使用示例**：
```
"CEO要求降20%，我底线10%，帮我设计谈判筹码"
"客户咬死价格，有哪些非货币筹码可以用"
```

**依赖框架**：
- `negotiation-chips-framework.md`

---

### NO.10 财报客户调研 (financial-customer-research)

**用途**：从财报分析客户财务状况和采购潜力

**核心功能**：
- 分析财报关键指标（营收/利润/现金流）
- 评估客户采购预算和能力
- 识别客户财务风险信号
- 生成客户调研报告

**使用示例**：
```
"帮我分析招商银行的财报"
"评估某上市公司的采购能力"
```

**依赖框架**：
- 私有框架文件（templates/、frameworks/）

---

### NO.11 破冰话题库 (presale-icebreaker-topics)

**用途**：生成安全连接的破冰话题

**核心功能**：
- 四大话题类型（地域文化/行业正能量/角色导向/万能话题）
- 低认知门槛、高情绪价值
- 敏感话题红线提醒
- 根据地区、行业、角色精准匹配

**使用示例**：
```
"和上海金融客户吃饭，准备些破冰话题"
"北京政府客户商务晚餐的话题"
```

---

### NO.12 病毒标题生成器 (viral-title-generator)

**用途**：生成吸引眼球的营销标题

**核心功能**：
- 多种标题模板库
- 基于内容自动生成标题
- A/B 测试标题对比
- 标题优化建议

**使用示例**：
```
"帮我生成一篇关于WPS 365的文章标题"
"优化这个标题的吸引力"
```

---

## 8 个共享框架

### 1. wps-365-capabilities.md

WPS 365 产品能力清单，包含：
- **核心产品能力**：文档协作、企业沟通、云存储、表单收集、AI 助手、在线会议、多维表格
- **安全能力**：七重权限、部署方式、安全认证
- **行业方案能力**：金融、政府国企、能源、制造、教育、医疗
- **四大价值主张**：安全、效率、合规、成本
- **话术模板库**

**被引用技能**：
- presale-strategy-decoder
- presale-tech-stack-detect
- presale-industry-jargon
- presale-competitor-response
- presale-elevator-pitch
- presale-executive-storyline

---

### 2. industry-pain-points.md

行业痛点库，包含：
- **金融行业**：银行（系统割裂、合规压力、分支机构协作）、保险（代理人管理、保单管理）、证券（投研效率、风控）
- **政府与国企**：信创合规压力、系统集成、数据安全
- **能源行业**：内网隔离、知识管理、合规要求
- **制造业**：研发网隔离、复杂文档解析
- **军工行业**：跨院所协作、国家分保合规
- **教育/医疗**：分级权限、数据安全

**被引用技能**：
- presale-strategy-decoder
- presale-industry-jargon

---

### 3. competitor-analysis.md

竞品分析库，包含：
- **主流竞品快速定位表**：微软 365、飞书、钉钉、腾讯会议、企业微信
- **每个竞品的核心优势、典型弱点、反制策略**
- **客户类型 × ��制策略矩阵**：国企/金融/政府/民企
- **捧杀话术模板库**：公允版/过渡版/危机版

**被引用技能**：
- presale-competitor-response

---

### 4. decision-chain-framework.md

决策链分析框架，包含：
- **不同角色的关注点**：CEO/CIO/业务负责人/IT经理/采购负责人
- **决策链条分析**：大型企业/中小企业/金融机构
- **沟通策略建议**：自上而下/自下而上/多点突破
- **角色钩子库**：焦虑版/贪婪版/愿景版
- **口语化转换规则**
- **高层四大关注点详解**：影响力/业务增长/安全/提效

**被引用技能**：
- presale-elevator-pitch
- presale-executive-storyline

---

### 5. objection-defense-framework.md

异议攻防框架，包含：
- **客户角色详细定义**：技术控CIO/务实CEO/合规狂人等
- **异议攻击矩阵**：数据安全/竞品对比/成本质疑等
- **对话控制流程**和教练复盘框架
- **攻击策略和强度说明**

**被引用技能**：
- presale-objection-simulator

---

### 6. negotiation-chips-framework.md

商务谈判筹码框架，包含：
- **四大筹码类型库**：服务/品牌/账期/产品组合
- **角色适配矩阵**：CEO/采购负责人/CIO等
- **谈判话术模板库**
- **心理学原理详解**：互惠/社会认同/损失厌恶/锚定效应/稀缺性

**被引用技能**：
- presale-negotiation-chips

---

### 7. requirements-discovery-framework.md

需求发现框架，包含：
- **SPIN 模型详解**：背景/难点/影响/价值问题
- **行业定制化问题库**
- **角色定制化问题库**
- **问题优先级和提问顺序**

**被引用技能**：
- presale-requirements-discovery

---

### 8. project-case-studies.md

项目案例库（新增），包含：
- **27个标杆案例**：覆盖金融、政府国企、能源、制造、军工、教育、医疗等8大行业
- **结构化案例信息**：客户名称、行业、规模、建设内容、应用效果、客户评价
- **多维度检索索引**：
  - 按行业检索
  - 按价值检索（降本增效、效率提升、协同改善、安全合规）
  - 按痛点检索（系统割裂、数据安全、协作效率、信创合规）

**典型量化效果**：
- 温州银行：信息流动效率提升50%
- 明亚保险经纪：跨平台操作成本降低80%
- 永盈基金：投研数据提炼效率提升300%+
- 中集集团：资源占用下降50%，运维成本降低60%
- 国家电网：月活105万+

**被引用技能**：
- presale-elevator-pitch
- presale-executive-storyline
- presale-competitor-response
- proposal-creater

---

## 使用场景矩阵

| 场景 | 推荐使用 | 输出内容 |
|------|----------|----------|
| 准备客户拜访 | 财报年报战略解码 + 行业黑话速成 | 销售机会 + 行业术语 |
| 准备高层拜访 | 高层拜访故事线规划 + 财报年报战略解码 | SCQA 故事线 + 北极星方案 |
| 技术对接准备 | 技术栈侦探 | 技术架构 + 对接话术 |
| 应对竞品竞争 | 竞品"杀手锏"反制 | 反制话术 + 竞品对比表 |
| 电梯演讲准备 | "电梯演讲"生成器 | 30秒话术（三种钩子） |
| 快速了解行业 | 行业黑话速成 | 行业术语 + 使用指南 |
| 需求挖掘准备 | 需求发现 SPIN 向导 | SPIN 提问脚本 |
| 异议应对训练 | 异议攻防模拟器 | 模拟对话 + 教练复盘 |
| 商务谈判僵局 | 商务谈判筹码 | 非货币筹码方案 + 谈判话术 |
| 客户财务分析 | 财报客户调研 | 财务状况 + 采购能力评估 |
| 社交应酬破冰 | 破冰话题库 | 地域文化 + 行业话题 + 角色话题 |

---

## 技能开发规范

### SKILL.md 结构

每个技能的 SKILL.md 应包含：

```markdown
# 技能名称

## 技能描述
简短描述（1-2句话）

## 触发条件
- 触发条件1
- 触发条件2

## 核心功能
- 功能1
- 功能2
- 功能3

## 执行流程
1. 步骤1
2. 步骤2
3. 步骤3

## 引用框架
- @shared-frameworks/xxx.md

## 输出格式
- 格式要求

## 质量检查
- 检查项1
- 检查项2
```

### 引用共享框架

在 SKILL.md 中使用 `@filename` 语法引用共享框架：

```markdown
## 引用框架
- @shared-frameworks/wps-365-capabilities.md
- @shared-frameworks/industry-pain-points.md
```

---

## 扩展指南

### 创建新技能

1. 在 `skills/` 目录创建新文件夹
2. 创建 `SKILL.md` 和 `README.md`
3. 如需共享数据，添加到 `shared-frameworks/`
4. 如需私有框架，在技能文件夹内创建 `frameworks/`

### 创建新共享框架

1. 在 `shared-frameworks/` 创建新的 `.md` 文件
2. 在 `shared-frameworks/README.md` 中添加说明
3. 在相关技能的 SKILL.md 中添加引用

---

## 后续扩展方向

以下场景尚未实现，可作为后续扩展：

1. **招投标分析**：从招标文件中提取关键信息
2. **痛点诊断问卷**：生成客户调研问卷
3. **方案大纲生成**：根据客户信息生成方案框架
4. **竞品对比表**：生成 WPS 365 vs 竞品对比表
5. **ROI 计算器**：量化 WPS 365 的投资回报
6. **客户拜访议程**：生成会议议程和话术
7. **成功案例匹配**：匹配最相关的成功案例（已有案例库）
8. **售前邮件模板**：生成各类售前邮件
9. **演示脚本生成**：生成产品演示脚本
10. **需求调研报告**：整理需求调研信息
11. **POC 方案生成**：生成概念验证方案
12. **合同条款分析**：分析合同风险条款

---

## 质量检查清单

使用 skills 后，请检查以下项目：

- [ ] 数据来源标注
- [ ] 置信度评分
- [ ] 风险提示
- [ ] 后续行动建议
- [ ] 话术自然流畅
- [ ] 价值证明量化

---

## 版本历史

- **v1.2** (2026-02-23)：新增 `project-case-studies.md` 案例库
- **v1.1** (2026-02-11)：完善技能使用指南
- **v1.0** (2026-02-XX)：初始化 12 个核心技能 + 7 个共享框架

---

**维护者**：WinAI 售前团队
**最后更新日期**：2026-02-23
