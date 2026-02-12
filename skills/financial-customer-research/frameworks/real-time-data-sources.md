# 实时数据源使用指南

本文档详细说明招投标信息和子公司信息的获取方法、数据源使用技巧和数据时效性管理策略。

## 目录

- [招投标信息数据源](#招投标信息数据源)
- [子公司信息数据源](#子公司信息数据源)
- [数据时效性管理策略](#数据时效性管理策略)
- [API集成指南](#api集成指南)
- [最佳实践](#最佳实践)

---

## 招投标信息数据源

### 中国政府采购网

**网址**：http://www.ccgp.gov.cn

**适用对象**：
- 所有使用政府采购资金的金融机构
- 国有银行、政策性银行、地方金融平台
- 政府参股的金融机构

**搜索方法**：

#### 1. ��本搜索

**URL格式**：
```
http://www.ccgp.gov.cn/search?keywords=公司名称
```

**示例**：
- 招商银行：http://www.ccgp.gov.cn/search?keywords=招商银行
- 中国平安：http://www.ccgp.gov.cn/search?keywords=中国平安
- 中信证券：http://www.ccgp.gov.cn/search?keywords=中信证券

#### 2. 高级搜索技巧

**按时间范围筛选**：
- 最近1周：发现最新发布的项目
- 最近1月：获取近期招标机会
- 最近3月：了解采购趋势
- 最近半年：分析历史采购规律

**按地区筛选**：
- 选择公司总部所在省份
- 选择业务覆盖重点地区
- 多地区并行搜索（如总部、分公司所在地）

**按采购方式筛选**：
- 公开招标：竞争激烈，但机会公平
- 邀请招标：需要提前建立关系
- 竞争性谈判：适合定制化解决方案
- 单一来源：通常已有明确供应商

#### 3. WebReader使用方法

**配置参数**：
```json
{
  "url": "http://www.ccgp.gov.cn/search?keywords=招商银行",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": true
}
```

**关键信息提取**：

1. **项目基本信息**：
   - 项目名称：从标题提取
   - 采购单位：从公告正文提取
   - 项目编号：查找"项目编号"、"招标编号"等关键词

2. **时间信息**：
   - 公告日期：查找"公告日期"、"发布日期"等关键词
   - 投标截止日期：查找"投标截止时间"、"递交截止时间"等关键词
   - 开标日期：查找"开标时间"、"开标日期"等关键词

3. **预算信息**：
   - 预算金额：查找"预算金额"、"采购预算"、"最高限价"等关键词
   - 注意单位（万元/元）

4. **采购内容**：
   - 采购内容：查找"采购内容"、"采购需求"、"服务内容"等关键词
   - 关键词匹配：协同办公、文档管理、办公系统、国产化、信创

5. **联系信息**：
   - 联系人：查找"联系人"、"采购人"等关键词
   - 联系方式：查找"联系电话"、"电话"、"邮箱"等关键词

#### 4. 搜索关键词优化

**高价值关键词**：
```
公司名称 + 协同办公
公司名称 + 办公系统
公司名称 + 文档管理
公司名称 + 信创
公司名称 + 国产化
公司名称 + 数字化转型
公司名称 + OA系统
公司名称 + 移动办公
```

**低价值关键词**（避免）：
```
公司名称 + 核心业务系统
公司名称 + 交易系统
公司名称 + 风控系统
```
（这些与WPS 365匹配度低）

### 各省市政府采购网

**推荐采购网列表**：

| 地区 | 网址 | 适用客户 | 特点 |
|------|------|----------|------|
| 北京 | http://www.ccgp-beijing.gov.cn | 在京金融机构总部 | 项目大、要求高 |
| 上海 | http://www.ccgp-shanghai.gov.cn | 在沪金融机构总部 | 国际化、创新性强 |
| 广东 | http://www.ccgp-guangdong.gov.cn | 在粤金融机构、地方银行 | 市场化程度高 |
| 浙江 | http://www.ccgp-zhejiang.gov.cn | 在浙金融机构、城商行 | 数字化程度高 |
| 江苏 | http://www.ccgp-jiangsu.gov.cn | 在苏金融机构、农商行 | 中小企业金融 |
| 深圳 | http://www.zfcg.sz.gov.cn | 在深金融机构、招行、平安 | 创新驱动 |
| 四川 | http://www.ccgp-sichuan.gov.cn | 在川金融机构、城商行 | 西部金融中心 |
| 湖北 | http://www.ccgp-hubei.gov.cn | 在鄂金融机构 | 中部金融中心 |

**使用方法**：
1. 根据客户总部所在地选择相应采购网
2. 使用与中国政府采购网相同的搜索方法
3. 优先看市级采购网（信息更及时、更详细）

**搜索示例**：
```json
{
  "url": "http://www.zfcg.sz.gov.cn/search?keywords=招商银行",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": true
}
```

### 天眼查招投标API

**网址**：https://open.tianyancha.com

**优势**：
- 覆盖面广，包含非政府采购项目
- 历史招投标数据完整
- 提供中标趋势分析
- API接口，可批量查询

**使用成本**：
- 按调用次数收费
- 建议仅用于重大项目验证

**API调用示例**：
```json
{
  "url": "https://open.tianyancha.com/api/v2/bidding/search",
  "method": "GET",
  "params": {
    "keyword": "招商银行",
    "pageSize": 20,
    "pageIndex": 1
  },
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY"
  }
}
```

**返回数据字段**：
- 项目名称
- 采购单位
- 预算金额
- 公告日期
- 开标日期
- 中标单位
- 中标金额
- 项目状态

---

## 子公司信息数据源

### 公司官网（主要数据源，优先使用）

#### 投资者关系板块

**定位方法**：
- 通常在网站底部导航"投资者关系"（Investor Relations / IR）
- 或在顶部导航"关于我们" → "投资者关系"

**查找内容**：

1. **年度报告（Annual Report）**
   - 重点章节："企业集团构成"
   - 查找"控股子公司"、"参股公司"、"子公司情况"
   - 提取：子公司名称、持股比例、注册资本、业务范围

2. **半年度报告**
   - 重点章节："子公司情况"
   - 更新的子公司信息

3. **投资者演示材料（Presentation）**
   - 通常包含组织架构图
   - 包含主要子公司介绍

**URL示例**：
- 招商银行：https://www.cmbchina.com/IR/
- 中国平安：https://www.pingan.com/investor_relations.shtml
- 中信证券：https://www.citics.com/investor/

**WebReader使用示例**：
```json
{
  "url": "https://www.cmbchina.com/IR/",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": true
}
```

#### 公司治理板块

**定位方法**：
- 通常在"投资者关系" → "公司治理"
- 或"关于我们" → "公司治理"

**查找内容**：
- "控股子公司"（Listed Subsidiaries）
- "参股公司"（Associated Companies）
- "企业集团构成"
- 股权结构图

**WebReader使用示例**：
```json
{
  "url": "https://www.pingan.com/corporate_governance/",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": true
}
```

#### 组织架构页面

**定位方法**：
- 通常在"关于我们" → "组织架构"
- 或"公司介绍" → "组织架构"

**查找内容**：
- 组织结构图
- 子公司层级关系
- 业务板块划分
- 主要子公司介绍

**关键信息提取**：
- 识别一级子公司（直接控股）
- 识别二级子公司（间接控股）
- 区分全资子公司、控股子公司、参股公司

#### 子公司介绍页面

**定位方法**：
- 通常在"关于我们" → "子公司" / "成员公司" / "下属公司"

**查找内容**：
- 子公司名称
- 子公司简介
- 子公司官网链接
- 子公司业务范围

**WebReader使用示例**：
```json
{
  "url": "https://www.pingan.com/subsidiaries/",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": true
}
```

### WebSearch（辅助数据源）

#### 子公司搜索

**搜索关键词**：
```
公司名称 + 子公司
公司名称 + 控股子公司
公司名称 + 全资子公司
公司名称 + 参股公司
公司名称 + 企业集团构成
```

**示例**：
- `招商银行 子公司`
- `招商银行 控股子公司`
- `招商银行 全资子公司`

**搜索结果筛选**：
- 优先看官网来源
- 优先看最近1年结果
- 交叉验证多个来源

#### 最新动态搜索

**搜索关键词**：
```
公司名称 + 最新新闻
公司名称 + 动态
公司名称 + 公告
子公司名称 + 最新动态
子公司名称 + 新闻
```

**示例**：
- `招商银行 最新新闻`
- `招银资产管理 最新动态`
- `招商基金 新闻`

**搜索结果筛选**：
- 优先看最近3个月结果
- 优先看官方来源（官网、官方公众号）
- 重点关注业务动态、IT项目、战略合作

**WebSearch使用示例**：
```
搜索：招商银行 子公司
搜索：招银资产管理 最新动态
搜索：招商基金 2024
```

### 巨潮网年报（备用数据源）

**网址**：http://www.cninfo.com.cn

**关键章节**：

1. **年度报告**：
   - "企业集团构成"章节
   - "子公司情况"章节
   - "股权结构"章节

2. **半年度报告**：
   - "子公司情况"章节

3. **季度报告**：
   - 重大事项公告（如有子公司变更）

**使用方法**：

1. 在巨潮网搜索母公司名称
2. 下载最新年度报告（PDF）
3. 使用WebReader抓取或直接阅读PDF
4. 查找"企业集团构成"、"子公司"等章节

**WebReader使用示例**：
```json
{
  "url": "http://www.cninfo.com.cn/new/disclosure/detail?stockCode=600036&orgId=9900006613&announcementId=1223456789",
  "return_format": "markdown",
  "retain_images": false,
  "timeout": 30,
  "with_links_summary": false
}
```

**关键信息提取**：
- 子公司名称：从子公司清单中提取
- 持股比例：查找"持股比例"、"持股"等关键词
- 注册资本：查找"注册资本"等关键词
- 业务范围：从子公司简介中提取
- 成立时间：查找"成立日期"、"成立时间"等关键词

### 天眼查/企查查API（可选付费数据源）

#### 天眼查API

**网址**：https://open.tianyancha.com

**API端点**：
- 获取子公司列表：`/api/v2/enterprise/getSubCompanies`
- 获取企业信息：`/api/v2/enterprise/getBaseInfo`

**调用示例**：
```json
{
  "url": "https://open.tianyancha.com/api/v2/enterprise/getSubCompanies",
  "method": "GET",
  "params": {
    "id": "公司ID"
  },
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY"
  }
}
```

**返回数据字段**：
- 子公司名称
- 持股比例
- 注册资本
- 成立日期
- 法人代表
- 经营状态

#### 企查查API

**网址**：https://openapi.qcc.com

**API端点**：
- 获取子公司列表：`/API/Enterprise/getSubCompanies`
- 获取企业信息：`/API/Enterprise/getBaseInfo`

**调用示例**：
```json
{
  "url": "https://openapi.qcc.com/API/Enterprise/getSubCompanies",
  "method": "GET",
  "params": {
    "key": "YOUR_API_KEY",
    "keyword": "公司名称"
  }
}
```

**使用建议**：
- 仅用于重要项目验证
- 仅用于官网和年报信息不足时
- 注意成本控制，按需调用

---

## 数据时效性管理策略

### 招投标信息时效性管理

#### 更新频率

| 数据类型 | 更新频率 | 更新时机 | 说明 |
|----------|----------|----------|------|
| 招投标信息 | 实时 | 每次查询时 | 时效性极强，需要最新数据 |
| 项目状态 | 每日 | 每日跟踪 | 关注已关注项目的状态变化 |
| 历史趋势 | 每月 | 每月更新 | 每月更新一次趋势分析 |

#### 时效性标注

在报告中增加时效性可视化标识：
- 7天内：🟢 最新
- 7-30天：🟡 较新
- 30天以上：🔴 需更新

**标注示例**：
```markdown
**数据时效性**：🟢 最新（公告日期8天前）
```

#### 数据验证

1. **时间验证**：
   - 检查公告日期
   - 检查投标截止日期
   - 确认项目是否过期

2. **状态验证**：
   - 检查项目状态（招标中/已开标/已中标）
   - 已中标项目，记录中标单位
   - 已流标项目，分析流标原因

3. **重复验证**：
   - 同一项目可能在不同采购网发布
   - 去重处理，避免重复记录

### 子公司信息时效性管理

#### 更新频率

| 数据类型 | 更新频率 | 更新时机 | 说明 |
|----------|----------|----------|------|
| 子公司基础信息 | 季度 | 每季度更新一次 | 基础信息变化较慢 |
| 子公司IT投入 | 年度 | 年报发布后更新 | 需年报披露数据 |
| 子公司业务规模 | 季度 | 每季度更新一次 | 业务数据变化较慢 |
| 子公司最新动态 | 月度 | 每月更新一次 | 使用WebSearch获取 |

#### 时效性标注

在报告中增加时效性可视化标识：
- 90天内：🟢 最新
- 90-180天：🟡 较新
- 180天以上：🔴 需更新

**标注示例**：
```markdown
**数据时效性**：🟢 最新（2024年报数据，2024-03-26发布）
```

#### 数据验证

1. **持股比例验证**：
   - 年报披露的持股比例最准确
   - 优先使用年报数据
   - 注意年度可能有变更

2. **业务范围验证**：
   - 交叉验证官网和年报信息
   - 注意业务范围可能调整

3. **IT投入估算**：
   - 年报如有披露，优先使用年报数据
   - 年报未披露，按营收比例估算（通常IT投入占营收1%-5%）
   - 标注"估算"字样

---

## API集成指南

### 天眼查API集成

#### 注册和认证

1. 注册天眼查开放平台：https://open.tianyancha.com
2. 创建应用，获取API Key
3. 查阅API文档：https://open.tianyancha.com/doc

#### API调用示例

**Python示例**：
```python
import requests

def get_company_subsidiaries(company_name):
    url = "https://open.tianyancha.com/api/v2/enterprise/getSubCompanies"
    params = {
        "name": company_name,
        "pageSize": 100
    }
    headers = {
        "Authorization": "Bearer YOUR_API_KEY"
    }
    response = requests.get(url, params=params, headers=headers)
    return response.json()

# 使用示例
subsidiaries = get_company_subsidiaries("招商银行股份有限公司")
print(subsidiaries)
```

**Node.js示例**：
```javascript
const axios = require('axios');

async function getCompanySubsidiaries(companyName) {
  const url = 'https://open.tianyancha.com/api/v2/enterprise/getSubCompanies';
  const params = {
    name: companyName,
    pageSize: 100
  };
  const headers = {
    'Authorization': 'Bearer YOUR_API_KEY'
  };
  const response = await axios.get(url, { params, headers });
  return response.data;
}

// 使用示例
getCompanySubsidiaries('招商银行股份有限公司').then(subsidiaries => {
  console.log(subsidiaries);
});
```

#### 成本控制建议

1. **按需调用**：
   - 仅在官网和年报信息不足时调用
   - 仅用于重要客户

2. **缓存数据**：
   - 子公司信息变化较慢，缓存90天
   - 避免重复调用

3. **分页查询**：
   - 一次性获取所有数据
   - 避免多次调用

### 企查查API集成

#### 注册和认证

1. 注册企查查开放平台：https://openapi.qcc.com
2. 创建应用，获取API Key
3. 查阅API文档：https://openapi.qcc.com/doc

#### API调用示例

**Python示例**：
```python
import requests

def get_company_subsidiaries(company_name):
    url = "https://openapi.qcc.com/API/Enterprise/getSubCompanies"
    params = {
        "key": "YOUR_API_KEY",
        "keyword": company_name
    }
    response = requests.get(url, params=params)
    return response.json()

# 使用示例
subsidiaries = get_company_subsidiaries("招商银行股份有限公司")
print(subsidiaries)
```

#### 成本控制建议

与天眼查相同：
1. 按需调用
2. 缓存数据
3. 分页查询

---

## 最佳实践

### 招投标信息获取最佳实践

#### 1. 多源并行搜索

**方法**：
- 中国政府采购网 + 总部所在省市政府采购网
- 多个采购网并行搜索，提高覆盖率

**示例**：
- 招商银行（总部深圳）：中国政府采购网 + 深圳市政府采购网 + 广东省政府采购网
- 中国平安（总部深圳）：中国政府采购网 + 深圳市政府采购网

#### 2. 关键词优化

**高价值关键词组合**：
```
公司名称 + (协同办公 OR 文档管理 OR 办公系统 OR 信创 OR 国产化)
```

**低价值关键词（避免）**：
```
公司名称 + (核心业务系统 OR 交易系统 OR 风控系统)
```

#### 3. 时间筛选优先级

**优先级顺序**：
1. 最近1周：发现最新机会，及时跟进
2. 最近1月：获取近期招标机会
3. 最近3月：了解采购趋势
4. 最近半年：分析历史采购规律

#### 4. 项目跟踪

**跟踪方法**：
- 记录已关注的项目
- 每日检查项目状态更新
- 状态变化（招标中→已开标→已中标）及时更新

### 子公司信息获取最佳实践

#### 1. 多源验证

**验证顺序**：
1. 公司官网（投资者关系）→ 获取子公司列表
2. 年报（企业集团构成）→ 验证持股比例、注册资本
3. WebSearch → 获取最新动态
4. 天眼查/企查查（可选）→ 补充工商信息

#### 2. 关注100%控股子公司

**原因**：
- 100%控股子公司决策权在母公司
- 可从母公司层面统一推进
- 统一采购可能性大

#### 3. 优先级评估

**评估维度**：
1. 持股比例（30%权重）
2. IT投入规模（30%权重）
3. 业务规模（20%权重）
4. WPS 365匹配度（20%权重）

**优先级判定**：
- 高优先级：总分 ≥ 4分
- 中优先级：3分 ≤ 总分 < 4分
- 低优先级：总分 < 3分

#### 4. 持续更新

**更新频率**：
- 子公司基础信息：季度更新
- 子公司最新动态：月度更新
- IT投入规模：年度更新

### 数据质量保证

#### 1. 数据准确性

**验证方法**：
- 交叉验证多个来源
- 优先使用官方数据（官网、年报）
- 不确定的数据标注"待确认"

#### 2. 数据时效性

**时效性标注**：
- 所有数据标注获取日期
- 标注数据发布日期
- 使用可视化标识（🟢🟡🔴）

#### 3. 数据完整性

**完整性检查**：
- 关键字段必须完整（项目名称、采购单位、预算、截止日期）
- 不完整的数据标注"待补充"
- 避免过度推断

#### 4. 数据来源标注

**来源标注格式**：
```markdown
**数据来源**：[来源名称] [URL] [获取日期]
**数据时效性**：[数据发布日期]
**数据可靠性**：[高/中/低]
```

### 成本控制建议

#### 1. 优先使用免费数据源

**免费数据源（优先）**：
- 中国政府采购网
- 各省市政府采购网
- 公司官网
- 巨潮网年报
- WebSearch

**付费数据源（按需）**：
- 天眼查API
- 企查查API

#### 2. 缓存策略

**缓存时长**：
- 招投标信息：7天
- 子公司基础信息：90天
- 子公司最新动态：30天

#### 3. 批量查询

**方法**：
- 一次性获取所有数据
- 避免多次调用API
- 分页查询，一次性获取全部

---

## 常见问题

### Q1: 中国政府采购网搜索不到结果怎么办？

**A1**:
1. 检查公司名称是否准确（使用全称）
2. 尝试公司简称
3. 尝试总部所在省市政府采购网
4. 使用WebSearch补充搜索

### Q2: 年报中找不到"企业集团构成"章节怎么办？

**A2**:
1. 尝试查找"子公司"、"控股子公司"等关键词
2. 查看"公司治理"章节
3. 查看"股权结构"章节
4. 使用WebSearch搜索"公司名称 + 子公司"

### Q3: 子公司IT投入如何估算？

**A3**:
1. 优先使用年报披露数据
2. 年报未披露，按营收比例估算（IT投入占营收1%-5%）
3. 金融行业通常IT投入占营收2%-4%
4. 标注"估算"字样

### Q4: 招投标项目如何判断WPS 365匹配度？

**A4**:
1. 查看采购内容是否包含"协同办公"、"文档管理"、"办公系统"
2. 查看是否有"国产化"、"信创"要求
3. 查看预算范围（100万-1000万匹配度高）
4. 查看"技术参数"或"服务需求"章节

### Q5: 如何控制API调用成本？

**A5**:
1. 优先使用免费数据源（官网、年报、WebSearch）
2. 仅在信息不足时调用API
3. 缓存数据，避免重复调用
4. 批量查询，一次性获取全部数据

---

## 附录

### A. 各省市政府采购网完整列表

| 地区 | 网址 |
|------|------|
| 北京 | http://www.ccgp-beijing.gov.cn |
| 上海 | http://www.ccgp-shanghai.gov.cn |
| 天津 | http://www.ccgp-tianjin.gov.cn |
| 重庆 | http://www.ccgp-chongqing.gov.cn |
| 广东 | http://www.ccgp-guangdong.gov.cn |
| 浙江 | http://www.ccgp-zhejiang.gov.cn |
| 江苏 | http://www.ccgp-jiangsu.gov.cn |
| 山东 | http://www.ccgp-shandong.gov.cn |
| 四川 | http://www.ccgp-sichuan.gov.cn |
| 湖北 | http://www.ccgp-hubei.gov.cn |
| 福建 | http://www.ccgp-fujian.gov.cn |
| 湖南 | http://www.ccgp-hunan.gov.cn |
| 河南 | http://www.ccgp-henan.gov.cn |
| 河北 | http://www.ccgp-hebei.gov.cn |
| 辽宁 | http://www.ccgp-liaoning.gov.cn |
| 陕西 | http://www.ccgp-shaanxi.gov.cn |
| 深圳 | http://www.zfcg.sz.gov.cn |
| 青岛 | http://ccgp-qingdao.gov.cn |
| 大连 | http://www.ccgp.dl.gov.cn |
| 厦门 | http://ccgp-xiamen.gov.cn |
| 宁波 | http://www.ccgp.ningbo.gov.cn |

### B. 主要金融机构官网投资者关系页面

| 金融机构 | 投资者关系页面 |
|---------|---------------|
| 招商银行 | https://www.cmbchina.com/IR/ |
| 中国平安 | https://www.pingan.com/investor_relations.shtml |
| 中信证券 | https://www.citics.com/investor/ |
| 工商银行 | https://www.icbc.com.cn/icbc/%E6%8A%95%E8%B5%84%E8%80%85%E5%85%B3%E7%B3%BB/ |
| 建设银行 | https://www.ccb.com/cn/investor_relations.html |
| 农业银行 | https://www.abchina.com/cn/investor_relations/ |
| 中国银行 | https://www.boc.cn/investor_relations/ |

---

**文档版本**：v1.0
**更新日期**：2025-02-09
**维护人**：WPS 365 售前团队
