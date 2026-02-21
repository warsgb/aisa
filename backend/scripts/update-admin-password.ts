import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'aisa_user',
  password: process.env.DB_PASSWORD || 'your_secure_password_here',
  database: process.env.DB_DATABASE || 'aisa_db',
});

async function updateAdminCredentials() {
  const newEmail = 'admin@aisa';
  const newPassword = '123';

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    // Find system admin user
    const result = await client.query('SELECT id, email, role FROM users WHERE role = $1', ['SYSTEM_ADMIN']);

    if (result.rows.length === 0) {
      console.log('❌ System admin user not found');
      return;
    }

    const userId = result.rows[0].id;
    const oldEmail = result.rows[0].email;
    console.log(`Found system admin user: ${userId} (${oldEmail})`);

    // Update email and password
    const password_hash = await bcrypt.hash(newPassword, 10);

    await client.query(
      'UPDATE users SET email = $1, password_hash = $2 WHERE id = $3',
      [newEmail, password_hash, userId]
    );

    console.log(`✅ Admin credentials updated successfully!`);
    console.log(`   Old Email: ${oldEmail}`);
    console.log(`   New Email: ${newEmail}`);
    console.log(`   New Password: ${newPassword}`);
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminCredentials();
