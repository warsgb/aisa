#!/bin/bash

# 获���客户详细信息和背景资料
# 用法: ./get-customer-info.sh <customer_id>

source "$(dirname "$0")/config.sh"

if [ -z "$1" ]; then
    echo "错误: 请提供客户ID" >&2
    echo "用法: $0 <customer_id>" >&2
    exit 1
fi

CUSTOMER_ID="$1"

# ���用 API 获取客户列表，然后找到匹配的客户
HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

# 获取所有客户（因为MCP API没有单个客户的查询接口）
CUSTOMERS=$(curl -s -X GET "$AISA_API_URL/api/mcp/teams/$AISA_TEAM_ID/customers" \
    -H "$HEADER_AUTH")

# 从客户列表中找到匹配的客户并输出 ltc_context
echo "$CUSTOMERS" | jq ".[] | select(.id == \"$CUSTOMER_ID\") | {
  id,
  name,
  industry,
  ltc_context: (.ltc_context // {})
}"
