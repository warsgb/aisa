import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import { Document } from '../../entities/document.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { Skill } from '../../entities/skill.entity';
import { AIService } from '../../common/services/ai.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Customer360Service {
  private readonly logger = new Logger(Customer360Service.name);
  private readonly outputDir: string;
  private readonly templateDir: string;
  private readonly frontendPublicDir: string;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(CustomerFollowup)
    private followupRepository: Repository<CustomerFollowup>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(SkillInteraction)
    private skillInteractionRepository: Repository<SkillInteraction>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private aiService: AIService,
  ) {
    this.outputDir = path.join(process.cwd(), 'customer360');
    this.templateDir = path.join(process.cwd(), 'src', 'templates');
    // 前端public目录，用于存放可直接访问的HTML文件
    this.frontendPublicDir = path.join(process.cwd(), '..', 'dist', 'reports');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }
    // 创建前端public目录
    if (!fs.existsSync(this.frontendPublicDir)) {
      fs.mkdirSync(this.frontendPublicDir, { recursive: true });
    }
  }

  /**
   * 复制文件到前端目录
   */
  private copyToFrontend(sourcePath: string, customerId: string): void {
    try {
      const destPath = path.join(this.frontendPublicDir, `${customerId}.html`);
      fs.copyFileSync(sourcePath, destPath);
      this.logger.log(`已复制HTML到前端目录: ${destPath}`);
    } catch (error) {
      this.logger.warn(`复制到前端目录失败: ${error}`);
    }
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  private escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 生成AI销售摘要（同步方式）
   */
  private async generateAISalesSummary(
    customer: Customer,
    profile: CustomerProfile | null,
    skillsDocuments: any[],
    interactions: SkillInteraction[],
  ): Promise<string> {
    try {
      this.logger.log(`开始生成AI销售摘要: ${customer.name}`);

      // 1. 构建上下文（全文，不截断）
      const context = this.buildFullContext(customer, profile, skillsDocuments, interactions);

      // 2. 调用AI服务（复用现有逻辑）
      const systemPrompt = this.getSystemPrompt();
      const userMessage = this.buildUserMessage(context);

      let fullResponse = '';
      await this.aiService.stream({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        onChunk: (chunk: string) => {
          fullResponse += chunk;
        },
        onComplete: () => {
          this.logger.log(`AI摘要生成完成: ${customer.name}, 字数: ${fullResponse.length}`);
        },
        onError: (error: any) => {
          this.logger.error(`AI摘要生成失败: ${customer.name}`, error);
          throw error;
        },
      });

      return fullResponse.trim() || this.getFallbackSummary(context);
    } catch (error) {
      this.logger.error(`AI摘要生成失败，使用降级方案: ${customer.name}`, error);
      // 降级方案：返回模板化摘要
      const context = this.buildFullContext(customer, profile, skillsDocuments, interactions);
      return this.getFallbackSummary(context);
    }
  }

  /**
   * 构建完整上下文（全文数据）
   */
  private buildFullContext(
    customer: Customer,
    profile: CustomerProfile | null,
    skillsDocuments: any[],
    interactions: SkillInteraction[],
  ): any {
    // 客户背景资料（全文）
    const profileText = `
基本信息：
${profile?.background_info || '暂无'}

决策链：
${profile?.decision_chain || '暂无'}

历史合作：
${profile?.history_notes || '暂无'}
`;

    // 技能文档（每个技能最新1篇，全文）
    const skillsText = skillsDocuments
      .map((skill) => {
        const doc = skill.documents[0]; // 最新文档
        if (!doc) return '';
        return `
【${skill.skillName}】
标题：${doc.title}
生成时间：${this.formatDate(doc.created_at)}

${doc.content}
`;
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    // 交互历史
    const completedInteractions = interactions.filter((i) => i.status === 'COMPLETED');
    const interactionText = `
- 首次互动：${this.formatDate(completedInteractions[0]?.created_at) || '无'}
- 最近互动：${this.formatDate(completedInteractions[completedInteractions.length - 1]?.created_at) || '无'}
- 完成技能数：${new Set(completedInteractions.map((i) => i.skill_id)).size}个
`;

    return {
      customer: {
        name: customer.name,
        industry: customer.industry || '未知',
      },
      profileText,
      skillsText,
      interactionText,
    };
  }

  /**
   * 系统提示词
   */
  private getSystemPrompt(): string {
    return `你是一位资深的WPS 365企业销售顾问，拥有15年B2B销售经验。你的任务是分析客户的所有背景资料、技能执行文档和交互历史，生成一份500字左右的销售摘要，帮助销售团队快速理解客户情况并推进商机。

**输出要求**：
1. 总字数控制在500字左右（3-4段）
2. 专业、简洁、行动导向
3. 重点突出：WPS 365合作方向、关键切入点、主推产品、下一步行动建议
4. 使用Markdown格式（标题、列表、加粗等）

**内容结构**：
- 第1段：客户画像与核心痛点（基于背景资料）
- 第2段：WPS 365合作切入点与主推产品（基于技能分析）
- 第3段：商机推进建议与下一步行动（行动导向）
- 可选第4段：风险提示或竞争态势（如有）

**语调风格**：
- 专业但不失亲和
- 数据驱动（引用具体信息）
- 乐观但务实
- 以客户价值为核心`;
  }

  /**
   * 用户消息
   */
  private buildUserMessage(context: any): string {
    const { customer, profileText, skillsText, interactionText } = context;
    return `请基于以下客户信息，生成一份WPS 365销售摘要：

## 客户基本信息
- 名称：${customer.name}
- 行业：${customer.industry}

## 客户背景资料
${profileText}

## 技能执行记录（最新文档全文）
${skillsText}

## 交互历史
${interactionText}

请生成500字左右的销售摘要。`;
  }

  /**
   * 降级方案：模板化摘要
   */
  private getFallbackSummary(context: any): string {
    const { customer, skillsText, interactionText } = context;

    return `### 客户概况

${customer.name}是${customer.industry}行业的客户。

### 建议合作方向

基于已执行的技能分析，建议深入了解客户数字化转型需求，重点推广WPS 365企业版。

### 下一步行动

建议安排高层拜访，演示WPS 365的核心功能。

> *注：此为自动生成的摘要，建议人工复核。*`;
  }

  async getCustomer360Data(customerId: string, teamId: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const profile = await this.customerProfileRepository.findOne({
      where: { customer_id: customerId },
    });

    // Get all documents with their interactions and skills
    const documents = await this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.interaction', 'interaction')
      .leftJoinAndSelect('interaction.skill', 'skill')
      .where('doc.customer_id = :customerId', { customerId })
      .orderBy('doc.created_at', 'DESC')
      .getMany();

    // Group documents by skill
    const skillDocsMap = new Map<string, { skillName: string; documents: any[] }>();
    const uniqueSkills = new Set<string>();

    documents.forEach((doc) => {
      const skillId = doc.interaction?.skill_id || 'unknown';
      const skillName = doc.interaction?.skill?.name || '未知技能';

      if (!skillDocsMap.has(skillId)) {
        skillDocsMap.set(skillId, { skillName, documents: [] });
      }
      skillDocsMap.get(skillId)!.documents.push(doc);
      uniqueSkills.add(skillId);
    });

    // Format skills documents (only latest per skill)
    // 注意：latestContent 保留原始 markdown，EJS 模板用 <%- %> 渲染后由 renderMarkdown() 处理
    const skillsDocuments = Array.from(skillDocsMap.entries()).map(([skillId, data]) => ({
      skillName: this.escapeHtml(data.skillName),
      documentCount: data.documents.length,
      lastUpdated: this.formatDate(data.documents[0]?.created_at),
      latestContent: data.documents[0]?.content || '',
      documents: data.documents, // Keep full documents for AI processing
    }));

    // Get interactions for summary
    const interactions = await this.skillInteractionRepository.find({
      where: { customer_id: customerId },
      order: { created_at: 'ASC' },
    });

    const completedInteractions = interactions.filter((i) => i.status === 'COMPLETED');
    const firstInteraction = completedInteractions[0]?.created_at;
    const lastInteraction = completedInteractions[completedInteractions.length - 1]?.created_at;

    // ✨ 新增：生成AI销售摘要（同步等待）
    const aiSummary = await this.generateAISalesSummary(customer, profile, skillsDocuments, interactions);

    // Get followups
    const followups = await this.followupRepository.find({
      where: { customer_id: customerId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
    const formattedFollowups = followups.map((f) => ({
      content: this.escapeHtml(f.content),
      userName: f.user?.full_name || '未知用户',
      createdAt: this.formatDate(f.created_at),
    }));

    // Build profile sections
    const profileSections = [
      {
        title: '基本信息',
        icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>',
        content: profile?.background_info || '',
      },
      {
        title: '决策链',
        icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
        content: profile?.decision_chain || '',
      },
      {
        title: '历史合作',
        icon: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
        content: profile?.history_notes || '',
      },
    ];

    return {
      customer: {
        name: this.escapeHtml(customer.name),
        industry: this.escapeHtml(customer.industry || ''),
      },
      generatedAt: this.formatDate(new Date()),
      aiSummary, // ✨ 新增字段：AI销售摘要
      summary: {
        skillsUsed: uniqueSkills.size,
        totalDocuments: documents.length,
        firstInteraction: firstInteraction ? this.formatDate(firstInteraction) : '',
        lastInteraction: lastInteraction ? this.formatDate(lastInteraction) : '',
      },
      profileSections,
      skillsDocuments,
      followups: formattedFollowups,
    };
  }

  async generateCustomer360Html(customerId: string, teamId: string): Promise<string> {
    const data = await this.getCustomer360Data(customerId, teamId);
    const templatePath = path.join(this.templateDir, 'customer360.ejs');

    let html: string;

    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const ejs = require('ejs');
      html = ejs.render(template, data);
    } else {
      html = this.generateDefaultHtml(data);
    }

    const outputPath = path.join(this.outputDir, `${customerId}.html`);
    fs.writeFileSync(outputPath, html, 'utf-8');

    // 同时复制到前端目录
    this.copyToFrontend(outputPath, customerId);

    return outputPath;
  }

  async getCustomer360Preview(customerId: string): Promise<string> {
    const filePath = path.join(this.outputDir, `${customerId}.html`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Customer 360 report not found. Please generate it first.');
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  async checkCustomer360Exists(customerId: string): Promise<boolean> {
    const filePath = path.join(this.outputDir, `${customerId}.html`);
    return fs.existsSync(filePath);
  }

  async downloadCustomer360(customerId: string): Promise<Buffer> {
    const filePath = path.join(this.outputDir, `${customerId}.html`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Customer 360 report not found. Please generate it first.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer;
  }

  private generateDefaultHtml(data: any): string {
    const { customer, summary, profileSections, skillsDocuments, aiSummary, followups } = data;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>客户360视图 - ${customer.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F5F7FA; padding: 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header h1 { font-size: 24px; font-weight: 600; }
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .summary-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .summary-card .value { font-size: 28px; font-weight: 700; color: #1677FF; }
    .summary-card .label { font-size: 13px; color: #666; margin-top: 4px; }
    .section { background: #fff; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .section-header { padding: 16px 24px; border-bottom: 1px solid #E8E8E8; font-weight: 600; }
    .section-content { padding: 20px 24px; }
    .skill-item { padding: 16px; border-bottom: 1px solid #E8E8E8; }
    .skill-item:last-child { border-bottom: none; }
    .skill-name { font-weight: 500; margin-bottom: 8px; }
    .skill-meta { font-size: 12px; color: #999; }
    .profile-item { margin-bottom: 16px; }
    .profile-item h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
    .profile-content { background: #F5F7FA; padding: 12px; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${customer.name}</h1>
      <p style="color: #666; margin-top: 8px;">${customer.industry || '未分类'}</p>
    </div>

    <div class="summary-cards">
      <div class="summary-card"><div class="value">${summary.skillsUsed}</div><div class="label">使用技能数</div></div>
      <div class="summary-card"><div class="value">${summary.totalDocuments}</div><div class="label">文档总数</div></div>
      <div class="summary-card"><div class="value">${summary.firstInteraction || '—'}</div><div class="label">首次互动</div></div>
      <div class="summary-card"><div class="value">${summary.lastInteraction || '—'}</div><div class="label">最近互动</div></div>
    </div>

    <div class="section">
      <div class="section-header">客户档案</div>
      <div class="section-content">
        ${profileSections.map((section: any) => section.content ? `<div class="profile-item"><h3>${section.title}</h3><div class="profile-content">${section.content}</div></div>` : '').join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-header">技能文档 (${skillsDocuments.length} 个技能)</div>
      <div class="section-content">
        ${skillsDocuments.length > 0 ? skillsDocuments.map((item: any) => `<div class="skill-item"><div class="skill-name">${item.skillName}</div><div class="skill-meta">${item.documentCount} 篇文档 · 最近更新：${item.lastUpdated}</div></div>`).join('') : '<p style="color: #999;">暂无技能文档</p>'}
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
