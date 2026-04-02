#!/bin/bash

# 更新客户背景资料（增量更新）
# 用法: ./update-customer-profile.sh <customer_id> <字段> <内容>
#
# 字段选项:
#   - background: 客户背景资料
#   - decision: 决策链
#   - history: 历史合作记录
#
# 示例:
#   ./update-customer-profile.sh "customer-id" background "新的背景内容"
#   ./update-customer-profile.sh "customer-id" decision "新的决策链信息"

source "$(dirname "$0")/config.sh"

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "错误: 参数不足" >&2
    echo "用法: $0 <customer_id> <字段> <内容>" >&2
    echo "" >&2
    echo "字段选项:" >&2
    echo "  background  - 客户背景资料" >&2
    echo "  decision   - 决策链" >&2
    echo "  history    - 历史合作记录" >&2
    exit 1
fi

CUSTOMER_ID="$1"
FIELD="$2"
CONTENT="$3"

# 字段映射
case "$FIELD" in
    "background")
        JSON_FIELD="background_info"
        ;;
    "decision")
        JSON_FIELD="decision_chain"
        ;;
    "history")
        JSON_FIELD="history_notes"
        ;;
    *)
        echo "错误: 无效的字段 '$FIELD'" >&2
        echo "有效字段: background, decision, history" >&2
        exit 1
        ;;
esac

# 构建更新数据
UPDATE_DATA="{\"$JSON_FIELD\": $(echo "$CONTENT" | jq -Rs .)}"

# 调��� API
HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

echo "正在更新客户 $CUSTOMER_ID 的 $FIELD ..." >&2

curl -s -X PUT "http://localhost:3001/api/mcp/customers/$CUSTOMER_ID" \
    -H "Content-Type: application/json" \
    -H "$HEADER_AUTH" \
    -d "$UPDATE_DATA" | jq .
