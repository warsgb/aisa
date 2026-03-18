#!/bin/bash

# 查询团队的可执行技能列表

# 读取配置
source "$(dirname "$0")/config.sh"

# 获取团队ID
TEAM_ID="$1"

if [ -z "$TEAM_ID" ]; then
    # 如果没有提供团队ID，使用配置文件中的默认值
    if [ -n "$AISA_TEAM_ID" ]; then
        TEAM_ID="$AISA_TEAM_ID"
    else
        echo "错误: 请提供团队ID" >&2
        echo "用法: $0 <团队ID> [搜索关键词]" >&2
        echo "或者在 config.yml 中设置 AISA_TEAM_ID" >&2
        exit 1
    fi
fi

# 可选的搜索关键词
SEARCH="$2"

# 调用 API
if [ -n "$SEARCH" ]; then
    curl -s \
        -H "Authorization: Bearer $AISA_API_TOKEN" \
        "$AISA_API_URL/api/mcp/teams/$TEAM_ID/skills?search=$SEARCH"
else
    curl -s \
        -H "Authorization: Bearer $AISA_API_TOKEN" \
        "$AISA_API_URL/api/mcp/teams/$TEAM_ID/skills"
fi
