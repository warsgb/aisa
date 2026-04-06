import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
require('fs').readFileSync(envPath, 'utf8')
  .split('\n')
  .filter((line: string) => line.trim() && !line.startsWith('#'))
  .forEach((line: string) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  migrations: [path.join(__dirname, '../migrations/*.ts')],
  migrationsTableName: 'migrations',
});

async function runMigrations() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const migrations = await dataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('ℹ️  No pending migrations');
    } else {
      console.log(`✅ Ran ${migrations.length} migration(s):`);
      migrations.forEach(m => console.log(`  - ${m.name}`));
    }

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
