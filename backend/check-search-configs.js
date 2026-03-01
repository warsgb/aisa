const { AppDataSource } = require('./src/data-source');

async function checkSearchConfigs() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const result = await AppDataSource.manager.query(
      `SELECT slug, name, search_configs
       FROM skills
       WHERE slug IN ('financial-customer-research', 'education-customer-research', 'presale-strategy-decoder')`
    );

    console.log('\n=== Skill Search Configs ===\n');
    result.forEach(skill => {
      console.log(`\n${skill.slug} (${skill.name}):`);
      if (skill.search_configs && Array.isArray(skill.search_configs)) {
        console.log(`  ✓ Has ${skill.search_configs.length} search configs`);
        skill.search_configs.forEach(config => {
          console.log(`    - ${config.name} -> ${config.inject_as}`);
        });
      } else {
        console.log(`  ✗ No search configs or invalid format`);
        console.log(`    Type: ${typeof skill.search_configs}`);
        console.log(`    Value: ${JSON.stringify(skill.search_configs).substring(0, 200)}`);
      }
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSearchConfigs();
