#!/bin/bash

# 添加客户跟进记录
# 用法: ./add-followup.sh <customer_id> <content>
#
# 示例:
#   ./add-followup.sh "customer-id" "今天与客户进行了初步沟通，客户对WPS 365的文档协作功能表示兴趣。"

source "$(dirname "$0")/config.sh"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "错误: 参数不足" >&2
    echo "用法: $0 <customer_id> <content>" >&2
    exit 1
fi

CUSTOMER_ID="$1"
CONTENT="$2"

HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

echo "正在添加跟进记录 for customer $CUSTOMER_ID ..." >&2

curl -s -X POST "http://localhost:3001/api/mcp/customers/$CUSTOMER_ID/followups" \
    -H "Content-Type: application/json" \
    -H "$HEADER_AUTH" \
    -d "{\"content\": $CONTENT}" | jq .
