require('dotenv').config({ path: '/Users/leo/home/aisa/backend/.env' });
const { Client } = require('pg');

async function checkSkillContent() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await client.connect();

    // Get the system_prompt content for presale-industry-jargon skill
    const result = await client.query(`
      SELECT system_prompt
      FROM skills
      WHERE slug = 'presale-industry-jargon'
    `);

    if (result.rows.length > 0) {
      const content = result.rows[0].system_prompt;
      console.log('System prompt length:', content.length);

      // Check if it contains @baidu-search markers
      if (content.includes('@baidu-search')) {
        console.log('✓ Contains @baidu-search markers');

        // Find all @baidu-search occurrences
        const matches = content.match(/@baidu-search:[^\n]+/g);
        if (matches) {
          console.log('\nFound markers:');
          matches.forEach((match, i) => {
            console.log(`  ${i + 1}. ${match}`);
          });
        }

        // Check specifically for industry-trend
        if (content.includes('@baidu-search:industry-trend')) {
          console.log('\n✓ Contains @baidu-search:industry-trend');

          // Find the line with industry-trend marker
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('@baidu-search:industry-trend')) {
              console.log(`\nLine ${i + 1}: ${lines[i]}`);
              console.log(`Line ${i}: ${lines[i - 1] || '(start of file)'}`);
            }
          }
        } else {
          console.log('\n✗ Does NOT contain @baidu-search:industry-trend');
        }
      } else {
        console.log('✗ Does NOT contain @baidu-search markers');

        // Show first 500 chars to see what we have
        console.log('\nFirst 500 chars of system_prompt:');
        console.log(content.substring(0, 500));
      }
    } else {
      console.log('Skill not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSkillContent();
