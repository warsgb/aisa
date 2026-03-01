require('dotenv').config({ path: '/Users/leo/home/aisa/backend/.env' });
const { Client } = require('pg');

async function testSearch() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get customer_id for 北京科技大学
    const customerResult = await client.query(`
      SELECT id, name FROM customers
      WHERE name = '北京科技大学'
      LIMIT 1
    `);

    if (customerResult.rows.length === 0) {
      console.log('✗ Customer not found');
      return;
    }

    const customerId = customerResult.rows[0].id;
    console.log(`✓ Found customer: ${customerResult.rows[0].name} (${customerId})`);

    // Get access token
    const loginResponse = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gbtest2@wps.cn',
        password: '888888'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.access_token;
    console.log('✓ Logged in\n');

    // Execute skill
    console.log('🚀 Executing skill: presale-industry-jargon');
    console.log('   Industry: education');
    console.log('   Customer: 清华大学\n');

    const executeResponse = await fetch('http://localhost:3001/skills/execute/presale-industry-jargon', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: customerId,
        parameters: {
          industry: 'education',
          customer_name: '清华大学'
        }
      })
    });

    if (!executeResponse.ok) {
      console.log(`✗ Execution failed: ${executeResponse.status}`);
      const error = await executeResponse.text();
      console.log(error);
      return;
    }

    console.log('✓ Skill execution started\n');
    console.log('📋 Check backend logs for BaiduWebSearch request details:');
    console.log('   tail -f /Users/leo/home/aisa/backend/logs/backend.log | grep -E "BaiduWebSearch Request Body"\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testSearch();
