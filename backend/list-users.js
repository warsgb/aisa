const { Client } = require('pg');

async function listUsers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'aisa_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'aisa_db',
  });

  try {
    await client.connect();
    const result = await client.query('SELECT email, full_name, role FROM users ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== Users in database ===');
    result.rows.forEach(user => {
      console.log(`Email: ${user.email}, Name: ${user.full_name}, Role: ${user.role}`);
    });
  } finally {
    await client.end();
  }
}

listUsers();
