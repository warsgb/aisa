import { AppDataSource } from './data-source';
import { Skill } from './src/entities/skill.entity';

async function test() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const skillRepo = AppDataSource.manager.getRepository(Skill);

    const skill = await skillRepo.findOne({
      where: { slug: 'financial-customer-research' }
    });

    if (!skill) {
      console.log('❌ Skill not found');
      process.exit(1);
    }

    console.log(`📦 Skill: ${skill.name} (${skill.slug})`);
    console.log(`🔍 search_configs type: ${typeof skill.search_configs}`);
    console.log(`🔍 search_configs is Array: ${Array.isArray(skill.search_configs)}`);
    console.log(`🔍 search_configs length: ${skill.search_configs?.length || 0}`);

    if (skill.search_configs && skill.search_configs.length > 0) {
      console.log('\n✅ Search configs found:');
      skill.search_configs.forEach((config, i) => {
        console.log(`  ${i + 1}. ${config.name} -> ${config.inject_as}`);
        console.log(`     Type: ${config.type}`);
        console.log(`     Query: ${config.query_template?.substring(0, 80)}...`);
      });
    } else {
      console.log('\n❌ No search configs found');
      console.log('💡 Skills need to be synced from files');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
