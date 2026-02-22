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

    // Create team_role_skill_configs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_role_skill_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL CHECK (role IN ('AR', 'SR', 'FR')),
        default_skill_ids JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(team_id, role)
      )
    `);
    console.log('✅ Created team_role_skill_configs table');

    // Add default_member_role column to teams table
    await client.query(`
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS default_member_role VARCHAR(10)
        CHECK (default_member_role IN ('AR', 'SR', 'FR'))
        NULL
    `);
    console.log('✅ Added default_member_role column to teams table');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_role_skill_configs_team ON team_role_skill_configs(team_id)
    `);
    console.log('✅ Created index on team_role_skill_configs');

    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_team_role_skill_configs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Created trigger function');

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_team_role_skill_configs_updated_at ON team_role_skill_configs
    `);
    await client.query(`
      CREATE TRIGGER update_team_role_skill_configs_updated_at
        BEFORE UPDATE ON team_role_skill_configs
        FOR EACH ROW
        EXECUTE FUNCTION update_team_role_skill_configs_updated_at()
    `);
    console.log('✅ Created trigger');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
