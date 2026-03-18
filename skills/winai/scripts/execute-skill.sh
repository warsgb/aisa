#!/bin/bash

# 对客户执行技能

# 读取配置
source "$(dirname "$0")/config.sh"

# 获取客户ID和技能ID
CUSTOMER_ID="$1"
SKILL_ID="$2"

if [ -z "$CUSTOMER_ID" ] || [ -z "$SKILL_ID" ]; then
    echo "错误: 请提供客户ID和技能ID" >&2
    exit 1
fi

# 可选参数
PARAMS="$3"

# 调用 API
if [ -n "$PARAMS" ]; then
    curl -s \
        -X POST \
        -H "Authorization: Bearer $AISA_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PARAMS" \
        "$AISA_API_URL/api/mcp/customers/$CUSTOMER_ID/skills/$SKILL_ID/execute"
else
    curl -s \
        -X POST \
        -H "Authorization: Bearer $AISA_API_TOKEN" \
        "$AISA_API_URL/api/mcp/customers/$CUSTOMER_ID/skills/$SKILL_ID/execute"
fi
