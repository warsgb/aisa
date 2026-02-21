#!/bin/bash

# AISA LTC 重构项目 API 测试脚本
# 使用方法: ./api-test.sh [base_url] [token]
# 示例: ./api-test.sh http://localhost:3001/api your_jwt_token

BASE_URL="${1:-http://localhost:3001/api}"
TOKEN="${2:-test_token}"
TEAM_ID="test-team-001"

echo "========================================="
echo "AISA LTC API 测试脚本"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "Team ID: $TEAM_ID"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASS=0
FAIL=0

# 测试函数
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Pass (HTTP $http_code)${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ Fail (HTTP $http_code)${NC}"
        echo "Response: $body"
        ((FAIL++))
    fi
    echo ""
}

# ============================================
# LTC 节点 API 测试
# ============================================
echo "========================================="
echo "LTC 节点 API 测试"
echo "========================================="

# 获取LTC节点列表
test_api "GET" "/teams/$TEAM_ID/ltc-nodes" "" "获取LTC节点列表"

# 创建节点
test_api "POST" "/teams/$TEAM_ID/ltc-nodes" '{
    "name": "测试节点",
    "order": 9,
    "description": "测试描述"
}' "创建LTC节点"

# 更新节点
test_api "PUT" "/teams/$TEAM_ID/ltc-nodes/node-001" '{
    "name": "更新后的节点名称",
    "description": "更新后的描述"
}' "更新LTC节点"

# 批量排序
test_api "PUT" "/teams/$TEAM_ID/ltc-nodes/reorder" '{
    "nodes": [
        {"id": "node-001", "order": 2},
        {"id": "node-002", "order": 1}
    ]
}' "批量排序节点"

# ============================================
# 节点-技能绑定 API 测试
# ============================================
echo "========================================="
echo "节点-技能绑定 API 测试"
echo "========================================="

# 获取节点绑定
test_api "GET" "/teams/$TEAM_ID/ltc-nodes/node-001/bindings" "" "获取节点技能绑定"

# 创建绑定
test_api "POST" "/teams/$TEAM_ID/ltc-nodes/node-001/bindings" '{
    "skill_id": "skill-003",
    "order": 3
}' "创建节点-技能绑定"

# ============================================
# 客户资料 API 测试
# ============================================
echo "========================================="
echo "客户资料 API 测试"
echo "========================================="

# 获取客户资料
test_api "GET" "/teams/$TEAM_ID/customers/cust-001/profile" "" "获取客户资料"

# 更新客户资料
test_api "PUT" "/teams/$TEAM_ID/customers/cust-001/profile" '{
    "background_info": "# 更新后的背景信息\n\n这是测试",
    "decision_chain": "# 决策链\n\n- 决策者1\n- 决策者2",
    "history_notes": "# 历史\n\n测试历史"
}' "更新客户资料"

# ============================================
# 成员偏好 API 测试
# ============================================
echo "========================================="
echo "成员偏好 API 测试"
echo "========================================="

# 获取成员偏好
test_api "GET" "/teams/$TEAM_ID/members/tm-ar-001/preference" "" "获取成员偏好"

# 更新成员偏好
test_api "PUT" "/teams/$TEAM_ID/members/tm-ar-001/preference" '{
    "iron_triangle_role": "AR",
    "favorite_skill_ids": ["skill-001", "skill-002", "skill-005"]
}' "更新成员偏好"

# ============================================
# 首页数据 API 测试
# ============================================
echo "========================================="
echo "首页数据 API 测试"
echo "========================================="

# 获取首页数据
test_api "GET" "/teams/$TEAM_ID/home" "" "获取首页聚合数据"

# ============================================
# 技能执行 API 测试
# ============================================
echo "========================================="
echo "技能执行 API 测试"
echo "========================================="

# 执行技能
test_api "POST" "/teams/$TEAM_ID/skills/skill-001/execute" '{
    "customer_id": "cust-001",
    "node_id": "node-001",
    "params": {
        "customer_name": "华为技术有限公司"
    },
    "reference_document_id": null
}' "执行技能"

# 获取历史记录
test_api "GET" "/teams/$TEAM_ID/customers/cust-001/interactions" "" "获取客户历史记录"

# ============================================
# 客户管理 API 测试
# ============================================
echo "========================================="
echo "客户管理 API 测试"
echo "========================================="

# 获取客户列表
test_api "GET" "/teams/$TEAM_ID/customers" "" "获取客户列表"

# 创建客户
test_api "POST" "/teams/$TEAM_ID/customers" '{
    "name": "测试客户公司",
    "contact_name": "测试联系人",
    "contact_phone": "13800138000",
    "contact_email": "test@test.com",
    "industry": "测试行业",
    "revenue": "100万"
}' "创建客户"

# ============================================
# 技能管理 API 测试
# ============================================
echo "========================================="
echo "技能管理 API 测试"
echo "========================================="

# 获取技能列表
test_api "GET" "/teams/$TEAM_ID/skills" "" "获取技能列表"

# 更新技能状态
test_api "PUT" "/teams/$TEAM_ID/skills/skill-001/status" '{
    "status": "INACTIVE"
}' "停用技能"

# ============================================
# 测试结果汇总
# ============================================
echo "========================================="
echo "测试结果汇总"
echo "========================================="
echo -e "${GREEN}通过: $PASS${NC}"
echo -e "${RED}失败: $FAIL${NC}"
echo "总计: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}所有测试通过!${NC}"
    exit 0
else
    echo -e "${RED}存在失败的测试，请检查。${NC}"
    exit 1
fi
