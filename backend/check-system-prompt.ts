import { Client } from 'pg';
import * as path from 'path';

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkSystemPrompt() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || 'aisa_db',
    user: process.env.DB_USERNAME || 'aisa_user',
    password: process.env.DB_PASSWORD || 'your_secure_password_here',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database\n');

    const result = await client.query(`
      SELECT system_prompt, search_version
      FROM skills
      WHERE slug = 'presale-industry-jargon'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Skill not found');
    } else {
      const skill = result.rows[0];
      console.log(`📋 search_version: ${skill.search_version}`);
      console.log(`\n📝 system_prompt (first 500 chars):`);
      console.log(skill.system_prompt.substring(0, 500));

      console.log(`\n\n🔍 Checking for @include...`);
      if (skill.system_prompt.includes('@include')) {
        console.log('❌ Found @include in system_prompt!');
        const includeIdx = skill.system_prompt.indexOf('@include');
        console.log(`Context around @include (position ${includeIdx}):`);
        console.log(skill.system_prompt.substring(includeIdx, includeIdx + 200));
      } else {
        console.log('✅ No @include found');
      }

      console.log(`\n\n🔍 Checking for @baidu-search...`);
      if (skill.system_prompt.includes('@baidu-search')) {
        console.log('❌ Found @baidu-search in system_prompt!');
        const searchIdx = skill.system_prompt.indexOf('@baidu-search');
        console.log(`Context around @baidu-search (position ${searchIdx}):`);
        console.log(skill.system_prompt.substring(searchIdx, searchIdx + 100));
      } else {
        console.log('✅ No @baidu-search found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSystemPrompt();
