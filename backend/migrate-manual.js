/**
 * Manual database migration for system configuration
 * This script handles the migration safely without TypeORM auto-sync
 */

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_DATABASE || 'aisa',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function migrate() {
  const client = new Client(config);

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Begin transaction
    await client.query('BEGIN');

    try {
      // 1. Create system_ltc_nodes table
      console.log('\nCreating system_ltc_nodes table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_ltc_nodes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          "order" INT NOT NULL,
          default_skill_ids JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ system_ltc_nodes table ready');

      // 2. Create system_role_skill_configs table
      console.log('\nCreating system_role_skill_configs table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_role_skill_configs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          role VARCHAR(10) NOT NULL CHECK (role IN ('AR', 'SR', 'FR')) UNIQUE,
          default_skill_ids JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✓ system_role_skill_configs table ready');

      // 3. Add source column to ltc_nodes if not exists
      console.log('\nAdding source tracking to ltc_nodes...');
      const ltcSourceCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name='ltc_nodes' AND column_name='source'
        )
      `);

      if (!ltcSourceCheck.rows[0].exists) {
        await client.query(`ALTER TABLE ltc_nodes ADD COLUMN source VARCHAR(10) DEFAULT 'CUSTOM' CHECK (source IN ('SYSTEM', 'CUSTOM'))`);
        console.log('✓ Added ltc_nodes.source column');
      } else {
        console.log('✓ ltc_nodes.source column already exists');
      }

      // 4. Add system_node_id to ltc_nodes if not exists
      const ltcSystemNodeCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name='ltc_nodes' AND column_name='system_node_id'
        )
      `);

      if (!ltcSystemNodeCheck.rows[0].exists) {
        await client.query(`ALTER TABLE ltc_nodes ADD COLUMN system_node_id UUID`);
        console.log('✓ Added ltc_nodes.system_node_id column');
      } else {
        console.log('✓ ltc_nodes.system_node_id column already exists');
      }

      // 5. Add source column to team_role_skill_configs if not exists
      console.log('\nAdding source tracking to team_role_skill_configs...');
      const trscSourceCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name='team_role_skill_configs' AND column_name='source'
        )
      `);

      if (!trscSourceCheck.rows[0].exists) {
        await client.query(`ALTER TABLE team_role_skill_configs ADD COLUMN source VARCHAR(10) DEFAULT 'CUSTOM' CHECK (source IN ('SYSTEM', 'CUSTOM'))`);
        console.log('✓ Added team_role_skill_configs.source column');
      } else {
        console.log('✓ team_role_skill_configs.source column already exists');
      }

      // 6. Create indexes
      console.log('\nCreating indexes...');

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_ltc_nodes_source ON ltc_nodes(source)',
        'CREATE INDEX IF NOT EXISTS idx_ltc_nodes_system_node_id ON ltc_nodes(system_node_id)',
        'CREATE INDEX IF NOT EXISTS idx_team_role_skill_configs_source ON team_role_skill_configs(source)',
        'CREATE INDEX IF NOT EXISTS idx_system_ltc_nodes_order ON system_ltc_nodes("order")',
      ];

      for (const indexSql of indexes) {
        await client.query(indexSql);
      }
      console.log('✓ All indexes created');

      // Commit transaction
      await client.query('COMMIT');
      console.log('\n✓ Migration completed successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n✗ Migration failed, rolled back:', error.message);
      throw error;
    }

  } catch (error) {
    console.error('✗ Database error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

migrate();
