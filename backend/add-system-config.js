const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'aisa_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'aisa_db',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create enum type if not exists
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE config_key_enum AS ENUM ('web_search_engine');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Created/verified config_key_enum type');

    // Create system_configs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key config_key_enum NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created system_configs table');

    // Insert default web search engine config
    await client.query(`
      INSERT INTO system_configs (key, value, description)
      VALUES ('web_search_engine', 'search_std', '智谱AI WebSearch 搜索引擎选择')
      ON CONFLICT (key) DO NOTHING
    `);
    console.log('✅ Inserted default web_search_engine config');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
