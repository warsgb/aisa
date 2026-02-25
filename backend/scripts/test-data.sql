-- AISA LTC 重构项目测试数据
-- 执行前请确保数据库已清空或使用独立测试数据库

-- ============================================
-- 1. 测试团队数据
-- ============================================
INSERT INTO teams (id, name, description, created_at, updated_at)
VALUES (
    'test-team-001',
    '测试团队',
    'LTC重构测试专用团队',
    NOW(),
    NOW()
);

-- ============================================
-- 2. 测试用户数据
-- ============================================
INSERT INTO users (id, email, name, password_hash, avatar_url, created_at, updated_at)
VALUES
    ('user-admin-001', 'admin@test.com', '管理员', '$2b$10$test_hash', NULL, NOW(), NOW()),
    ('user-ar-001', 'ar@test.com', '客户经理', '$2b$10$test_hash', NULL, NOW(), NOW()),
    ('user-sr-001', 'sr@test.com', '方案经理', '$2b$10$test_hash', NULL, NOW(), NOW()),
    ('user-fr-001', 'fr@test.com', '交付经理', '$2b$10$test_hash', NULL, NOW(), NOW());

-- ============================================
-- 3. 团队成员关系
-- ============================================
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
VALUES
    ('tm-admin-001', 'test-team-001', 'user-admin-001', 'ADMIN', NOW(), NOW()),
    ('tm-ar-001', 'test-team-001', 'user-ar-001', 'MEMBER', NOW(), NOW()),
    ('tm-sr-001', 'test-team-001', 'user-sr-001', 'MEMBER', NOW(), NOW()),
    ('tm-fr-001', 'test-team-001', 'user-fr-001', 'MEMBER', NOW(), NOW());

-- ============================================
-- 4. 团队成员偏好（铁三角角色）
-- ============================================
INSERT INTO team_member_preferences (id, team_member_id, iron_triangle_role, favorite_skill_ids, created_at, updated_at)
VALUES
    ('tmp-admin-001', 'tm-admin-001', 'AR', '["skill-001", "skill-002", "skill-010"]'::jsonb, NOW(), NOW()),
    ('tmp-ar-001', 'tm-ar-001', 'AR', '["skill-001", "skill-002"]'::jsonb, NOW(), NOW()),
    ('tmp-sr-001', 'tm-sr-001', 'SR', '["skill-003", "skill-004", "skill-006"]'::jsonb, NOW(), NOW()),
    ('tmp-fr-001', 'tm-fr-001', 'FR', '["skill-008", "skill-009"]'::jsonb, NOW(), NOW());

-- ============================================
-- 5. 测试客户数据
-- ============================================
INSERT INTO customers (id, team_id, name, contact_name, contact_phone, contact_email, industry, revenue, address, ltc_context, created_at, updated_at)
VALUES
    ('cust-001', 'test-team-001', '华为技术有限公司', '张明', '13800138001', 'zhangming@huawei.com', '通信设备', '1000万', '深圳市龙岗区', NULL, NOW(), NOW()),
    ('cust-002', 'test-team-001', '腾讯科技有限公司', '李娜', '13800138002', 'lina@tencent.com', '互联网', '800万', '深圳市南山区', NULL, NOW(), NOW()),
    ('cust-003', 'test-team-001', '阿里巴巴集团', '王强', '13800138003', 'wangqiang@alibaba.com', '电子商务', '1200万', '杭州市余杭区', NULL, NOW(), NOW()),
    ('cust-004', 'test-team-001', '百度在线网络技术公司', '刘芳', '13800138004', 'liufang@baidu.com', '互联网', '600万', '北京市海淀区', NULL, NOW(), NOW()),
    ('cust-005', 'test-team-001', '字节跳动科技有限公司', '陈伟', '13800138005', 'chenwei@bytedance.com', '互联网', '900万', '北京市海淀区', NULL, NOW(), NOW());

-- ============================================
-- 6. 客户背景资料
-- ============================================
INSERT INTO customer_profiles (id, customer_id, background_info, decision_chain, history_notes, metadata, created_at, updated_at)
VALUES
    ('profile-001', 'cust-001', E'# 华为技术有限公司背景

## 公司概况
- 成立时间：1987年
- 员工人数：19.4万
- 年营收：7042亿元

## 历史合作
- 2023年：企业网络设备采购项目
- 2024年：云服务项目合作', E'# 决策链

## 关键决策人
1. **张明** - IT部门总监（最终决策者）
2. **李华** - 技术架构师（技术评估）
3. **王芳** - 采购经理（商务谈判）', E'# 历史沟通记录

- 2026-01-15：初次接触，了解需求
- 2026-01-20：技术交流会议
- 2026-02-10：方案初步沟通', '{}'::jsonb, NOW(), NOW()),

    ('profile-002', 'cust-002', E'# 腾讯科技背景

## 业务需求
- 云服务扩容
- 安全防护升级', E'# 决策链

## 决策人
- 李娜 - 技术VP
- 赵军 - 安全总监', E'# 沟通历史

- 2026-02-01：初次拜访', '{}'::jsonb, NOW(), NOW());

-- ============================================
-- 7. LTC流程节点（8个默认节点）
-- ============================================
INSERT INTO ltc_nodes (id, team_id, name, "order", description, created_at, updated_at)
VALUES
    ('node-001', 'test-team-001', '线索', 1, '初始线索阶段，收集客户基本信息', NOW(), NOW()),
    ('node-002', 'test-team-001', '商机', 2, '商机确认阶段，验证需求真实性', NOW(), NOW()),
    ('node-003', 'test-team-001', '方案', 3, '方案设计阶段，输出技术方案', NOW(), NOW()),
    ('node-004', 'test-team-001', 'POC', 4, 'POC测试阶段，产品验证', NOW(), NOW()),
    ('node-005', 'test-team-001', '商务谈判', 5, '商务谈判阶段，价格与条款协商', NOW(), NOW()),
    ('node-006', 'test-team-001', '合同', 6, '合同签订阶段，法务审核', NOW(), NOW()),
    ('node-007', 'test-team-001', '交付', 7, '项目交付阶段，实施上线', NOW(), NOW()),
    ('node-008', 'test-team-001', '回款', 8, '回款跟踪阶段，收款确认', NOW(), NOW());

-- ============================================
-- 8. 测试技能数据
-- ============================================
INSERT INTO skills (id, team_id, name, description, prompt, parameters, status, applicable_roles, tags, created_at, updated_at)
VALUES
    ('skill-001', 'test-team-001', '客户信息搜索', '快速获取客户工商信息、联系方式等基础数据',
     E'请搜索并整理客户{{customer_name}}的以下信息：\n1. 公司基本信息（成立时间、注册资本、法定代表人）\n2. 联系方式\n3. 主营业务\n4. 最新动态',
     '[{"name": "customer_name", "type": "string", "required": true, "description": "客户名称"}]'::jsonb,
     'ACTIVE', '["AR", "SR"]'::jsonb, '["线索"]'::jsonb, NOW(), NOW()),

    ('skill-002', 'test-team-001', '线索评分', 'AI评估线索质量，给出跟进优先级建议',
     E'请对以下线索进行评分（1-10分）：\n客户：{{customer_name}}\n行业：{{industry}}\n需求描述：{{requirement}}\n\n请从以下维度评估：\n1. 需求匹配度\n2. 预算可能性\n3. 决策周期',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "industry", "type": "string", "required": true}, {"name": "requirement", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["AR"]'::jsonb, '["线索"]'::jsonb, NOW(), NOW()),

    ('skill-003', 'test-team-001', '需求深访', '多轮对话式深入挖掘客户需求和痛点',
     E'请基于以下背景，设计需求深访问题清单：\n客户：{{customer_name}}\n\n深访目标：\n1. 了解当前痛点\n2. 明确业务目标\n3. 识别决策因素',
     '[{"name": "customer_name", "type": "string", "required": true}]'::jsonb,
     'ACTIVE', '["SR"]'::jsonb, '["商机"]'::jsonb, NOW(), NOW()),

    ('skill-004', 'test-team-001', '竞争对手分析', '分析竞品方案，生成差异化策略',
     E'请分析{{customer_name}}的竞争对手情况：\n\n1. 主要竞争对手\n2. 竞品优劣势\n3. 我方差异化策略',
     '[{"name": "customer_name", "type": "string", "required": true}]'::jsonb,
     'ACTIVE', '["SR"]'::jsonb, '["商机"]'::jsonb, NOW(), NOW()),

    ('skill-005', 'test-team-001', '电梯演讲话术', '生成60秒快速打动客户的演讲稿',
     E'请为{{customer_name}}生成电梯演讲稿：\n\n要求：\n1. 60秒内完成\n2. 突出核心价值\n3. 引发兴趣',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "product", "type": "string", "required": true}]'::jsonb,
     'ACTIVE', '["AR", "SR"]'::jsonb, '["商机"]'::jsonb, NOW(), NOW()),

    ('skill-006', 'test-team-001', '技术方案生成', '基于需求自动生成技术方案框架',
     E'请为{{customer_name}}生成技术方案框架：\n\n需求概述：{{requirement}}\n\n方案应包含：\n1. 架构设计\n2. 技术选型\n3. 实施计划',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "requirement", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["SR"]'::jsonb, '["方案"]'::jsonb, NOW(), NOW()),

    ('skill-007', 'test-team-001', '方案评审助手', '模拟客户视角评审方案，找出潜在问题',
     E'请从客户视角评审以下方案：\n{{solution_content}}\n\n请指出：\n1. 潜在问题\n2. 改进建议\n3. 风险点',
     '[{"name": "solution_content", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["SR"]'::jsonb, '["方案"]'::jsonb, NOW(), NOW()),

    ('skill-008', 'test-team-001', 'POC计划生成', '生成详细的POC测试计划和验收标准',
     E'请为{{customer_name}}生成POC计划：\n\n测试范围：{{scope}}\n\n计划应包含：\n1. 测试场景\n2. 验收标准\n3. 时间安排',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "scope", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["SR", "FR"]'::jsonb, '["POC"]'::jsonb, NOW(), NOW()),

    ('skill-009', 'test-team-001', '技术风险评估', '识别POC阶段可能的技术风险',
     E'请评估{{customer_name}}POC项目的技术风险：\n\n项目背景：{{background}}\n\n请识别：\n1. 技术风险\n2. 缓解措施\n3. 应急预案',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "background", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["SR", "FR"]'::jsonb, '["POC"]'::jsonb, NOW(), NOW()),

    ('skill-010', 'test-team-001', '报价策略生成', '基于成本和竞争分析给出报价建议',
     E'请为{{customer_name}}生成报价策略：\n\n项目规模：{{scale}}\n预算范围：{{budget}}\n\n请提供：\n1. 报价建议\n2. 定价策略\n3. 谈判要点',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "scale", "type": "string", "required": true}, {"name": "budget", "type": "string", "required": true}]'::jsonb,
     'ACTIVE', '["AR"]'::jsonb, '["商务谈判"]'::jsonb, NOW(), NOW()),

    ('skill-011', 'test-team-001', '谈判模拟演练', '模拟客户角色进行谈判对练',
     E'请扮演{{customer_name}}的采购经理，与我进行价格谈判模拟：\n\n谈判场景：{{scenario}}\n\n请从客户角度提出问题和异议。',
     '[{"name": "customer_name", "type": "string", "required": true}, {"name": "scenario", "type": "text", "required": true}]'::jsonb,
     'ACTIVE', '["AR"]'::jsonb, '["商务谈判"]'::jsonb, NOW(), NOW());

-- ============================================
-- 9. 节点-技能绑定
-- ============================================
INSERT INTO node_skill_bindings (id, node_id, skill_id, "order", created_at, updated_at)
VALUES
    -- 线索节点技能
    ('binding-001', 'node-001', 'skill-001', 1, NOW(), NOW()),
    ('binding-002', 'node-001', 'skill-002', 2, NOW(), NOW()),

    -- 商机节点技能
    ('binding-003', 'node-002', 'skill-003', 1, NOW(), NOW()),
    ('binding-004', 'node-002', 'skill-004', 2, NOW(), NOW()),
    ('binding-005', 'node-002', 'skill-005', 3, NOW(), NOW()),

    -- 方案节点技能
    ('binding-006', 'node-003', 'skill-006', 1, NOW(), NOW()),
    ('binding-007', 'node-003', 'skill-007', 2, NOW(), NOW()),

    -- POC节点技能
    ('binding-008', 'node-004', 'skill-008', 1, NOW(), NOW()),
    ('binding-009', 'node-004', 'skill-009', 2, NOW(), NOW()),

    -- 商务谈判节点技能
    ('binding-010', 'node-005', 'skill-010', 1, NOW(), NOW()),
    ('binding-011', 'node-005', 'skill-011', 2, NOW(), NOW());

-- ============================================
-- 10. 技能执行历史记录
-- ============================================
INSERT INTO skill_interactions (id, customer_id, skill_id, node_id, team_id, user_id, input_params, output_content, status, executed_at, created_at, updated_at)
VALUES
    ('interaction-001', 'cust-001', 'skill-006', 'node-003', 'test-team-001', 'user-sr-001',
     '{"customer_name": "华为技术有限公司", "requirement": "云原生架构改造"}'::jsonb,
     E'# 技术方案框架\n\n## 1. 架构设计\n采用微服务架构，容器化部署...\n\n## 2. 技术选型\n- Kubernetes\n- Docker\n- Istio\n\n## 3. 实施计划\n预计6个月完成...',
     'COMPLETED', '2026-02-19 16:45:00', NOW(), NOW()),

    ('interaction-002', 'cust-001', 'skill-003', 'node-002', 'test-team-001', 'user-sr-001',
     '{"customer_name": "华为技术有限公司"}'::jsonb,
     E'# 需求深访问题清单\n\n## 当前痛点\n1. 现有系统扩展性不足\n2. 运维成本高\n\n## 业务目标\n1. 提升系统性能\n2. 降低TCO',
     'COMPLETED', '2026-02-18 14:30:00', NOW(), NOW()),

    ('interaction-003', 'cust-001', 'skill-001', 'node-001', 'test-team-001', 'user-ar-001',
     '{"customer_name": "华为技术有限公司"}'::jsonb,
     E'# 华为技术有限公司信息\n\n- 成立时间：1987年\n- 注册资本：400亿元\n- 法定代表人：梁华\n- 主营业务：通信设备、消费电子、企业业务',
     'COMPLETED', '2026-02-15 10:20:00', NOW(), NOW()),

    ('interaction-004', 'cust-002', 'skill-001', 'node-001', 'test-team-001', 'user-ar-001',
     '{"customer_name": "腾讯科技有限公司"}'::jsonb,
     E'# 腾讯科技有限公司信息\n\n- 成立时间：1998年\n- 总部：深圳\n- 主营业务：社交、游戏、云服务',
     'COMPLETED', '2026-02-14 09:15:00', NOW(), NOW()),

    ('interaction-005', 'cust-002', 'skill-006', 'node-003', 'test-team-001', 'user-sr-001',
     '{"customer_name": "腾讯科技有限公司", "requirement": "安全防护升级"}'::jsonb,
     E'# 安全防护方案\n\n## 安全架构\n零信任安全模型...',
     'COMPLETED', '2026-02-10 11:30:00', NOW(), NOW());

-- ============================================
-- 11. 数据验证查询
-- ============================================

-- 验证团队
SELECT 'Teams' as table_name, COUNT(*) as count FROM teams WHERE id = 'test-team-001'
UNION ALL
-- 验证用户
SELECT 'Users', COUNT(*) FROM users WHERE id LIKE 'user-%'
UNION ALL
-- 验证团队成员
SELECT 'Team Members', COUNT(*) FROM team_members WHERE team_id = 'test-team-001'
UNION ALL
-- 验证成员偏好
SELECT 'Member Preferences', COUNT(*) FROM team_member_preferences WHERE team_member_id LIKE 'tm-%'
UNION ALL
-- 验证客户
SELECT 'Customers', COUNT(*) FROM customers WHERE team_id = 'test-team-001'
UNION ALL
-- 验证客户资料
SELECT 'Customer Profiles', COUNT(*) FROM customer_profiles WHERE customer_id LIKE 'cust-%'
UNION ALL
-- 验证LTC节点
SELECT 'LTC Nodes', COUNT(*) FROM ltc_nodes WHERE team_id = 'test-team-001'
UNION ALL
-- 验证技能
SELECT 'Skills', COUNT(*) FROM skills WHERE team_id = 'test-team-001'
UNION ALL
-- 验证节点-技能绑定
SELECT 'Node-Skill Bindings', COUNT(*) FROM node_skill_bindings WHERE node_id LIKE 'node-%'
UNION ALL
-- 验证历史记录
SELECT 'Skill Interactions', COUNT(*) FROM skill_interactions WHERE team_id = 'test-team-001';
