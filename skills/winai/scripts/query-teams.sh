#!/bin/bash

# 查询团队列表

source "$(dirname "$0")/config.sh"

PARAMS=""
if [ -n "$1" ]; then
    PARAMS="?search=$1"
fi

# 调用 API
HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -H "$HEADER_AUTH" \
    "$AISA_API_URL/api/mcp/teams$PARAMS"
