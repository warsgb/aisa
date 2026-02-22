# System-Level LTC and Role-Skill Configuration

## Overview

This feature introduces system-level default configurations for LTC (Lead To Cash) process nodes and role-skill mappings. System administrators can configure default templates that can be synchronized to all teams while preserving team customizations.

## Key Features

### 1. System-Level Configuration Tables
- **system_ltc_nodes**: Stores default LTC node templates
- **system_role_skill_configs**: Stores default role-skill mappings

### 2. Source Tracking
- **SYSTEM**: Items inherited from system templates
- **CUSTOM**: Items customized by the team

### 3. Smart Synchronization
- Adds new system nodes to teams
- Updates unmodified system nodes
- Preserves team customizations
- Provides detailed sync results

### 4. Reset Functionality
- Teams can reset to system defaults
- Only removes SYSTEM-sourced items
- Preserves CUSTOM items

## Installation

### Step 1: Run Database Migration

```bash
# Make the script executable (if not already)
chmod +x backend/run-migration.sh

# Run the migration
./backend/run-migration.sh
```

Or manually execute the SQL:
```bash
psql -h localhost -U postgres -d aisa -f backend/migrations/add-system-config-tables.sql
```

### Step 2: Initialize System Default Data

```bash
node backend/init-system-config.js
```

This will create:
- 8 default LTC nodes (线索, 商机, 方案, POC, 商务谈判, 成交签约, 交付验收, 运营&增购)
- 3 role-skill configs (AR, SR, FR) with empty skill lists

## Usage

### For System Administrators

1. **Access System Config Page**
   - Navigate to `/system-config`
   - Only accessible to users with `SYSTEM_ADMIN` role

2. **Configure LTC Node Templates**
   - Go to "LTC节点模板" tab
   - Add, edit, delete, or reorder nodes
   - Configure default skill bindings for each node

3. **Configure Role-Skill Mappings**
   - Go to "角色技能配置" tab
   - Select default skills for AR (客户经理), SR (解决方案专家), FR (交付专家)

4. **Sync to All Teams**
   - Click "同步到所有团队" button
   - Review sync results (success/skipped/errors)
   - System performs smart merge:
     - New system nodes → added to all teams
     - Modified system nodes → updated if team hasn't customized
     - Team custom nodes → preserved unchanged

### For Team Administrators

1. **View LTC Configuration**
   - Navigate to `/ltc-config`
   - See source badges on each node (系统/自定义)

2. **Customize Nodes**
   - Edit system nodes → automatically marked as "自定义"
   - Add custom nodes → always marked as "自定义"
   - Drag to reorder

3. **Reset to System Defaults**
   - Click "重置为系统默认"
   - Removes all SYSTEM-sourced nodes
   - Preserves CUSTOM nodes
   - Re-syncs from current system templates

4. **Configure Role Skills**
   - Go to Settings → Skills Management
   - See Role Skill Config panel
   - View source badges (系统/自定义)
   - Reset individual roles or all roles

## API Endpoints

### System-Level (Admin Only)

```
GET    /system/ltc-nodes                    # Get system LTC nodes
POST   /system/ltc-nodes                    # Create system LTC node
PUT    /system/ltc-nodes/:id                # Update system LTC node
DELETE /system/ltc-nodes/:id                # Delete system LTC node
PUT    /system/ltc-nodes/reorder            # Reorder system LTC nodes

GET    /system/role-skill-configs           # Get system role configs
PUT    /system/role-skill-configs/:role     # Update system role config

POST   /system/sync-to-all-teams            # Sync system config to all teams
```

### Team-Level

```
GET    /teams/:teamId/ltc-nodes              # Get team LTC nodes
POST   /teams/:teamId/ltc-nodes              # Create team LTC node
PUT    /teams/:teamId/ltc-nodes/:id          # Update team LTC node
DELETE /teams/:teamId/ltc-nodes/:id          # Delete team LTC node
POST   /teams/:teamId/ltc-nodes/reset        # Reset to system defaults

GET    /teams/:teamId/role-skill-configs     # Get team role configs
GET    /teams/:teamId/role-skill-configs/:role # Get specific role config
PUT    /teams/:teamId/role-skill-configs/:role # Update role config
POST   /teams/:teamId/role-skill-configs/reset # Reset to system defaults
```

## Data Model

### SystemLtcNode
```typescript
{
  id: string;
  name: string;
  description: string | null;
  order: number;
  default_skill_ids: string[];
  created_at: Date;
  updated_at: Date;
}
```

### SystemRoleSkillConfig
```typescript
{
  id: string;
  role: 'AR' | 'SR' | 'FR';
  default_skill_ids: string[];
  created_at: Date;
  updated_at: Date;
}
```

### LtcNode (with source tracking)
```typescript
{
  // ... existing fields
  source: 'SYSTEM' | 'CUSTOM';
  system_node_id?: string;
}
```

### TeamRoleSkillConfig (with source tracking)
```typescript
{
  // ... existing fields
  source: 'SYSTEM' | 'CUSTOM';
}
```

## Smart Sync Algorithm

The synchronization process follows these rules:

1. **LTC Nodes:**
   - For each system node:
     - If no corresponding team node exists → CREATE (marked as SYSTEM)
     - If team node exists with source=SYSTEM → UPDATE if content changed
     - If team node exists with source=CUSTOM → SKIP (preserve customization)

2. **Role Configs:**
   - For each system role config:
     - If no team config exists → CREATE (marked as SYSTEM)
     - If team config exists with source=SYSTEM → UPDATE
     - If team config exists with source=CUSTOM → SKIP

3. **Node-Skill Bindings:**
   - Only updated for SYSTEM-sourced nodes
   - Completely replaced with system template bindings
   - CUSTOM nodes' bindings are preserved

## User Experience Flow

### Scenario 1: System Admin Sets Up Defaults
```
1. Login as SYSTEM_ADMIN
2. Navigate to /system-config
3. Configure 8 LTC nodes with skill bindings
4. Configure AR/SR/FR role skill mappings
5. Click "Sync to all teams"
6. Review sync results
```

### Scenario 2: Team Uses Defaults
```
1. Team logs in
2. Automatically sees system default nodes
3. Can use system-provided configuration as-is
```

### Scenario 3: Team Customizes
```
1. Team admin edits a system node → marked as CUSTOM
2. Team adds custom nodes → always CUSTOM
3. System admin updates system template
4. On sync: CUSTOM nodes preserved, SYSTEM nodes updated
```

### Scenario 4: Team Resets
```
1. Team admin clicks "Reset to system defaults"
2. All SYSTEM nodes removed and re-created from current template
3. All CUSTOM nodes preserved
4. Role configs reset to system defaults
```

## Troubleshooting

### Migration Issues
- Check database connection settings in `.env`
- Verify PostgreSQL is running
- Ensure user has CREATE TABLE permissions

### Sync Issues
- Check that system nodes exist before syncing
- Verify team has access to the skills referenced in system config
- Review sync result details for specific team errors

### Permission Issues
- Ensure user has SYSTEM_ADMIN role for system config access
- Team admins need OWNER or ADMIN role for reset operations

## Future Enhancements

Potential improvements for future versions:
- [ ] Version history for system templates
- [ ] Rollback to previous system configurations
- [ ] Bulk import/export of configurations
- [ ] Configuration preview before sync
- [ ] Per-team override permissions
- [ ] Advanced sync options (merge strategies)
