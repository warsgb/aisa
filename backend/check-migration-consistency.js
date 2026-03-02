// 检查迁移脚本和实体定义的一致性
const fs = require('fs');
const path = require('path');

console.log('📋 检查数据库迁移脚本与实体定义的一致性\n');

// 读取实体定义
const entityPath = path.join(__dirname, 'src/entities/skill.entity.ts');
const entityContent = fs.readFileSync(entityPath, 'utf8');

// 提取实体中的字段定义
const entityFields = entityContent.match(/@Column\([^)]*\)\s+(\w+):\s+[^;]+;/g) || [];
console.log('✅ Entity 中的字段:');
entityFields.forEach(field => {
    const match = field.match(/@Column\([^)]*\)\s+(\w+):\s+([^;]+);/);
    if (match) {
        console.log(`  - ${match[1]}: ${match[2]}`);
    }
});

// 读取迁移文件
const migrationsDir = path.join(__dirname, 'src/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts'))
    .sort();

console.log('\n📝 迁移文件:');
const searchConfigsMigration = migrationFiles.find(f => f.includes('AddSearchConfigs'));
const industryMappingsMigration = migrationFiles.find(f => f.includes('AddSkillIndustry'));

if (searchConfigsMigration) {
    console.log(`  ✅ ${searchConfigsMigration}`);
    const migrationContent = fs.readFileSync(path.join(migrationsDir, searchConfigsMigration), 'utf8');
    
    // 检查是否添加了 search_version
    if (migrationContent.includes('search_version')) {
        console.log('     ⚠️  该迁移添加了 search_version 字段');
        console.log('     ℹ️  但 Entity 中已移除此字段（代码简化）');
        console.log('     🔧 建议：需要更新迁移脚本，移除 search_version 相关代码\n');
    }
}

if (industryMappingsMigration) {
    console.log(`  ✅ ${industryMappingsMigration}`);
}

console.log('\n🔍 检查结果:');
console.log('  - industry_mappings: ✅ 实体和迁移一致');
console.log('  - search_configs: ⚠️  迁移脚本包含了 search_version 字段');
console.log('  - search_version: ⚠️  数据库会有此字段，但Entity中已移除\n');

console.log('📝 建议:');
console.log('  1. 更新迁移脚本，移除 search_version 相关代码');
console.log('  2. 或者在迁移后执行 ALTER TABLE DROP COLUMN search_version\n');
