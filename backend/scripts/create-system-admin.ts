import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'aisa_user',
  password: process.env.DB_PASSWORD || 'your_secure_password_here',
  database: process.env.DB_DATABASE || 'aisa_db',
});

async function createSystemAdmin() {
  const email = process.argv[2] || 'admin@aisa.local';
  const password = process.argv[3] || 'Admin123!';
  const fullName = process.argv[4] || 'System Administrator';

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    // Check if user already exists
    const result = await client.query('SELECT id, role FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      const currentRole = result.rows[0].role;

      console.log(`User ${email} already exists with role: ${currentRole}`);

      if (currentRole === 'SYSTEM_ADMIN') {
        console.log('✅ User is already a SYSTEM_ADMIN.');
      } else {
        // Update existing user to system admin
        await client.query(
          'UPDATE users SET role = $1, is_active = true WHERE id = $2',
          ['SYSTEM_ADMIN', userId]
        );
        console.log(`✅ User ${email} has been updated to SYSTEM_ADMIN role.`);
      }
    } else {
      // Create new system admin user
      console.log(`Creating new system admin user: ${email}`);
      const password_hash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        [email, password_hash, fullName, 'SYSTEM_ADMIN']
      );

      console.log(`✅ System admin user created successfully!`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Please change the password after first login.`);
    }
  } catch (error) {
    console.error('Error creating system admin user:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createSystemAdmin();
