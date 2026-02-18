# Claude API 配置说明

## 配置文件位置
`/home/presales/aisa/backend/.env`

## 配置项说明

### 1. ANTHROPIC_API_KEY (必需)
**说明**: Anthropic API 密钥
**获取方式**: 访问 https://console.anthropic.com/ 注册并创建 API Key
**示例**:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

### 2. ANTHROPIC_BASE_URL (可选)
**说明**: 自定义 API 端点地���
**用途**:
- 使用代理服务
- 使用兼容的第三方API
- 测试环境

**默认值**: 官方 Anthropic API (https://api.anthropic.com)

**示例**:
```bash
# 使用官方API（留空即可）
ANTHROPIC_BASE_URL=

# 使用自定义代理
ANTHROPIC_BASE_URL=https://your-proxy.com/v1

# 使用其他兼容服务
ANTHROPIC_BASE_URL=https://api.example.com/anthropic
```

### 3. ANTHROPIC_MODEL (可选)
**说明**: 默认使用的 Claude 模型
**选项**:
- `claude-3-5-sonnet-20241022` - Sonnet 3.5 (推荐，平衡性能和速度)
- `claude-3-5-haiku-20241022` - Haiku 3.5 (最快，成本最低)
- `claude-3-opus-20240229` - Opus 3 (最强大，但较慢)

**默认值**: `claude-3-5-sonnet-20241022`

**示例**:
```bash
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 4. ANTHROPIC_MAX_TOKENS (可选)
**说��**: 响应最大令牌数
**范围**: 1 - 8192
**默认值**: `4096`

**示例**:
```bash
ANTHROPIC_MAX_TOKENS=4096
```

### 5. ANTHROPIC_TEMPERATURE (可选)
**说明**: 响应随机性，控制创造性
**范围**: 0.0 - 1.0
- `0.0` - 最确定，输出一致
- `0.7` - 平衡（推荐）
- `1.0` - 最随机，创造性最强

**默认值**: `0.7`

**示例**:
```bash
ANTHROPIC_TEMPERATURE=0.7
```

## 完整配置示例

### 使用官方 Anthropic API
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
ANTHROPIC_BASE_URL=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7
```

### 使用代理服务
```bash
ANTHROPIC_API_KEY=your-proxy-api-key
ANTHROPIC_BASE_URL=https://api.proxy-service.com/v1
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7
```

### 高性能配置（使用 Haiku，速度快）
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
ANTHROPIC_BASE_URL=
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
ANTHROPIC_MAX_TOKENS=2048
ANTHROPIC_TEMPERATURE=0.5
```

## 修改配置后

### 1. 编辑 .env 文件
```bash
cd /home/presales/aisa/backend
nano .env
```

### 2. 重启后端服务
```bash
npm run stop
npm run start
```

或使用快捷命令：
```bash
npm run restart
```

## 故障排查

### 错误: 403 Your request was blocked
**原因**: API Key 未配置或无效
**解决**: 检查 `ANTHROPIC_API_KEY` 是否正确设置

### 错误: Cannot connect to API
**原因**: Base URL 配置错误或网络问题
**解决**:
1. 检查 `ANTHROPIC_BASE_URL` 格式
2. 尝试留空使用官方API
3. 检查网络连接

### 错误: Model not found
**原因**: 模型名称错误
**解决**: 使用支持的模型名称（见上文选项）

## 安全提示

⚠️ **重要**:
- 不要将 `.env` 文件提交到 Git
- 不要分享 API Key
- 定��轮换 API Key
- 生产环境使用环境变量而非文件

## 成本优化

使用不同模型的成本对比（每百万令牌）:
- **Haiku 3.5**: $0.80 / $0.80 (最快)
- **Sonnet 3.5**: $3.00 / $15.00 (推荐)
- **Opus 3**: $15.00 / $75.00 (最强大)

建议：
- 开发/测试: 使用 Haiku
- 生产环境: 使用 Sonnet 3.5
- 复杂任务: 使用 Opus
