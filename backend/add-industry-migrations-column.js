require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function addColumn() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add the column
    await client.query(`
      ALTER TABLE skills
      ADD COLUMN IF NOT EXISTS industry_mappings jsonb DEFAULT '{}';
    `);
    console.log('Added industry_mappings column');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_skills_industry_mappings
      ON skills USING GIN (industry_mappings);
    `);
    console.log('Created index on industry_mappings');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

addColumn();
