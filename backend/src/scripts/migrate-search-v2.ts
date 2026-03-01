#!/usr/bin/env ts-node

/**
 * Migration Tool: Convert legacy @baidu-search markers to v2 declarative search
 *
 * This tool:
 * 1. Scans all skill files for @baidu-search and @search-result markers
 * 2. Parses search markers to extract search configurations
 * 3. Generates YAML search_configs
 * 4. Removes @include references to search frameworks
 * 5. Replaces @search-result:xxx with {{search_xxx}}
 * 6. Updates SKILL.md files
 */

import * as fs from 'fs';
import * as path from 'path';

interface SearchMarker {
  type: string;
  args: string[];
  line: number;
}

interface SearchResultMarker {
  type: string;
  line: number;
}

interface SkillMigration {
  filePath: string;
  searchMarkers: SearchMarker[];
  resultMarkers: SearchResultMarker[];
  hasInclude: boolean;
  migrate: boolean;
}

const SKILLS_DIR = path.join(__dirname, '..', '..', '..', 'skills');

/**
 * Extract search markers from content
 */
function extractSearchMarkers(content: string): SearchMarker[] {
  const markers: SearchMarker[] = [];
  const lines = content.split('\n');
  const searchRegex = /@baidu-search:([\w-]+)\(([^)]*)\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(searchRegex);
    if (match) {
      const type = match[1];
      // Parse arguments, handling quoted strings
      const argsStr = match[2];
      const args: string[] = [];
      const argRegex = /"([^"]*)"|'([^']*)'|(\S+)/g;
      let argMatch;

      while ((argMatch = argRegex.exec(argsStr)) !== null) {
        args.push(argMatch[1] || argMatch[2] || argMatch[3]);
      }

      markers.push({ type, args, line: i });
    }
  }

  return markers;
}

/**
 * Extract search-result markers from content
 */
function extractSearchResultMarkers(content: string): SearchResultMarker[] {
  const markers: SearchResultMarker[] = [];
  const lines = content.split('\n');
  const resultRegex = /@search-result:([\w-]+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(resultRegex);
    if (match) {
      markers.push({ type: match[1], line: i });
    }
  }

  return markers;
}

/**
 * Check if content includes search framework references
 */
function hasSearchFrameworkInclude(content: string): boolean {
  return content.includes('@include') && (
    content.includes('shared-frameworks/search') ||
    content.includes('baidu-web-search') ||
    content.includes('industry-queries')
  );
}

/**
 * Generate search_configs YAML from search markers
 */
function generateSearchConfigs(markers: SearchMarker[]): string {
  const configs: string[] = [];

  for (const marker of markers) {
    const name = marker.type;
    const injectAs = `search_${name}`;

    // Build query template based on type and args
    let queryTemplate = '';
    let industryType = '';

    switch (marker.type) {
      case 'background':
        queryTemplate = `{customer_name}的办学规模、学生人数、师资力量、办学特色等基本情况是什么？`;
        if (marker.args[1]) {
          const industry = marker.args[1];
          if (industry === 'education') industryType = 'education';
          else if (industry === 'medical') industryType = 'medical';
          else if (industry === 'government') industryType = 'government';
          else if (industry === 'finance') industryType = 'finance';
          else industryType = 'enterprise';
        }
        break;
      case 'decision':
        queryTemplate = `{customer_name}的校长、教务主任、信息化主任分别是谁？请重点搜索并总结他们关于教育信息化、数字化转型、智慧校园建设等方面的讲话、观点或相关政策。`;
        break;
      case 'cooperation':
        queryTemplate = `{customer_name}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、中标记录或签约情况？`;
        break;
      case 'digital':
        queryTemplate = `{customer_name}在教育信息化、数字化转型、智慧校园建设方面有哪些战略规划、重点项目、建设动态？`;
        break;
      case 'bidding':
        queryTemplate = `{customer_name}在办公软件、协同办公、文档管理、信息化建设等方面的招标、中标、采购记录有哪些？`;
        break;
      case 'subsidiary':
        queryTemplate = `{customer_name}的集团架构、子公司名单、分支机构分布是怎样的？`;
        break;
      case 'annual-report':
        queryTemplate = `{customer_name}最近年度的企业年报、年度战略规划、经营目标是什么？`;
        break;
      case 'tech-stack':
        queryTemplate = `{customer_name}的招聘JD、技术岗位要求中提到了哪些技术栈？`;
        break;
      case 'industry-trend':
        if (marker.args[0]) {
          queryTemplate = `{industry}信息化行业最新政策热点、标杆案例，请重点搜索最近6个月（180天）的政策、规范、指导意见和案例。`;
        } else {
          queryTemplate = `{industry}行业最新政策热点、标杆案例，请重点搜索最近6个月（180天）的信息。`;
        }
        break;
      case 'competitor':
        queryTemplate = `{product_name}的最新产品动态、功能更新、市场表现是什么？`;
        break;
      case 'case-study':
        queryTemplate = `{scenario}的成功案例、最佳实践、标杆项目有哪些？`;
        break;
      case 'custom':
        queryTemplate = marker.args[0] || `{query}`;
        break;
      default:
        queryTemplate = `{query}`;
    }

    configs.push(`  - name: ${name}`);
    configs.push(`    type: ${marker.type}`);
    configs.push(`    query_template: "${queryTemplate}"`);
    configs.push(`    inject_as: ${injectAs}`);
    if (industryType) {
      configs.push(`    industry_type: ${industryType}`);
    }
    configs.push(`    on_error: skip`);
  }

  return configs.join('\n');
}

/**
 * Migrate a skill file to v2 format
 */
function migrateSkillFile(filePath: string, markers: SearchMarker[], resultMarkers: SearchResultMarker[], hasInclude: boolean): string | null {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
  const frontmatterMatch = content.match(frontmatterRegex);

  if (!frontmatterMatch) {
    console.log(`  ⚠️  No frontmatter found, skipping`);
    return null;
  }

  const yamlContent = frontmatterMatch[1];
  let markdownContent = frontmatterMatch[2];

  // Generate search_configs YAML
  const searchConfigs = generateSearchConfigs(markers);

  // Remove search framework includes
  if (hasInclude) {
    const includeRegex = /@include\s+shared-frameworks\/search\/[^\n]+\n?/g;
    markdownContent = markdownContent.replace(includeRegex, '');
  }

  // Remove @baidu-search markers
  const searchRegex = /@baidu-search:[\w-]+\([^)]*\)\n?/g;
  markdownContent = markdownContent.replace(searchRegex, '');

  // Replace @search-result:xxx with {{search_xxx}}
  for (const resultMarker of resultMarkers) {
    const oldMarker = `@search-result:${resultMarker.type}`;
    const newPlaceholder = `{{search_${resultMarker.type}}}`;
    markdownContent = markdownContent.replaceAll(oldMarker, newPlaceholder);
  }

  // Update frontmatter with search_version and search_configs
  let newYamlContent = yamlContent;

  // Remove existing search_version if present
  newYamlContent = newYamlContent.replace(/search_version:\s*\S+\n?/g, '');
  newYamlContent = newYamlContent.replace(/search_configs:\s*\[[\s\S]*?\n?\n?/g, '');

  // Add search_version: v2
  if (newYamlContent.trim() && !newYamlContent.endsWith('\n')) {
    newYamlContent += '\n';
  }
  newYamlContent += 'search_version: v2\n';

  // Add search_configs
  newYamlContent += 'searches:\n';
  newYamlContent += searchConfigs + '\n';

  // Reconstruct file content
  const newContent = `---\n${newYamlContent}---\n${markdownContent}`;

  return newContent;
}

/**
 * Scan all skills and identify those needing migration
 */
function scanSkills(): SkillMigration[] {
  const migrations: SkillMigration[] = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    return migrations;
  }

  const categories = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const skillPath = path.join(SKILLS_DIR, category.name);
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const searchMarkers = extractSearchMarkers(content);
    const resultMarkers = extractSearchResultMarkers(content);
    const hasInclude = hasSearchFrameworkInclude(content);

    const needsMigration = searchMarkers.length > 0 || resultMarkers.length > 0 || hasInclude;

    migrations.push({
      filePath: skillMdPath,
      searchMarkers,
      resultMarkers,
      hasInclude,
      migrate: needsMigration,
    });
  }

  return migrations;
}

/**
 * Main migration function
 */
function main() {
  console.log('🔍 Scanning skills for migration...\n');

  const migrations = scanSkills();

  const needsMigration = migrations.filter(m => m.migrate);

  console.log(`Found ${migrations.length} skills, ${needsMigration.length} need migration\n`);

  if (needsMigration.length === 0) {
    console.log('✅ No migrations needed!');
    return;
  }

  // Show what will be migrated
  console.log('Skills to migrate:\n');
  for (const migration of needsMigration) {
    const relativePath = path.relative(SKILLS_DIR, migration.filePath);
    console.log(`  📄 ${relativePath}`);
    console.log(`     - ${migration.searchMarkers.length} search markers`);
    console.log(`     - ${migration.resultMarkers.length} result markers`);
    console.log(`     - Has search framework include: ${migration.hasInclude}`);
    console.log('');
  }

  // Perform migration
  console.log('\n🚀 Starting migration...\n');

  for (const migration of needsMigration) {
    const relativePath = path.relative(SKILLS_DIR, migration.filePath);
    console.log(`  Migrating: ${relativePath}`);

    try {
      const newContent = migrateSkillFile(
        migration.filePath,
        migration.searchMarkers,
        migration.resultMarkers,
        migration.hasInclude
      );

      if (newContent) {
        // Backup original file
        const backupPath = migration.filePath + '.bak';
        fs.copyFileSync(migration.filePath, backupPath);

        // Write new content
        fs.writeFileSync(migration.filePath, newContent, 'utf-8');
        console.log(`  ✅ Migrated successfully (backup: ${path.basename(backupPath)})`);
      }
    } catch (error) {
      console.error(`  ❌ Migration failed: ${error.message}`);
    }

    console.log('');
  }

  console.log('✨ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the migrated files');
  console.log('2. Test the skills to ensure they work correctly');
  console.log('3. Remove .bak files if everything looks good');
  console.log('4. Run database migration to add search_configs columns');
}

// Run migration
main();
