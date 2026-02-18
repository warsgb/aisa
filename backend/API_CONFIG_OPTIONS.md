# API 配置选项

## 当前状态
❌ **代理服务不可用**: `http://www.claudecodeserver.top/api` 返回 403 Forbidden

---

## 选项 1: 使用官方 Anthropic API ⭐ 推荐

**优点**: 最稳定、最可靠
**缺点**: 需要官方 API key（可能需要付费）

### 配置方法

编辑 `/home/presales/aisa/backend/.env`:

```bash
# 获取官方 API key: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# 留空使用官方 API
ANTHROPIC_BASE_URL=

# 推荐使用 Haiku（最快、最便宜）
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# 或使用 Sonnet（平衡性能和成本）
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

重启后端:
```bash
cd /home/presales/aisa/backend
npm run restart
```

---

## 选项 2: 使用其他兼容服务

### 国内中转服务示例

**注意**: 这些服务可能不稳定，请自行验证

#### 示例 A: OpenAI 兼容格式
```bash
ANTHROPIC_API_KEY=sk-xxxxxxxxxxxxx
ANTHROPIC_BASE_URL=https://api.example.com/v1
```

#### 示例 B: 使用自定义认证
```bash
# 某些代理服务可能需要不同的 key 格式
ANTHROPIC_API_KEY=bearer_token_xxxxx
ANTHROPIC_BASE_URL=http://proxy-service.com
```

---

## 选项 3: 临时禁用 AI 功能

如果暂时无法配置 API，可以先使用其他功能：

**仍然可以使用的功能**:
- ✅ 客户管理 (Customers)
- ✅ 文档管理 (Documents)
- ✅ 交互历史 (Interactions)
- ✅ 参考资料 (References)
- ✅ 团队管理 (Teams)

**暂时禁用的功能**:
- ❌ AI 技能执行 (Skills)

---

## 故障排查

### 测试 API 连接

```bash
# 测试官方 API
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'

# 测试当前代理
curl -X POST http://www.claudecodeserver.top/api/v1/messages \
  -H "x-api-key: sk_6637fb1f..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

### 常见错误

| 错误 | 原因 | 解决方法 |
|------|------|---------|
| 403 Forbidden | API key 无效或服务拒绝 | 检查 key，联系服务商 |
| Connection refused | BASE_URL 错误 | 检查 URL 格式 |
| timeout | 网络问题 | 检查防火墙，使用代理 |

---

## 快速切换命令

### 切换到官方 API
```bash
cd /home/presales/aisa/backend
sed -i 's|^ANTHROPIC_BASE_URL=.*|# ANTHROPIC_BASE_URL=|' .env
# 然后手动设置 API_KEY
nano .env
npm run restart
```

### 切换到代理服务
```bash
cd /home/presales/aisa/backend
sed -i 's|# ANTHROPIC_BASE_URL=|ANTHROPIC_BASE_URL=http://your-proxy.com|' .env
sed -i 's|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=your-proxy-key|' .env
npm run restart
```

---

## 获取官方 API Key

1. 访问 https://console.anthropic.com/
2. 注册或登录
3. 进入 "API Keys" 页面
4. 点击 "Create Key"
5. 复制 key 格式: `sk-ant-api03-...`

---

## 注意事项

⚠️ **重要**:
- API key 是敏感信息，不要分享
- 不同服务的 key 格式可能不同
- 代理服务可能不稳定，自行评估风险
- 建议生产环境使用官方 API
