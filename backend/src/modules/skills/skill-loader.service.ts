import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../../entities/skill.entity';
import { IronTriangleRole } from '../../entities/team-member-preference.entity';

interface SkillFrontmatter {
  slug: string;
  name: string;
  description: string;
  category?: string;
  usage_hint?: string;
  parameters?: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    default?: any;
    options?: string[];
    placeholder?: string;
  }>;
  supports_multi_turn?: boolean;
  role?: IronTriangleRole;
}

@Injectable()
export class SkillLoaderService {
  private readonly logger = new Logger(SkillLoaderService.name);
  private skillsDir: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
  ) {
    // Skills directory - support environment variable or use relative path
    const envSkillsDir = this.configService.get<string>('SKILLS_DIR');
    if (envSkillsDir) {
      this.skillsDir = envSkillsDir;
    } else {
      // Default: ../skills from backend directory, or ./skills if running from project root
      const possiblePaths = [
        path.join(process.cwd(), '..', 'skills'),
        path.join(process.cwd(), 'skills'),
        path.join(__dirname, '..', '..', '..', 'skills'),
      ];
      // Use first existing directory
      this.skillsDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    }
    this.logger.log(`Skills directory: ${this.skillsDir}`);
  }

  async loadAllSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      const categories = fs.readdirSync(this.skillsDir, { withFileTypes: true });

      for (const category of categories) {
        if (!category.isDirectory()) continue;

        const skillPath = path.join(this.skillsDir, category.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
          const skill = await this.loadSkillFromFile(category.name, skillMdPath);
          if (skill) {
            skills.push(skill);
          }
        }
      }

      this.logger.log(`Loaded ${skills.length} skills from ${this.skillsDir}`);
      return skills;
    } catch (error) {
      this.logger.error('Error loading skills:', error);
      return [];
    }
  }

  async loadSkillFromFile(category: string, filePath: string): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, markdown } = this.parseFrontmatter(content);

      if (!frontmatter.slug || !frontmatter.name || !frontmatter.description) {
        this.logger.warn(`Invalid skill frontmatter in ${filePath}`);
        return null;
      }

      // Extract Chinese name from markdown title (# Title)
      const displayName = this.extractTitleFromMarkdown(markdown) || frontmatter.name;

      // Check if skill already exists
      let skill = await this.skillRepository.findOne({
        where: { slug: frontmatter.slug },
      });

      const categoryValue = frontmatter.category || category;
      const parametersValue = frontmatter.parameters || [];

      if (skill) {
        // Update existing skill
        skill.name = displayName; // Use Chinese name from markdown title
        skill.description = frontmatter.description;
        skill.category = categoryValue;
        skill.usage_hint = frontmatter.usage_hint || '';
        skill.parameters = parametersValue;
        skill.system_prompt = markdown;
        skill.supports_multi_turn = frontmatter.supports_multi_turn || false;
        skill.iron_triangle_role = frontmatter.role || null;
      } else {
        // Create new skill
        skill = this.skillRepository.create({
          slug: frontmatter.slug,
          name: displayName, // Use Chinese name from markdown title
          description: frontmatter.description,
          category: categoryValue,
          usage_hint: frontmatter.usage_hint || '',
          parameters: parametersValue,
          system_prompt: markdown,
          supports_streaming: true,
          supports_multi_turn: frontmatter.supports_multi_turn || false,
          iron_triangle_role: frontmatter.role || null,
        });
      }

      return await this.skillRepository.save(skill);
    } catch (error) {
      this.logger.error(`Error loading skill from ${filePath}:`, error);
      return null;
    }
  }

  private extractTitleFromMarkdown(markdown: string): string | null {
    // Extract the first # heading as the display name
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  private parseRole(roleValue: string | null): IronTriangleRole | undefined {
    if (!roleValue) return undefined;
    const upperRole = roleValue.toUpperCase();
    if (upperRole === 'AR') return IronTriangleRole.AR;
    if (upperRole === 'SR') return IronTriangleRole.SR;
    if (upperRole === 'FR') return IronTriangleRole.FR;
    return undefined;
  }

  private parseFrontmatter(content: string): {
    frontmatter: SkillFrontmatter;
    markdown: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      // No frontmatter, treat entire content as markdown
      return {
        frontmatter: {
          slug: '',
          name: '',
          description: '',
        },
        markdown: content,
      };
    }

    const yamlContent = match[1];
    const markdown = match[2];

    // Extract fields
    const slug = this.extractYamlField(yamlContent, 'slug') || this.extractYamlField(yamlContent, 'name') || '';
    const name = this.extractYamlField(yamlContent, 'name') || '';
    const description = this.extractYamlField(yamlContent, 'description') || '';

    const frontmatter: SkillFrontmatter = {
      slug,
      name,
      description,
      category: this.extractYamlField(yamlContent, 'category') || undefined,
      usage_hint: this.extractYamlField(yamlContent, 'usage_hint') || undefined,
      supports_multi_turn: this.extractYamlField(yamlContent, 'supports_multi_turn') === 'true',
      role: this.parseRole(this.extractYamlField(yamlContent, 'role')),
    };

    // Parse parameters - try both JSON and YAML formats
    const parametersStr = this.extractYamlField(yamlContent, 'parameters');
    if (parametersStr) {
      this.logger.log(`[parseYamlParameters] Raw parameters string length: ${parametersStr.length}`);
      this.logger.log(`[parseYamlParameters] First 200 chars:\n${parametersStr.substring(0, 200)}`);

      // Try JSON format first
      try {
        const parsed = JSON.parse(parametersStr);
        this.logger.log(`[parseYamlParameters] JSON parse successful, ${parsed.length} parameters`);
        frontmatter.parameters = parsed;
      } catch (jsonError) {
        // If JSON fails, try parsing as YAML-like format
        this.logger.log(`[parseYamlParameters] JSON parse failed: ${jsonError.message}, trying YAML parsing`);
        const parsedParams = this.parseYamlParameters(parametersStr);
        this.logger.log(`[parseYamlParameters] YAML parse result: ${parsedParams.length} parameters`);
        frontmatter.parameters = parsedParams;
      }
    } else {
      frontmatter.parameters = [];
    }

    return { frontmatter, markdown };
  }

  private parseYamlParameters(parametersStr: string): Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    default?: any;
    options?: string[];
    placeholder?: string;
    description?: string;
  }> {
    const parameters: any[] = [];
    const lines = parametersStr.split('\n');

    this.logger.log(`[parseYamlParameters] Starting to parse parameters string, length: ${parametersStr.length}`);
    this.logger.log(`[parseYamlParameters] First 200 chars:\n${parametersStr.substring(0, 200)}`);

    let currentParam: any = null;
    let paramBaseIndent: number | null = null; // Indentation of parameter names (e.g., "target_role:")

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const indent = line.search(/\S/);
      this.logger.log(`[parseYamlParameters] Line indent=${indent}, trimmed="${trimmed.substring(0, 30)}"`);

      // Auto-detect the indentation level for parameter names
      // Parameter names are the ones that have property definitions nested under them
      if (paramBaseIndent === null) {
        // Check if this line looks like a parameter name (followed by nested properties on next lines)
        const isPotentialParamName = trimmed.match(/^\w+:\s*$/);
        if (isPotentialParamName) {
          // Look ahead to see if next line has more indentation (indicating nested properties)
          const lineIndex = lines.indexOf(line);
          if (lineIndex < lines.length - 1) {
            const nextLine = lines[lineIndex + 1];
            const nextIndent = nextLine.search(/\S/);
            if (nextIndent > indent) {
              // This is a parameter name with nested properties
              paramBaseIndent = indent;
              this.logger.log(`[parseYamlParameters] Detected parameter base indent: ${paramBaseIndent}`);
            }
          }
        }
        // Skip lines until we know the parameter indent
        if (paramBaseIndent === null) continue;
      }

      // Check if this is a new parameter (at the base indent level)
      if (indent === paramBaseIndent) {
        // Save previous parameter if exists
        if (currentParam) {
          this.logger.log(`[parseYamlParameters] Saving param: ${currentParam.name}`);
          parameters.push(currentParam);
        }

        // Start new parameter
        const match = trimmed.match(/^(\w+):\s*(.*)$/);
        if (match) {
          const paramName = match[1];
          const value = match[2].trim();

          this.logger.log(`[parseYamlParameters] Found parameter: ${paramName} with value: ${value}`);

          currentParam = {
            name: paramName,
            type: 'string',
            label: this.getParameterLabel(paramName),
            required: false,
            description: value || '',
            placeholder: '',
          };
        }
      } else if (currentParam && indent > paramBaseIndent) {
        // Parse nested property
        const keyMatch = trimmed.match(/^(\w+):\s*(.*)$/);
        if (keyMatch) {
          const key = keyMatch[1];
          const value = keyMatch[2].trim();

          this.logger.log(`[parseYamlParameters] Property ${currentParam.name}.${key} = ${value}`);

          switch (key) {
            case 'type':
              currentParam.type = value;
              break;
            case 'description':
              currentParam.description = value;
              break;
            case 'required':
              currentParam.required = value === 'true';
              break;
            case 'placeholder':
              currentParam.placeholder = value;
              break;
            case 'options':
              // Handle array-like options: ["a", "b", "c"]
              if (value.startsWith('[')) {
                try {
                  currentParam.options = JSON.parse(value.replace(/'/g, '"'));
                } catch {
                  currentParam.options = value.split(/,\s*/).map((v: string) => v.trim().replace(/[\[\]"']/g, ''));
                }
              } else if (value.includes(',')) {
                currentParam.options = value.split(',').map((v: string) => v.trim());
              } else {
                currentParam.options = [value];
              }
              break;
            case 'default':
              try {
                currentParam.default = JSON.parse(value);
              } catch {
                currentParam.default = value;
              }
              break;
          }
        }
      }
    }

    // Don't forget the last parameter
    if (currentParam) {
      this.logger.log(`[parseYamlParameters] Saving final param: ${currentParam.name}`);
      parameters.push(currentParam);
    }

    this.logger.log(`[parseYamlParameters] Total parameters parsed: ${parameters.length}`);

    return parameters;
  }

  private getParameterLabel(paramName: string): string {
    // Map parameter names to Chinese labels
    const labelMap: Record<string, string> = {
      target: '研究目标',
      document_type: '文档类型',
      focus_areas: '关注领域',
      competitor: '竞品名称',
      customer_type: '客户类型',
      competitor_advantage: '竞品优势',
      target_role: '目标角色',
      industry: '行业类型',
      hook_type: '钩子类型',
      company: '公司名称',
      position: '职位',
      pain_point: '痛点',
      objection: '异议点',
      industry_sector: '行业领域',
      context: '背景信息',
      topic: '话题主题',
      negotiation_stage: '谈判阶段',
      budget_range: '预算范围',
      timeline: '时间线',
      keywords: '关键词',
      content_type: '内容类型',
      platform: '发布平台',
      style: '风格偏好',
    };

    return labelMap[paramName] || paramName;
  }

  private extractYamlField(yamlContent: string, fieldName: string): string | null {
    const lines = yamlContent.split('\n');

    // Find the field definition line (e.g., "parameters:")
    let fieldStartIndex = -1;
    let baseIndent = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const match = trimmed.match(new RegExp(`^${fieldName}:\\s*(.*)`));
      if (match) {
        fieldStartIndex = i;
        baseIndent = lines[i].search(/\S/);
        // If the field has an inline value (e.g., "name: value"), return it immediately
        if (match[1] !== '') {
          return match[1].trim();
        }
        break;
      }
    }

    if (fieldStartIndex === -1) {
      return null; // Field not found
    }

    // For multi-line values, collect everything from the next line until we hit another field at same or lower level
    const collectedLines: string[] = [];
    for (let i = fieldStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S/);

      // Skip empty lines at the start
      if (trimmed === '' && collectedLines.length === 0) {
        continue;
      }

      // Stop if we hit another field at same or lower indentation level
      // This handles both "field:" at same level and "field:" at outer level
      if (indent <= baseIndent && trimmed.match(/^\w+:/)) {
        break;
      }

      // Stop if we hit the end of frontmatter (should not happen, but safety check)
      if (trimmed === '---') {
        break;
      }

      // Add line content (preserving indentation)
      collectedLines.push(line);
    }

    let fieldValue = collectedLines.join('\n');
    // Only trim trailing whitespace, preserve leading indentation
    fieldValue = fieldValue.replace(/\s+$/, '');

    return fieldValue || null;
  }

  async syncSkillsToDatabase(): Promise<void> {
    const skills = await this.loadAllSkills();
    this.logger.log(`Synced ${skills.length} skills to database`);
  }
}
