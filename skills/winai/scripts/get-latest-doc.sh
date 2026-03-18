#!/bin/bash

# 获取客户某技能的最新文档

# 读取配置
source "$(dirname "$0")/config.sh"

# 获取客户ID和技能ID
CUSTOMER_ID="$1"
SKILL_ID="$2"

if [ -z "$CUSTOMER_ID" ] || [ -z "$SKILL_ID" ]; then
    echo "错误: 请提供客户ID和技能ID" >&2
    exit 1
fi

# 调用 API
curl -s \
    -H "Authorization: Bearer $AISA_API_TOKEN" \
    "$AISA_API_URL/api/mcp/customers/$CUSTOMER_ID/skills/$SKILL_ID/latest-document"
