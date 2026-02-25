/**
 * Test script for system configuration API
 * Tests the new system-level LTC and role-skill configuration endpoints
 */

require('dotenv').config({ path: 'backend/.env' });

const API_BASE = 'http://localhost:3001/api';
let authToken = '';

async function testAPI() {
  try {
    // 1. Login as admin
    console.log('\n=== 1. Testing Login ===');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aisa.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    authToken = loginData.access_token;
    console.log('✓ Login successful');
    console.log('  User role:', loginData.user.role);

    // 2. Get system LTC nodes
    console.log('\n=== 2. Testing Get System LTC Nodes ===');
    const ltcNodesResponse = await fetch(`${API_BASE}/system/ltc-nodes`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!ltcNodesResponse.ok) {
      throw new Error(`Get system LTC nodes failed: ${ltcNodesResponse.status}`);
    }

    const ltcNodes = await ltcNodesResponse.json();
    console.log(`✓ Found ${ltcNodes.length} system LTC nodes`);
    ltcNodes.forEach((node, index) => {
      console.log(`  ${index + 1}. ${node.name} (${node.description})`);
    });

    // 3. Get system role skill configs
    console.log('\n=== 3. Testing Get System Role Skill Configs ===');
    const roleConfigsResponse = await fetch(`${API_BASE}/system/role-skill-configs`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!roleConfigsResponse.ok) {
      throw new Error(`Get system role configs failed: ${roleConfigsResponse.status}`);
    }

    const roleConfigs = await roleConfigsResponse.json();
    console.log(`✓ Found ${roleConfigs.length} system role configs`);
    roleConfigs.forEach((config) => {
      console.log(`  ${config.role}: ${config.default_skill_ids.length} skills`);
    });

    // 4. Test creating a system LTC node
    console.log('\n=== 4. Testing Create System LTC Node ===');
    const createNodeResponse = await fetch(`${API_BASE}/system/ltc-nodes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '测试节点',
        description: '这是一个测试节点',
        default_skill_ids: []
      })
    });

    if (!createNodeResponse.ok) {
      throw new Error(`Create system LTC node failed: ${createNodeResponse.status}`);
    }

    const newNode = await createNodeResponse.json();
    console.log('✓ Created new system node:', newNode.name);
    console.log('  Node ID:', newNode.id);

    // 5. Test updating the node
    console.log('\n=== 5. Testing Update System LTC Node ===');
    const updateNodeResponse = await fetch(`${API_BASE}/system/ltc-nodes/${newNode.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '测试节点（已更新）',
        description: '这个节点已经被更新了'
      })
    });

    if (!updateNodeResponse.ok) {
      throw new Error(`Update system LTC node failed: ${updateNodeResponse.status}`);
    }

    const updatedNode = await updateNodeResponse.json();
    console.log('✓ Updated system node:', updatedNode.name);

    // 6. Test deleting the node
    console.log('\n=== 6. Testing Delete System LTC Node ===');
    const deleteNodeResponse = await fetch(`${API_BASE}/system/ltc-nodes/${newNode.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!deleteNodeResponse.ok) {
      throw new Error(`Delete system LTC node failed: ${deleteNodeResponse.status}`);
    }

    console.log('✓ Deleted test node');

    // 7. Test sync to all teams
    console.log('\n=== 7. Testing Sync to All Teams ===');
    const syncResponse = await fetch(`${API_BASE}/system/sync-to-all-teams`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!syncResponse.ok) {
      throw new Error(`Sync to all teams failed: ${syncResponse.status}`);
    }

    const syncResult = await syncResponse.json();
    console.log('✓ Sync to all teams completed');
    console.log(`  Success: ${syncResult.success}`);
    console.log(`  Skipped: ${syncResult.skipped}`);
    console.log(`  Errors: ${syncResult.errors}`);

    if (syncResult.details.length > 0) {
      console.log('\n  Sync Details:');
      syncResult.details.slice(0, 3).forEach((detail) => {
        console.log(`    - ${detail.teamName || detail.teamId}: ${detail.changes ? 'Processed' : detail.error}`);
      });
      if (syncResult.details.length > 3) {
        console.log(`    ... and ${syncResult.details.length - 3} more`);
      }
    }

    console.log('\n✅ All API tests passed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPI();
