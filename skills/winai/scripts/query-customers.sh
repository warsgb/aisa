#!/bin/bash

# 查询客户列表

source "$(dirname "$0")/config.sh"

TEAM_ID="$1"

# 如果没有传团队ID，使用配置中的默认团队
if [ -z "$TEAM_ID" ]; then
    if [ -n "$AISA_TEAM_ID" ]; then
        TEAM_ID="$AISA_TEAM_ID"
    else
        echo "错误: 请提供团队ID，或在配置文件中设置默认团队" >&2
        exit 1
    fi
fi

PARAMS=""
if [ -n "$2" ]; then
    PARAMS="?search=$2"
fi

HEADER_AUTH=""
if [ -n "$AISA_API_TOKEN" ]; then
    HEADER_AUTH="Authorization: Bearer $AISA_API_TOKEN"
fi

curl -s -H "$HEADER_AUTH" \
    "$AISA_API_URL/api/mcp/teams/$TEAM_ID/customers$PARAMS"
