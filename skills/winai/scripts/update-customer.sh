#!/bin/bash

# 更新客户档案
# 用法: ./update-customer.sh <customer_id> '<json_data>'
#
# JSON 字段（都是可选的）:
# {
#   "name": "客户名称",
#   "industry": "行业",
#   "company_size": "公司规模",
#   "description": "描述",
#   "contact_info": "{\"email\":\"\",\"phone\":\"\",\"address\":\"\",\"website\":\"\"}",
#   "background_info": "客户背景资料(MD格式)",
#   "decision_chain": "决策链(MD格式)",
#   "history_notes": "历史记录(MD格式)"
# }

source "$(dirname "$0")/config.sh"

if [ -z "$1" ]; then
    echo "错误: 请提供客户ID" >&2
    echo "用法: $0 <customer_id> '<json_data>'" >&2
    exit 1
fi

CUSTOMER_ID="$1"
JSON_DATA="$2"

# 调用 API
HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -X PUT "${AISA_API_URL}/api/mcp/customers/$CUSTOMER_ID" \
    -H "Content-Type: application/json" \
    -H "$HEADER_AUTH" \
    -d "$JSON_DATA"
