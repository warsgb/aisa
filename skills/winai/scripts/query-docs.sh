#!/bin/bash

# 查询客户文档列表

source "$(dirname "$0")/config.sh"

CUSTOMER_ID="$1"

if [ -z "$CUSTOMER_ID" ]; then
    echo "错误: 请提供客户ID" >&2
    exit 1
fi

HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -H "$HEADER_AUTH" \
    "$AISA_API_URL/api/mcp/customers/$CUSTOMER_ID/documents"
