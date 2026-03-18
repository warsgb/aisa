#!/bin/bash

# 创建客户并启动AI调研

# 读���配置
source "$(dirname "$0")/config.sh"

# 获取团队ID
TEAM_ID="$1"

if [ -z "$TEAM_ID" ]; then
    echo "错误: 请提供团队ID" >&2
    exit 1
fi

# 读取客户数据（JSON格式）
CUSTOMER_DATA="$2"

if [ -z "$CUSTOMER_DATA" ]; then
    echo "错误: 请提供客户数据（JSON格式）" >&2
    echo "示例: {\"name\":\"测试公司\",\"industry\":\"科技\"}" >&2
    exit 1
fi

# 调用 API
curl -s \
    -X POST \
    -H "Authorization: Bearer $AISA_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CUSTOMER_DATA" \
    "$AISA_API_URL/api/mcp/teams/$TEAM_ID/customers"
