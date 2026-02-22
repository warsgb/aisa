# Deployment Checklist - System-Level LTC Configuration

## Pre-Deployment Verification ✅

- [x] Backend TypeScript compilation passes
- [x] Frontend TypeScript compilation passes
- [x] All entities created and extended properly
- [x] All API routes implemented
- [x] All DTOs created with proper validation
- [x] Frontend components created
- [x] Type definitions updated
- [x] API service methods added
- [x] Routes configured with proper access control

## Deployment Steps

### 1. Database Migration
```bash
cd /Users/leo/home/aisa
./backend/run-migration.sh
```

**Expected Output:**
```
Running database migration...
Host: localhost:5432
Database: aisa

CREATE TABLE
CREATE TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX

✓ Database migration completed successfully!
```

### 2. Initialize System Data
```bash
node backend/init-system-config.js
```

**Expected Output:**
```
✓ Connected to database

Creating system LTC nodes...
  ✓ Created node: 线索
  ✓ Created node: 商机
  ✓ Created node: 方案
  ✓ Created node: POC
  ✓ Created node: 商务谈判
  ✓ Created node: 成交签约
  ✓ Created node: 交付验收
  ✓ Created node: 运营&增购
✓ Created 8 system LTC nodes

Creating system role skill configs...
  ✓ Created config for role: AR
  ✓ Created config for role: SR
  ✓ Created config for role: FR
✓ Created 3 system role skill configs

✓ System configuration initialization completed successfully!
```

### 3. Restart Backend Server
```bash
cd backend
# Stop existing server if running
# Then start:
npm start
# OR for development:
npm run start:dev
```

### 4. Verify Backend Health
```bash
curl http://localhost:3000/api/system/ltc-nodes \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Should return the 8 default LTC nodes.

## Post-Deployment Testing

### Test 1: System Admin Access
1. Login as a SYSTEM_ADMIN user
2. Navigate to `/system-config`
3. Verify page loads without errors
4. Verify both tabs (LTC节点模板, 角色技能配置) are accessible

### Test 2: LTC Node Management
1. Click "添加节点" button
2. Create a new node with name and description
3. Select some skills as default bindings
4. Save and verify node appears in list
5. Edit the node and verify update works
6. Delete the node and verify removal works
7. Try reordering nodes (move up/down)

### Test 3: Role Config Management
1. Switch to "角色技能配置" tab
2. Select skills for AR role
3. Save and verify selection persists
4. Do the same for SR and FR roles
5. Verify "已配置" badge appears

### Test 4: Sync Functionality
1. Configure at least one system node with skill bindings
2. Configure at least one role config
3. Click "同步到所有团队" button
4. Verify sync results display
5. Check number of successful/skipped/failed teams

### Test 5: Team-Side Verification
1. Login as a regular team user
2. Navigate to `/ltc-config`
3. Verify system nodes appear with "系统" badge
4. Edit a system node
5. Verify it now shows "自定义" badge
6. Click "重置为系统默认"
7. Verify SYSTEM nodes are restored, CUSTOM nodes preserved

### Test 6: Role Config Reset
1. Navigate to Settings → Skills Management
2. Find Role Skill Config panel
3. Verify configs show source badges
4. Edit a role config (add/remove skills)
5. Verify it shows "自定义" badge
6. Click "↺ 重置" button for one role
7. Verify it resets to system default
8. Click "重置为系统默认" button (top right)
9. Verify all roles reset to system defaults

## Rollback Plan (If Needed)

### Database Rollback
```sql
-- Remove new columns
ALTER TABLE team_role_skill_configs DROP COLUMN IF EXISTS source;
ALTER TABLE ltc_nodes DROP COLUMN IF EXISTS system_node_id;
ALTER TABLE ltc_nodes DROP COLUMN IF EXISTS source;

-- Drop new tables
DROP TABLE IF EXISTS system_role_skill_configs;
DROP TABLE IF EXISTS system_ltc_nodes;

-- Drop indexes
DROP INDEX IF EXISTS idx_team_role_skill_configs_source;
DROP INDEX IF EXISTS idx_ltc_nodes_system_node_id;
DROP INDEX IF EXISTS idx_ltc_nodes_source;
DROP INDEX IF EXISTS idx_system_ltc_nodes_order;
```

### Code Rollback
```bash
git checkout HEAD~1  # Revert to previous commit
```

## Monitoring & Debugging

### Check System Tables
```sql
-- Verify system nodes exist
SELECT * FROM system_ltc_nodes ORDER BY "order";

-- Verify role configs exist
SELECT * FROM system_role_skill_configs;

-- Check team nodes source tracking
SELECT id, name, source, system_node_id FROM ltc_nodes;
```

### Common Issues & Solutions

**Issue 1:** "Access Denied" on /system-config
- **Solution:** Verify user has `role = 'SYSTEM_ADMIN'` in users table

**Issue 2:** Sync shows 0 teams processed
- **Solution:** Verify teams table has records, check system admin API token

**Issue 3:** Team nodes not showing after sync
- **Solution:** Check that user is member of the team, verify team_id matches

**Issue 4:** "系统" badge not appearing
- **Solution:** Run migration again to add source column, verify data

## Performance Considerations

- Database indexes added on `source` and `system_node_id` fields
- Sync operation is batched per team
- Frontend uses React hooks for efficient rendering
- Consider running sync during low-traffic periods for large deployments

## Success Criteria

✅ System admins can access and use `/system-config`
✅ System templates sync to all teams
✅ Team customizations are preserved during sync
✅ Reset functionality works correctly
✅ Source badges display accurately
✅ All API endpoints respond correctly
✅ No TypeScript compilation errors
✅ No runtime errors in browser console

---

**Status:** Ready for deployment
**Last Updated:** 2026-02-22
**Version:** 1.0.0
