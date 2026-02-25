const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    const password_hash = await bcrypt.hash('Admin123456', 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [password_hash, 'admin@aisa.local']);
    console.log('✅ Password reset successful!');
    console.log('');
    console.log('=== Admin Login Credentials ===');
    console.log('Email: admin@aisa.local');
    console.log('Password: Admin123456');
    console.log('==============================');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetAdminPassword();
