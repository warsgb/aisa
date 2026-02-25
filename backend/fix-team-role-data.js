/**
 * Fix team_role_skill_configs data
 * This script deletes or updates records with null role values
 */

const { Client } = require('pg');

// Load .env file
require('dotenv').config({ path: '.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'aisa',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function fixData() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check for null values
    const result = await client.query('SELECT COUNT(*) FROM team_role_skill_configs WHERE role IS NULL');
    const nullCount = parseInt(result.rows[0].count);

    console.log(`\nFound ${nullCount} records with null role values`);

    if (nullCount > 0) {
      // Delete records with null values (they are from old schema without proper role)
      const deleteResult = await client.query('DELETE FROM team_role_skill_configs WHERE role IS NULL');
      console.log(`✓ Deleted ${deleteResult.rowCount} invalid records`);
    }

    // Verify the fix
    const checkResult = await client.query('SELECT COUNT(*) FROM team_role_skill_configs');
    console.log(`\n✓ Total valid records in team_role_skill_configs: ${checkResult.rows[0].count}`);

    console.log('\n✓ Data fix completed successfully!');
    console.log('\nYou can now restart the backend server.');

  } catch (error) {
    console.error('✗ Error fixing data:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixData();
