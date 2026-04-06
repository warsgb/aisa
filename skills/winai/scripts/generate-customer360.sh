#!/bin/bash

# 生成客户360报告
# 用法: ./generate-customer360.sh <customer_id>
#
# 注意: 生成过程约1-2分钟，完成后使用 get-customer360-url.sh 查询链接
#
# 示例:
#   ./generate-customer360.sh "customer-id"

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

echo "正在生成客户360报告 for customer $CUSTOMER_ID ..." >&2
echo "提示: 报告生成约需1-2分钟，请稍后使用 get-customer360-url.sh 查询链接" >&2

curl -s -X POST "http://localhost:3001/api/mcp/customers/$CUSTOMER_ID/customer360" \
    -H "Content-Type: application/json" \
    -H "$HEADER_AUTH" | jq .
