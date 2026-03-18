#!/bin/bash

# 获取文档内容

source "$(dirname "$0")/config.sh"

DOCUMENT_ID="$1"

if [ -z "$DOCUMENT_ID" ]; then
    echo "错误: 请提供文档ID" >&2
    exit 1
fi

HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -H "$HEADER_AUTH" \
    "$AISA_API_URL/api/mcp/documents/$DOCUMENT_ID"
