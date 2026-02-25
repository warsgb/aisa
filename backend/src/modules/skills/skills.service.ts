import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Skill } from '../../entities/skill.entity';
import { IronTriangleRole } from '../../entities/team-member-preference.entity';
import { SkillLoaderService } from './skill-loader.service';

interface SaveSkillData {
  name: string;
  description: string;
  category?: string;
  usage_hint?: string;
  parameters?: any[];
  supports_multi_turn?: boolean;
  role?: string;
  system_prompt: string;
}

interface ImportSkillData {
  content: string;
  originalName: string;
  targetFolder?: string;
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private skillLoaderService: SkillLoaderService,
    private configService: ConfigService,
  ) {}

  async findAll(includeDisabled?: boolean) {
    const where = includeDisabled ? {} : { is_enabled: true };
    return this.skillRepository.find({
      where,
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      return null;
    }
    return skill;
  }

  async findBySlug(slug: string) {
    return this.skillRepository.findOne({ where: { slug } });
  }

  async syncSkills() {
    await this.skillLoaderService.syncSkillsToDatabase();
    return { message: 'Skills synced successfully' };
  }

  // 获取技能完整内容（从文件读取）
  async getSkillContent(id: string): Promise<{ content: string; filePath: string } | null> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill || !skill.file_path) {
      return null;
    }

    const content = await this.skillLoaderService.getSkillContentFromFile(skill.file_path);
    if (!content) {
      return null;
    }

    return { content, filePath: skill.file_path };
  }

  // 保存技能内容到文件
  async saveSkillToFile(
    id: string,
    data: SaveSkillData,
  ): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }

    if (!skill.file_path) {
      throw new BadRequestException('该技能没有关联文件路径，无法保存到文件');
    }

    const success = await this.skillLoaderService.saveSkillToFile(skill.file_path, {
      name: data.name,
      description: data.description,
      category: data.category,
      usage_hint: data.usage_hint,
      parameters: data.parameters,
      supports_multi_turn: data.supports_multi_turn,
      role: data.role as any,
      system_prompt: data.system_prompt,
    });

    if (!success) {
      throw new BadRequestException('保存技能文件失败');
    }

    // 更新数据库记录
    skill.name = data.name;
    skill.description = data.description;
    skill.category = data.category || '';
    skill.usage_hint = data.usage_hint || '';
    skill.parameters = data.parameters || [];
    skill.system_prompt = data.system_prompt;
    skill.supports_multi_turn = data.supports_multi_turn || false;
    skill.last_synced_at = new Date();

    return this.skillRepository.save(skill);
  }

  // 删除技能（同时删除文件）
  async deleteSkill(id: string): Promise<{ message: string }> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }

    // 如果有文件路径，尝试删除文件（即使文件不存在也继续）
    if (skill.file_path) {
      try {
        await this.skillLoaderService.deleteSkillFile(skill.file_path);
      } catch (error) {
        // 即使文件删除失败，也继续删除数据库记录
        this.logger.warn(`Failed to delete skill file ${skill.file_path}, but continuing with database deletion`);
      }
    }

    // 删除数据库记录
    await this.skillRepository.delete(id);

    return { message: '删除成功' };
  }

  // 启用/禁用技能
  async toggleSkill(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }

    skill.is_enabled = !skill.is_enabled;
    return this.skillRepository.save(skill);
  }

  // 导入技能
  async importSkill(data: ImportSkillData): Promise<Skill> {
    const result = await this.skillLoaderService.importSkillFromFile(
      { content: data.content, originalName: data.originalName },
      data.targetFolder,
    );

    if (!result.success) {
      throw new BadRequestException(result.error || '导入失败');
    }

    // 重新加载并同步到数据库
    await this.skillLoaderService.syncSkillsToDatabase();

    // 查找刚导入的技能
    const folderName = data.targetFolder || this.extractSlugFromContent(data.content);
    const skill = await this.skillRepository.findOne({
      where: { file_path: folderName },
    });

    if (!skill) {
      throw new BadRequestException('导入成功但未找到技能记录');
    }

    return skill;
  }

  private extractSlugFromContent(content: string): string {
    const match = content.match(/slug:\s*(\S+)/);
    return match ? match[1] : '';
  }

  // 创建新技能（新建文件）
  async createSkill(
    data: SaveSkillData & { slug: string },
  ): Promise<Skill> {
    // 检查 slug 是否已存在
    const existing = await this.skillRepository.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new BadRequestException(`技能 slug "${data.slug}" 已存在`);
    }

    const filePath = data.slug;
    const success = await this.skillLoaderService.saveSkillToFile(filePath, {
      name: data.name,
      description: data.description,
      category: data.category,
      usage_hint: data.usage_hint,
      parameters: data.parameters,
      supports_multi_turn: data.supports_multi_turn,
      role: data.role as IronTriangleRole | undefined,
      system_prompt: data.system_prompt,
    });

    if (!success) {
      throw new BadRequestException('创建技能文件失败');
    }

    // 同步到数据库
    await this.skillLoaderService.syncSkillsToDatabase();

    // 查找刚创建的技能
    const skill = await this.skillRepository.findOne({ where: { slug: data.slug } });
    if (!skill) {
      throw new BadRequestException('创建成功但未找到技能记录');
    }

    return skill;
  }

  // 导入技能从ZIP文件
  async importSkillFromZip(
    buffer: Buffer,
    targetFolder?: string,
  ): Promise<Skill> {
    const result = await this.skillLoaderService.importSkillFromZip(buffer, targetFolder);

    if (!result.success) {
      throw new BadRequestException(result.error || '导入失败');
    }

    // 重新加载并同步到数据库
    await this.skillLoaderService.syncSkillsToDatabase();

    // 查找刚导入的技能
    const folderName = result.filePath;
    const skill = await this.skillRepository.findOne({
      where: { file_path: folderName },
    });

    if (!skill) {
      throw new BadRequestException('导入成功但未找到技能记录');
    }

    return skill;
  }

  // 获取技能的所有文件
  async getSkillFiles(id: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill || !skill.file_path) {
      throw new NotFoundException('技能不存在或没有关联文件');
    }

    return this.skillLoaderService.getSkillFiles(skill.file_path);
  }

  // 获取技能文件内容
  async getFileContent(id: string, filePath: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill || !skill.file_path) {
      throw new NotFoundException('技能不存在或没有关联文件');
    }

    // Extract file name from path (filePath is relative to skill directory)
    const fileName = filePath.replace(skill.file_path + '/', '');
    const content = this.skillLoaderService.getFileContent(skill.file_path, fileName);

    if (content === null) {
      throw new NotFoundException('文件不存在或无法读取');
    }

    return { content };
  }

  // 更新技能文件内容
  async updateFileContent(id: string, filePath: string, content: string) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill || !skill.file_path) {
      throw new NotFoundException('技能不存在或没有关联文件');
    }

    // Extract file name from path
    const fileName = filePath.replace(skill.file_path + '/', '');
    const success = this.skillLoaderService.saveFileContent(skill.file_path, fileName, content);

    if (!success) {
      throw new BadRequestException('保存文件失败');
    }

    // If updating SKILL.md, also update database
    if (fileName === 'SKILL.md') {
      const { frontmatter, markdown } = this.skillLoaderService.parseFrontmatter(content);
      skill.name = this.skillLoaderService.extractTitleFromMarkdown(markdown) || frontmatter.name;
      skill.description = frontmatter.description;
      skill.category = frontmatter.category || '';
      skill.usage_hint = frontmatter.usage_hint || '';
      skill.system_prompt = markdown;
      skill.last_synced_at = new Date();
      await this.skillRepository.save(skill);
    }

    return { message: '保存成功' };
  }

  // 更新技能参数标签
  async updateParameterLabels(id: string, parameters: any[]) {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill || !skill.file_path) {
      throw new NotFoundException('技能不存在或没有关联文件');
    }

    // Read the SKILL.md file
    const skillMdPath = path.join(this.configService.get('SKILLS_DIR') || '../skills', skill.file_path, 'SKILL.md');
    const content = await fs.promises.readFile(skillMdPath, 'utf-8');

    // Update parameter labels in the frontmatter
    const { frontmatter, markdown } = this.skillLoaderService.parseFrontmatter(content);

    // Update labels
    if (frontmatter.parameters) {
      frontmatter.parameters.forEach((param: any) => {
        const updatedParam = parameters.find(p => p.name === param.name);
        if (updatedParam && updatedParam.label) {
          param.label = updatedParam.label;
        }
      });
    }

    // Rebuild the SKILL.md file with updated labels
    const updatedContent = this.rebuildSkillMarkdown(frontmatter, markdown);

    // Save the file
    await fs.promises.writeFile(skillMdPath, updatedContent, 'utf-8');

    // Update database
    skill.parameters = frontmatter.parameters || [];
    skill.last_synced_at = new Date();
    await this.skillRepository.save(skill);

    return { message: '参数标签保存成功' };
  }

  private rebuildSkillMarkdown(frontmatter: any, markdown: string): string {
    // Build frontmatter YAML
    let yaml = '---\n';
    yaml += `name: ${frontmatter.slug || frontmatter.name}\n`;
    yaml += `description: ${frontmatter.description}\n`;
    if (frontmatter.tools) yaml += `tools: ${frontmatter.tools}\n`;
    if (frontmatter.category) yaml += `category: ${frontmatter.category}\n`;
    if (frontmatter.usage_hint) yaml += `usage_hint: ${frontmatter.usage_hint}\n`;
    if (frontmatter.supports_multi_turn) yaml += `supports_multi_turn: ${frontmatter.supports_multi_turn}\n`;
    if (frontmatter.role) yaml += `role: ${frontmatter.role}\n`;

    if (frontmatter.parameters && frontmatter.parameters.length > 0) {
      yaml += 'parameters:\n';
      frontmatter.parameters.forEach((param: any) => {
        yaml += `  ${param.name}:\n`;
        yaml += `    type: ${param.type}\n`;
        if (param.label) yaml += `    label: ${param.label}\n`;
        if (param.description) yaml += `    description: ${param.description}\n`;
        if (param.required !== undefined) yaml += `    required: ${param.required}\n`;
        if (param.default !== undefined) yaml += `    default: ${JSON.stringify(param.default)}\n`;
        if (param.placeholder) yaml += `    placeholder: ${param.placeholder}\n`;
        if (param.options && param.options.length > 0) yaml += `    options: ${JSON.stringify(param.options)}\n`;
      });
    }

    yaml += '---\n';

    return yaml + markdown;
  }
}
