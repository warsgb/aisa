#!/bin/bash

# 获取客户360报告链接
# 用法: ./get-customer360-url.sh <customer_id>
#
# 返回:
#   - exists: true + preview_url (已生成)
#   - exists: false (未生成，需先调用 generate-customer360.sh)
#
# 示例:
#   ./get-customer360-url.sh "customer-id"

source "$(dirname "$0")/config.sh"

if [ -z "$1" ]; then
    echo "错误: 请提供客户ID" >&2
    echo "用法: $0 <customer_id>" >&2
    exit 1
fi

CUSTOMER_ID="$1"

HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -X GET "http://localhost:3001/api/mcp/customers/$CUSTOMER_ID/customer360" \
    -H "$HEADER_AUTH" | jq .
