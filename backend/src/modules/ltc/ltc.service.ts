import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LtcNode } from '../../entities/ltc-node.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { TeamMemberPreference, IronTriangleRole } from '../../entities/team-member-preference.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SystemLtcNode } from '../../entities/system-ltc-node.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { SystemConfig } from '../../entities/system-config.entity';
import { CreateLtcNodeDto } from './dto/create-ltc-node.dto';
import { UpdateLtcNodeDto } from './dto/update-ltc-node.dto';
import { CreateNodeSkillBindingDto } from './dto/create-node-skill-binding.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { UpdateTeamMemberPreferenceDto } from './dto/update-team-member-preference.dto';
import { AutoFillCustomerProfileDto } from './dto/auto-fill-customer-profile.dto';
import { AIService } from '../../common/services/ai.service';
import { Logger } from '@nestjs/common';

// Default LTC nodes - 产品需求文档确认版本
const DEFAULT_LTC_NODES = [
  { name: '线索', description: '潜在客户发现与初步接触', order: 0 },
  { name: '商机', description: '确认客户需求与购买意向', order: 1 },
  { name: '方案', description: '制定解决方案与POC演示', order: 2 },
  { name: 'POC', description: '产品验证与方案测试', order: 3 },
  { name: '商务谈判', description: '合同条款与价格谈判', order: 4 },
  { name: '成交签约', description: '正式签署合作协议', order: 5 },
  { name: '交付验收', description: '项目实施与验收', order: 6 },
  { name: '运营&增购', description: '客户运营与增购机会', order: 7 },
];

@Injectable()
export class LtcService {
  private readonly logger = new Logger(LtcService.name);

  constructor(
    @InjectRepository(LtcNode)
    private ltcNodeRepository: Repository<LtcNode>,
    @InjectRepository(NodeSkillBinding)
    private nodeSkillBindingRepository: Repository<NodeSkillBinding>,
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(TeamMemberPreference)
    private teamMemberPreferenceRepository: Repository<TeamMemberPreference>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(SystemLtcNode)
    private systemLtcNodeRepository: Repository<SystemLtcNode>,
    @InjectRepository(SystemRoleSkillConfig)
    private systemRoleSkillConfigRepository: Repository<SystemRoleSkillConfig>,
    @InjectRepository(TeamRoleSkillConfig)
    private teamRoleSkillConfigRepository: Repository<TeamRoleSkillConfig>,
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
    private aiService: AIService,
  ) {}

  // Helper method to get system config
  private async getSystemConfig(key: string): Promise<string | null> {
    const config = await this.systemConfigRepository.findOne({
      where: { key: key as any },
    });
    return config?.value || null;
  }

  private async verifyTeamAccess(teamId: string, userId: string): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }
  }

  // LTC Node Management
  async findAllNodes(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    return this.ltcNodeRepository.find({
      where: { team_id: teamId },
      order: { order: 'ASC' },
    });
  }

  async createNode(teamId: string, userId: string, dto: CreateLtcNodeDto) {
    await this.verifyTeamAccess(teamId, userId);

    const maxOrder = await this.ltcNodeRepository
      .createQueryBuilder('node')
      .where('node.team_id = :teamId', { teamId })
      .select('MAX(node.order)', 'max')
      .getRawOne();

    const node = this.ltcNodeRepository.create({
      team_id: teamId,
      name: dto.name,
      description: dto.description,
      order: dto.order ?? (maxOrder?.max ? parseInt(maxOrder.max) + 1 : 0),
    });

    return this.ltcNodeRepository.save(node);
  }

  async updateNode(teamId: string, nodeId: string, userId: string, dto: UpdateLtcNodeDto) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    await this.ltcNodeRepository.update(nodeId, dto);
    return this.ltcNodeRepository.findOne({
      where: { id: nodeId },
      relations: ['skill_bindings', 'skill_bindings.skill'],
    });
  }

  async deleteNode(teamId: string, nodeId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    await this.ltcNodeRepository.delete(nodeId);
    return { message: 'LTC node deleted successfully' };
  }

  async reorderNodes(teamId: string, userId: string, nodeIds: string[]) {
    try {
      await this.verifyTeamAccess(teamId, userId);

      const nodes = await this.ltcNodeRepository.find({
        where: { team_id: teamId, id: In(nodeIds) },
      });

      if (nodes.length !== nodeIds.length) {
        throw new NotFoundException('Some LTC nodes not found');
      }

      for (let i = 0; i < nodeIds.length; i++) {
        await this.ltcNodeRepository.update(nodeIds[i], { order: i });
      }

      return this.findAllNodes(teamId, userId);
    } catch (error) {
      console.error('Error in reorderNodes:', error);
      throw error;
    }
  }

  async resetToDefault(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Delete existing nodes
    await this.ltcNodeRepository.delete({ team_id: teamId });

    // Create default nodes
    const nodes = DEFAULT_LTC_NODES.map((node) =>
      this.ltcNodeRepository.create({
        team_id: teamId,
        ...node,
      }),
    );

    await this.ltcNodeRepository.save(nodes);
    return this.findAllNodes(teamId, userId);
  }

  async resetToSystemDefaults(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // 1. Delete all system nodes for this team
    await this.ltcNodeRepository.delete({
      team_id: teamId,
      source: 'SYSTEM',
    });

    // 2. Delete all system role-skill configs for this team
    await this.teamRoleSkillConfigRepository.delete({
      team_id: teamId,
      source: 'SYSTEM',
    });

    // 3. Sync from system defaults
    return this.syncFromSystem(teamId, userId);
  }

  private async syncFromSystem(teamId: string, userId: string) {
    // 1. Get all system LTC nodes
    const systemNodes = await this.systemLtcNodeRepository.find({
      order: { order: 'ASC' },
    });

    // 2. Create team nodes from system templates
    const teamNodes = await Promise.all(
      systemNodes.map((systemNode) =>
        this.ltcNodeRepository.save({
          team_id: teamId,
          name: systemNode.name,
          description: systemNode.description,
          order: systemNode.order,
          source: 'SYSTEM',
          system_node_id: systemNode.id,
        }),
      ),
    );

    // 3. Create skill bindings for each node
    for (let i = 0; i < systemNodes.length; i++) {
      const systemNode = systemNodes[i];
      const teamNode = teamNodes[i];

      let order = 1;
      for (const skillId of systemNode.default_skill_ids) {
        await this.nodeSkillBindingRepository.save({
          node_id: teamNode.id,
          skill_id: skillId,
          order: order++,
        });
      }
    }

    // 4. Sync role-skill configs
    const systemConfigs = await this.systemRoleSkillConfigRepository.find();
    for (const systemConfig of systemConfigs) {
      await this.teamRoleSkillConfigRepository.save({
        team_id: teamId,
        role: systemConfig.role,
        default_skill_ids: systemConfig.default_skill_ids,
        source: 'SYSTEM',
      });
    }

    return this.findAllNodes(teamId, userId);
  }

  // Batch: Get all bindings for all nodes at once (avoids N+1 queries)
  async findAllBindings(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Get all nodes for this team
    const nodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      select: ['id'],
    });

    if (nodes.length === 0) {
      return {};
    }

    // Get all bindings for all nodes in one query with relations
    const nodeIds = nodes.map((n) => n.id);
    const allBindings = await this.nodeSkillBindingRepository.find({
      where: { node_id: In(nodeIds) },
      relations: ['skill'],
      order: { order: 'ASC' },
    });

    // Group bindings by node_id
    const bindingsByNode: Record<string, NodeSkillBinding[]> = {};
    for (const node of nodes) {
      bindingsByNode[node.id] = allBindings.filter(
        (b) => b.node_id === node.id,
      );
    }

    return bindingsByNode;
  }

  // Node-Skill Binding Management
  async findBindings(teamId: string, nodeId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    return this.nodeSkillBindingRepository.find({
      where: { node_id: nodeId },
      relations: ['skill'],
      order: { order: 'ASC' },
    });
  }

  async createBinding(
    teamId: string,
    nodeId: string,
    userId: string,
    dto: CreateNodeSkillBindingDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const node = await this.ltcNodeRepository.findOne({
      where: { id: nodeId, team_id: teamId },
    });

    if (!node) {
      throw new NotFoundException('LTC node not found');
    }

    const skill = await this.skillRepository.findOne({
      where: { id: dto.skill_id },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const maxOrder = await this.nodeSkillBindingRepository
      .createQueryBuilder('binding')
      .where('binding.node_id = :nodeId', { nodeId })
      .select('MAX(binding.order)', 'max')
      .getRawOne();

    const binding = this.nodeSkillBindingRepository.create({
      node_id: nodeId,
      skill_id: dto.skill_id,
      order: dto.order ?? (maxOrder?.max ? parseInt(maxOrder.max) + 1 : 0),
    });

    return this.nodeSkillBindingRepository.save(binding);
  }

  async deleteBinding(
    teamId: string,
    nodeId: string,
    bindingId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const binding = await this.nodeSkillBindingRepository.findOne({
      where: { id: bindingId, node_id: nodeId },
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    await this.nodeSkillBindingRepository.delete(bindingId);
    return { message: 'Binding deleted successfully' };
  }

  // Customer Profile Management
  async findCustomerProfile(
    teamId: string,
    customerId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let profile = await this.customerProfileRepository.findOne({
      where: { customer_id: customerId },
    });

    if (!profile) {
      profile = this.customerProfileRepository.create({
        customer_id: customerId,
      });
      await this.customerProfileRepository.save(profile);
    }

    return profile;
  }

  async updateCustomerProfile(
    teamId: string,
    customerId: string,
    userId: string,
    dto: UpdateCustomerProfileDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let profile = await this.customerProfileRepository.findOne({
      where: { customer_id: customerId },
    });

    if (!profile) {
      profile = this.customerProfileRepository.create({
        customer_id: customerId,
        ...dto,
      });
    } else {
      Object.assign(profile, dto);
    }

    return this.customerProfileRepository.save(profile);
  }

  async autoFillCustomerProfile(
    teamId: string,
    customerId: string,
    userId: string,
    dto: AutoFillCustomerProfileDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if customer has a name
    if (!customer.name || customer.name.trim() === '') {
      throw new Error('Customer name is required for auto-fill');
    }

    const customerName = customer.name.trim();
    const searchGoal = dto.searchGoal;

    // Build search queries based on goal
    const searchQueries: string[] = [];
    const filledFields: string[] = [];

    if (searchGoal === 'background' || searchGoal === 'all') {
      // 合并：公司简介、规模、上下游 → 综合查询
      searchQueries.push(
        `${customerName} 企业简介 公司规模 主营业务 上下游关系`
      );
      filledFields.push('background_info');
    }

    if (searchGoal === 'decision_chain' || searchGoal === 'all') {
      // 合并：CEO、CIO、数科公司 → 综合查询
      searchQueries.push(
        `${customerName} CEO CIO 数科公司 管理层 组织架构`
      );
      filledFields.push('decision_chain');
    }

    if (searchGoal === 'cooperation_history' || searchGoal === 'all') {
      // 合并：WPS合作、金山办公案例 → 综合查询
      searchQueries.push(
        `${customerName} WPS 金山办公 合作 案例 中标`
      );
      filledFields.push('history_notes');
    }

    this.logger.log(`🔍 Auto-filling customer profile for "${customerName}" with goal: ${searchGoal}`);

    // Get search engine from system config (default to search_std)
    const searchEngine = (await this.getSystemConfig('web_search_engine')) || 'search_std';
    this.logger.log(`⚙️ Using search engine: ${searchEngine}`);

    // Execute web searches (并行执行3个综合查询)
    const searchResults = await this.aiService.webSearchMultiple(searchQueries, {
      maxConcurrency: 3,  // 控制3个并发（对应3个综合查询）
      count: 10,          // 增加到10条结果（原5条），提高信息丰富度
      contentSize: 'medium',
      searchEngine: searchEngine as any,
    });

    this.logger.log(`📊 Found ${searchResults.length} search result groups`);

    // Build AI prompt to generate structured profile
    const searchContext = searchResults
      .map(({ query, results }) => {
        return `## 搜索关键词: ${query}\n${results.map(r => `- ${r.title}\n  ${r.content}`).join('\n')}`;
      })
      .join('\n\n');

    const systemPrompt = `你是一个专业的企业信息分析助手。
根据综合搜索结果，提取并生成客户背景��料。

**任务**：从搜索结果中提取以下维度的信息：
1. background_info - 公司规模、行业地位、主营业务、上下游关系
2. decision_chain - CEO、CIO、数科负责人等关键决策人信息
3. history_notes - 与WPS/金山办公的合作项目、中标信息、合作状态

**重要**：
- 搜索词可能是综合的，需要从多条结果中分别提取各维度信息
- 某个字段没有找到信息时，返回null
- 使用Markdown格式，内容简洁专业

输出格式必须是JSON，包含以下字段（根据搜索目标决定哪些字段）：
- background_info: 客户背景（公司规模、行业地位、主要业务、上下游关系）
- decision_chain: 决策链（关键决策人姓名、职位、联系方式如有）
- history_notes: 历史合作（合作项目、合作时间、合作状态）`;

    const userPrompt = `客户名称：${customerName}

搜索结果：
${searchContext}

请分析上述搜索结果，生成客户背景资料JSON。只输出JSON，不要有其他内容。`;

    try {
      const aiResponse = await this.aiService.create({
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
        temperature: 0.3,
        maxTokens: 3000,
      });

      this.logger.log(`🤖 AI response received for auto-fill`);

      // Parse JSON response
      let profileData: any = {};
      try {
        // Try to extract JSON from response (in case there's extra text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          profileData = JSON.parse(jsonMatch[0]);
        } else {
          profileData = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response as JSON, using raw response');
        // If parsing fails, use the raw response for background_info
        if (searchGoal === 'background' || searchGoal === 'all') {
          profileData.background_info = aiResponse;
        } else if (searchGoal === 'decision_chain') {
          profileData.decision_chain = aiResponse;
        } else if (searchGoal === 'cooperation_history') {
          profileData.history_notes = aiResponse;
        }
      }

      // Build update data with only requested fields
      const updateData: Partial<UpdateCustomerProfileDto> = {};
      const actualFilledFields: string[] = [];

      if ((searchGoal === 'background' || searchGoal === 'all') && profileData.background_info) {
        updateData.background_info = profileData.background_info;
        actualFilledFields.push('background_info');
      }

      if ((searchGoal === 'decision_chain' || searchGoal === 'all') && profileData.decision_chain) {
        updateData.decision_chain = profileData.decision_chain;
        actualFilledFields.push('decision_chain');
      }

      if ((searchGoal === 'cooperation_history' || searchGoal === 'all') && profileData.history_notes) {
        updateData.history_notes = profileData.history_notes;
        actualFilledFields.push('history_notes');
      }

      // Update customer profile
      let profile = await this.customerProfileRepository.findOne({
        where: { customer_id: customerId },
      });

      if (!profile) {
        profile = this.customerProfileRepository.create({
          customer_id: customerId,
          ...updateData,
        });
      } else {
        Object.assign(profile, updateData);
      }

      const savedProfile = await this.customerProfileRepository.save(profile);

      this.logger.log(`✅ Auto-fill completed for "${customerName}". Filled fields: ${actualFilledFields.join(', ')}`);

      return {
        success: true,
        filledFields: actualFilledFields,
        searchResults: searchResults.map(r => ({
          query: r.query,
          resultCount: r.results.length,
        })),
        profile: savedProfile,
        message: actualFilledFields.length > 0
          ? '自动填充成功'
          : '未找到相关信息，请手动填写',
      };
    } catch (error) {
      this.logger.error(`❌ Auto-fill failed for "${customerName}":`, error);
      throw error;
    }
  }

  // Team Member Preference Management
  async findTeamMemberPreference(
    teamId: string,
    memberId: string,
    userId: string,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    let preference = await this.teamMemberPreferenceRepository.findOne({
      where: { team_member_id: memberId },
    });

    if (!preference) {
      preference = this.teamMemberPreferenceRepository.create({
        team_member_id: memberId,
      });
      await this.teamMemberPreferenceRepository.save(preference);
    }

    return preference;
  }

  async updateTeamMemberPreference(
    teamId: string,
    memberId: string,
    userId: string,
    dto: UpdateTeamMemberPreferenceDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    let preference = await this.teamMemberPreferenceRepository.findOne({
      where: { team_member_id: memberId },
    });

    if (!preference) {
      preference = this.teamMemberPreferenceRepository.create({
        team_member_id: memberId,
        ...dto,
      });
    } else {
      Object.assign(preference, dto);
    }

    return this.teamMemberPreferenceRepository.save(preference);
  }

  // Home Page Aggregate Data
  async getHomeData(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    // Get current team member
    const teamMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    // Get customers
    const customers = await this.customerRepository.find({
      where: { team_id: teamId },
      order: { updated_at: 'DESC' },
    });

    // Get LTC nodes with bindings
    const ltcNodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      order: { order: 'ASC' },
      relations: ['skill_bindings', 'skill_bindings.skill'],
    });

    // Get team member preference
    let preference: TeamMemberPreference | null = null;
    if (teamMember) {
      preference = await this.teamMemberPreferenceRepository.findOne({
        where: { team_member_id: teamMember.id },
      });
    }

    // Get favorite skills if preference exists
    let favoriteSkills: Skill[] = [];
    if (preference?.favorite_skill_ids?.length) {
      favoriteSkills = await this.skillRepository.find({
        where: { id: In(preference.favorite_skill_ids) },
      });
    }

    return {
      customers,
      ltc_nodes: ltcNodes,
      preference,
      favorite_skills: favoriteSkills,
    };
  }
}
