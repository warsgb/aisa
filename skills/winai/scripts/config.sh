#!/bin/bash

# 读取配置文件
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$SKILL_DIR/config.yml"

# 检查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "错误: 配置文件不存在，请先创建 config.yml" >&2
    echo "可以参考 assets/config-template.yml 创建配置文件" >&2
    exit 1
fi

# 读取配置（跳过注释行）
export AISA_API_URL=$(grep "^[[:space:]]*AISA_API_URL:" "$CONFIG_FILE" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '" ')
export AISA_API_TOKEN=$(grep "^[[:space:]]*AISA_API_TOKEN:" "$CONFIG_FILE" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '" ')
export AISA_TEAM_ID=$(grep "^[[:space:]]*AISA_TEAM_ID:" "$CONFIG_FILE" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '" ')

# 验证必填配置
if [ -z "$AISA_API_URL" ]; then
    echo "错误: AISA_API_URL 未配置" >&2
    exit 1
fi

# 确保本地 API 请求不走代理
export no_proxy="${no_proxy:+$no_proxy,}localhost,127.0.0.1"

# API Token 暂未启用，跳过验证
# if [ -z "$AISA_API_TOKEN" ]; then
#     echo "错误: AISA_API_TOKEN 未配置" >&2
#     exit 1
# fi
