import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || 'aisa_db',
    user: process.env.DB_USERNAME || 'aisa_user',
    password: process.env.DB_PASSWORD || 'your_secure_password_here',
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log('\n🔄 Running migration: Add search_configs columns to skills table\n');

    // Add search_configs column
    console.log('Adding search_configs column...');
    await client.query(`
      ALTER TABLE skills
      ADD COLUMN IF NOT EXISTS search_configs jsonb;
    `);
    console.log('✅ search_configs column added');

    // Add search_version column
    console.log('Adding search_version column...');
    await client.query(`
      ALTER TABLE skills
      ADD COLUMN IF NOT EXISTS search_version VARCHAR DEFAULT 'legacy';
    `);
    console.log('✅ search_version column added');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_skills_search_version
      ON skills (search_version);
    `);
    console.log('✅ IDX_skills_search_version created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_skills_search_configs
      ON skills USING GIN (search_configs);
    `);
    console.log('✅ IDX_skills_search_configs created');

    console.log('\n✨ Migration completed successfully!\n');

    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'skills'
        AND column_name IN ('search_configs', 'search_version')
      ORDER BY ordinal_position;
    `);

    console.log('📋 New columns:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
