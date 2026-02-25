/**
 * Initialize System Configuration Script
 *
 * This script initializes the system-level default configurations:
 * - 8 default LTC nodes
 * - Default role-skill mappings for AR/SR/FR
 *
 * Usage: node backend/init-system-config.js
 */

const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'aisa',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const DEFAULT_LTC_NODES = [
  { name: '线索', description: '潜在客户发现与初步接触', order: 0, default_skill_ids: [] },
  { name: '商机', description: '确认客户需求与购买意向', order: 1, default_skill_ids: [] },
  { name: '方案', description: '制定解决方案与POC演示', order: 2, default_skill_ids: [] },
  { name: 'POC', description: '产品验证与方案测试', order: 3, default_skill_ids: [] },
  { name: '商务谈判', description: '合同条款与价格谈判', order: 4, default_skill_ids: [] },
  { name: '成交签约', description: '正式签署合作协议', order: 5, default_skill_ids: [] },
  { name: '交付验收', description: '项目实施与验收', order: 6, default_skill_ids: [] },
  { name: '运营&增购', description: '客户运营与增购机会', order: 7, default_skill_ids: [] },
];

async function initSystemConfig() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if system nodes already exist
    const existingNodesResult = await client.query('SELECT COUNT(*) FROM system_ltc_nodes');
    const existingNodesCount = parseInt(existingNodesResult.rows[0].count);

    if (existingNodesCount > 0) {
      console.log(`⚠ System LTC nodes already exist (${existingNodesCount} nodes). Skipping creation.`);
      console.log('  To recreate, first truncate the system_ltc_nodes table.');
    } else {
      // Create default LTC nodes
      console.log('\nCreating system LTC nodes...');
      for (const node of DEFAULT_LTC_NODES) {
        await client.query(
          'INSERT INTO system_ltc_nodes (name, description, "order", default_skill_ids) VALUES ($1, $2, $3, $4)',
          [node.name, node.description, node.order, JSON.stringify(node.default_skill_ids)]
        );
        console.log(`  ✓ Created node: ${node.name}`);
      }
      console.log(`✓ Created ${DEFAULT_LTC_NODES.length} system LTC nodes`);
    }

    // Check if role configs already exist
    const existingConfigsResult = await client.query('SELECT COUNT(*) FROM system_role_skill_configs');
    const existingConfigsCount = parseInt(existingConfigsResult.rows[0].count);

    if (existingConfigsCount > 0) {
      console.log(`\n⚠ System role skill configs already exist (${existingConfigsCount} configs). Skipping creation.`);
      console.log('  To recreate, first truncate the system_role_skill_configs table.');
    } else {
      // Create default role configs (empty for now, can be configured by admin later)
      console.log('\nCreating system role skill configs...');
      const roles = ['AR', 'SR', 'FR'];
      for (const role of roles) {
        await client.query(
          'INSERT INTO system_role_skill_configs (role, default_skill_ids) VALUES ($1, $2)',
          [role, '[]']
        );
        console.log(`  ✓ Created config for role: ${role}`);
      }
      console.log('✓ Created 3 system role skill configs');
    }

    console.log('\n✓ System configuration initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Log in as a system administrator');
    console.log('2. Navigate to /system-config');
    console.log('3. Configure skill bindings for each LTC node');
    console.log('4. Configure default skills for each role (AR/SR/FR)');
    console.log('5. Click "Sync to all teams" to apply the configuration');

  } catch (error) {
    console.error('✗ Error initializing system configuration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

// Run the initialization
initSystemConfig();
