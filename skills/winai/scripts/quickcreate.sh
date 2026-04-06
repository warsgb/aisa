#!/bin/bash

# quickcreate - 一键客户创建并执行技能链
#
# 用法: ./quickcreate.sh <客户名称> [行业]
#
# 完整流程：
#   1. 检查客���是否已存在（按名称搜索）
#   2. 不存在则创建客户（含AI调研）
#   3. 按顺序执行3个技能（每个等待完成后执行下一个）：
#      - 金融与国企客户深度研究
#      - 需求挖掘分析（面向CIO/技术负责人）
#      - 高层拜访故事线（面向CIO/技术负责人）
#   4. 生成客户360报告
#   5. 等待报告生成完成
#
# 整个过程约需10-20分钟
#
# 示例:
#   ./quickcreate.sh "招商银行" "金融"
#   ./quickcreate.sh "测试公司"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ---------- 参数解析 ----------
CUSTOMER_NAME="$1"
INDUSTRY="${2:-}"

if [ -z "$CUSTOMER_NAME" ]; then
    echo "错误: 请提供客户名称" >&2
    echo "用法: $0 <客户名称> [行业]" >&2
    exit 1
fi

# ---------- 常量 ----------
TEAM_ID="${AISA_TEAM_ID:-}"
API_URL="${AISA_API_URL:-http://localhost:3001}"
API_TOKEN="${AISA_API_TOKEN:-}"
POLL_INTERVAL=20   # 秒
POLL_TIMEOUT=3600  # 单次操作最大等待秒数（1小时，保险值）

# 三个技能名称（支持中文名）
SKILL_1="金融与国企客户深度研究"
SKILL_2="需求挖掘分析"
SKILL_3="高层拜访故事线"
SKILL_2_PARAMS='{"target_role":"cio"}'
SKILL_3_PARAMS='{"target_role":"cio"}'

# ---------- 工具函数 ----------
log() {
    echo "[$(date '+%H:%M:%S')] $*" >&2
}

header() {
    echo "" >&2
    echo "========================================" >&2
    echo "$*" >&2
    echo "========================================" >&2
}

fail() {
    echo "错误: $*" >&2
    exit 1
}

# 调用 API（支持相对路径，自动拼接 API_URL）
api_get() {
    local path="$1"
    if [ -n "$API_TOKEN" ]; then
        curl -s -H "Authorization: Bearer $API_TOKEN" "${API_URL}${path}"
    else
        curl -s "${API_URL}${path}"
    fi
}

api_post() {
    local path="$1"
    local data="$2"
    if [ -n "$API_TOKEN" ]; then
        curl -s -X POST -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" -d "$data" "${API_URL}${path}"
    else
        curl -s -X POST -H "Content-Type: application/json" -d "$data" "${API_URL}${path}"
    fi
}

# ---------- 轮询函数 ----------
# poll_interaction_status <customer_id> <skill_id_or_name> <expected_status>
# 等待指定客户+技能的 interaction 状态变为指定值（COMPLETED 或 FAILED）
poll_interaction_status() {
    local customer_id="$1"
    local skill_id="$2"
    local expected_status="$3"
    local elapsed=0

    log "开始轮询 interaction 状态，目标: ${expected_status}"

    while [ $elapsed -lt $POLL_TIMEOUT ]; do
        local response
        response=$(curl -s -H "Authorization: Bearer $API_TOKEN" "${API_URL}/api/mcp/customers/${customer_id}/skills/${skill_id}/interaction-status")

        # 检查是否为有效 JSON（空响应说明 interaction 还未创建，继续等待）
        if [ -z "$response" ]; then
            log "等待 interaction 创建..."
            sleep $POLL_INTERVAL
            elapsed=$((elapsed + POLL_INTERVAL))
            continue
        fi
        if ! echo "$response" | jq -e . >/dev/null 2>&1; then
            log "API 返回无效响应，10秒后重试..."
            sleep 10
            elapsed=$((elapsed + 10))
            continue
        fi

        local status
        status=$(echo "$response" | jq -r '.status // "NOT_FOUND"')
        local iid
        iid=$(echo "$response" | jq -r '.interaction_id // ""')

        log "当前状态: ${status} (elapsed: ${elapsed}s)"

        if [ "$status" = "$expected_status" ]; then
            log "技能执行完成，interaction_id: ${iid}"
            return 0
        fi

        if [ "$status" = "FAILED" ] || [ "$status" = "CANCELLED" ]; then
            fail "技能执行失败，状态: ${status}"
        fi

        # PENDING / RUNNING，继续等待
        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
    done

    fail "轮询超时（${POLL_TIMEOUT}s），技能未完成"
}

# ---------- 步骤1：检查/创建客户 ----------
header "步骤1：检查/创建客户"

if [ -z "$TEAM_ID" ]; then
    fail "未配置团队ID，请在 config.yml 中设置 AISA_TEAM_ID，或作为第一个参数传入"
fi

log "搜索客户: ${CUSTOMER_NAME}"

CUSTOMER_SEARCH=$(api_get "/api/mcp/teams/${TEAM_ID}/customers?search=$(echo "$CUSTOMER_NAME" | jq -Rs @uri | sed 's/%0A$//')")
CUSTOMER_COUNT=$(echo "$CUSTOMER_SEARCH" | jq 'length' 2>/dev/null || echo 0)

log "搜索到 ${CUSTOMER_COUNT} 个匹配客户"

if [ "$CUSTOMER_COUNT" -gt 0 ] 2>/dev/null; then
    CUSTOMER_ID=$(echo "$CUSTOMER_SEARCH" | jq -r '.[0].id')
    CUSTOMER_EXISTS_NAME=$(echo "$CUSTOMER_SEARCH" | jq -r '.[0].name')
    log "客户已存在，ID: ${CUSTOMER_ID}，名称: ${CUSTOMER_EXISTS_NAME}"
else
    log "客户不存在，创建新客户..."

    if [ -n "$INDUSTRY" ]; then
        create_data="{\"name\":\"${CUSTOMER_NAME}\",\"industry\":\"${INDUSTRY}\",\"triggerAutoResearch\":true}"
    else
        create_data="{\"name\":\"${CUSTOMER_NAME}\",\"triggerAutoResearch\":true}"
    fi

    log "创建客户数据: ${create_data}"
    CREATE_RESULT=$(api_post "/api/mcp/teams/${TEAM_ID}/customers" "$create_data")

    CUSTOMER_ID=$(echo "$CREATE_RESULT" | jq -r '.customer.id // empty')
    if [ -z "$CUSTOMER_ID" ]; then
        fail "创建客户失败: $(echo "$CREATE_RESULT" | jq .)"
    fi

    log "客户创建成功，ID: ${CUSTOMER_ID}，后续步骤将自动触发AI调研和分析"
fi

echo "CUSTOMER_ID=${CUSTOMER_ID}"

# ---------- 步骤2：执行技能1 - 金融与国企客户深度研究 ----------
header "步骤2：执行技能 - ${SKILL_1}"

log "执行技能: ${SKILL_1}"
EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_1}/execute" "{}")
log "执行响应: $(echo "$EXEC_RESULT" | jq .)"

poll_interaction_status "$CUSTOMER_ID" "$SKILL_1" "COMPLETED"

# 获取生成的文档
log "获取技能1产出文档..."
DOC1=$(api_get "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_1}/latest-document")
DOC1_ID=$(echo "$DOC1" | jq -r '.id // empty')
if [ -n "$DOC1_ID" ] && [ "$DOC1_ID" != "null" ]; then
    log "文档1 ID: ${DOC1_ID}"
else
    log "未找到文档1，可能技能未生成文档，继续执行下一个技能"
    DOC1_ID=""
fi

# ---------- 步骤3：执行技能2 - 需求挖掘分析 ----------
header "步骤3：执行技能 - ${SKILL_2}"

log "执行技能: ${SKILL_2}"
if [ -n "$DOC1_ID" ]; then
    EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_2}/execute" \
        "{\"referenceDocumentIds\":[\"${DOC1_ID}\"],\"target_role\":\"cio\"}")
else
    EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_2}/execute" \
        "$SKILL_2_PARAMS")
fi
log "执行响应: $(echo "$EXEC_RESULT" | jq .)"

poll_interaction_status "$CUSTOMER_ID" "$SKILL_2" "COMPLETED"

# 获取文档2
log "获取技能2产出文档..."
DOC2=$(api_get "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_2}/latest-document")
DOC2_ID=$(echo "$DOC2" | jq -r '.id // empty')
if [ -n "$DOC2_ID" ] && [ "$DOC2_ID" != "null" ]; then
    log "文档2 ID: ${DOC2_ID}"
else
    log "未找到文档2，继续执行下一个技能"
    DOC2_ID=""
fi

# ---------- 步骤4：执行技能3 - 高层拜访故事线 ----------
header "步骤4：执行技能 - ${SKILL_3}"

log "执行技能: ${SKILL_3}"
if [ -n "$DOC1_ID" ] && [ -n "$DOC2_ID" ]; then
    EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_3}/execute" \
        "{\"referenceDocumentIds\":[\"${DOC1_ID}\",\"${DOC2_ID}\"],\"target_role\":\"cio\"}")
elif [ -n "$DOC1_ID" ]; then
    EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_3}/execute" \
        "{\"referenceDocumentIds\":[\"${DOC1_ID}\"],\"target_role\":\"cio\"}")
else
    EXEC_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/skills/${SKILL_3}/execute" \
        "$SKILL_3_PARAMS")
fi
log "执行响应: $(echo "$EXEC_RESULT" | jq .)"

poll_interaction_status "$CUSTOMER_ID" "$SKILL_3" "COMPLETED"

# ---------- 步骤5：生成客户360报告 ----------
header "步骤5：生成客户360报告"

log "触发360报告生成..."
GEN_RESULT=$(api_post "/api/mcp/customers/${CUSTOMER_ID}/customer360" "{}")
log "生成响应: $(echo "$GEN_RESULT" | jq .)"

# 轮询等待360报告就绪
log "等待报告生成完成（约1-2分钟）..."
C360_ELAPSED=0
C360_TIMEOUT=300

while [ $C360_ELAPSED -lt $C360_TIMEOUT ]; do
    C360_STATUS=$(api_get "/api/mcp/customers/${CUSTOMER_ID}/customer360")
    C360_EXISTS=$(echo "$C360_STATUS" | jq -r '.exists')
    C360_URL=$(echo "$C360_STATUS" | jq -r '.preview_url // empty')

    log "360报告状态: exists=${C360_EXISTS} (elapsed: ${C360_ELAPSED}s)"

    if [ "$C360_EXISTS" = "true" ]; then
        log "360报告已就绪: ${C360_URL}"
        break
    fi

    sleep 15
    C360_ELAPSED=$((C360_ELAPSED + 15))
done

if [ "$C360_EXISTS" != "true" ]; then
    log "警告: 360报告生成超时，但流程已完成"
fi

# ---------- 完成 ----------
header "quickcreate 完成"

echo ""
echo "========== 执行结果 =========="
echo "客户ID:   ${CUSTOMER_ID}"
echo "客户名称: ${CUSTOMER_NAME}"
echo "文档1:    ${DOC1_ID:-（无）}"
echo "文档2:    ${DOC2_ID:-（无）}"
echo "360报告:  ${C360_URL:-（生成中，请稍后查询）}"
echo ""
echo "360报告预览: ${API_URL}${C360_URL}"
echo "================================"
