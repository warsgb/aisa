#!/bin/bash

# 获取客户背景资料
# 用法: ./get-customer-profile.sh <customer_id>

source "$(dirname "$0")/config.sh"

if [ -z "$1" ]; then
    echo "错误: 请提供客户ID" >&2
    echo "用法: $0 <customer_id>" >&2
    exit 1
fi

CUSTOMER_ID="$1"

# 调用 API
HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

# 先获取完整客户信息
CUSTOMER_DATA=$(curl -s -X GET "${AISA_API_URL}/api/mcp/customers/$CUSTOMER_ID/documents" \
    -H "$HEADER_AUTH")

# 提取 ltc_context 中的背景资料
echo "$CUSTOMER_DATA" | jq '[.[] | select(.document_type == "customer_profile") | .content][0] // "未找到客户背景资料"'
