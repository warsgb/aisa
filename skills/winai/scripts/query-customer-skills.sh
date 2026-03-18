#!/bin/bash

# 查询客户可用的技能列表

# 读取配置
source "$(dirname "$0")/config.sh"

# 获取客户ID
CUSTOMER_ID="$1"

if [ -z "$CUSTOMER_ID" ]; then
    echo "错误: 请提供客户ID" >&2
    echo "用法: $0 <客户ID>" >&2
    exit 1
fi

# 调用 API
curl -s \
    -H "Authorization: Bearer $AISA_API_TOKEN" \
    "$AISA_API_URL/api/mcp/customers/$CUSTOMER_ID/skills"
