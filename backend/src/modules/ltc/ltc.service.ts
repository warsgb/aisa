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

  /**
   * 识别客户类型
   * 结合客户名称和行业字段进行识别
   * @returns 'education' | 'medical' | 'government' | 'enterprise'
   */
  private identifyCustomerType(
    customerName: string,
    industry?: string
  ): 'education' | 'medical' | 'government' | 'enterprise' {
    const name = customerName.toLowerCase();

    // 🔍 优先级1: 行业字段判断（如果明确填写了行业）
    if (industry) {
      const industryLower = industry.toLowerCase();

      // 教育行业关键词
      if (/教育|学校|高校|大学|学院|培训|k12|学前教育/.test(industryLower)) {
        return 'education';
      }

      // 医疗行业关键词
      if (/医疗|医院|诊所|卫生|保健|健康|医药|生物/.test(industryLower)) {
        return 'medical';
      }

      // 政府行业关键词
      if (/政府|公共事业|行政|机关|非营利|ngo|事业单位/.test(industryLower)) {
        return 'government';
      }
    }

    // 🔍 优先级2: 客户名称关键词判断

    // 教育类（优先级最高，因为教育局可能同时匹配政府关键词）
    if (/学校|中学|小学|大学|学院|幼儿园/.test(name)) {
      return 'education';
    }
    if (/教育局/.test(name)) {
      return 'education';
    }

    // 医疗类
    if (/医院|卫生院|诊所|卫生室/.test(name)) {
      return 'medical';
    }

    // 政府类（排除教育局）
    if (/政府|局|委|办|处|公安|税务|工商|民政/.test(name)) {
      return 'government';
    }

    // 默认企业类
    return 'enterprise';
  }

  /**
   * 根据客户类型获取自然语言搜索问题
   * 优化策略：使用自然语言问题而非关键词，AI更容易理解
   */
  private getSearchQueriesByType(customerName: string, customerType: 'education' | 'medical' | 'government' | 'enterprise') {
    const queries = {
      education: {
        background: `${customerName}的办学规模、学生人数、师资力量、办学特色等基本情况是什么？请用数字说话，包括具体的学生人数、教职工数量、校区分布等量化数据。另外，${customerName}在教育信息化、数字化���型方面有哪些战略规划和建设重点？`,
        decision: `${customerName}的校长、教务主任、信息化主任分别是哪些人？请重点搜索并总结他们关于教育信息化、数字化转型、智慧校园建设等方面的讲话、观点或相关政策。`,
        cooperation: `${customerName}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、中标记录或签约情况？包括战略合作、联合研发、采购等形式。`,
      },
      medical: {
        background: `${customerName}的医院等级（三甲/二甲/社区医院）、床位数、年门诊量、特色科室等基本情况是什么？请提供具体的数字数据。另外，${customerName}在医疗信息化、智慧医院建设、数字化转型方面有哪些战略规划和重点项目？`,
        decision: `${customerName}的院长、信息科主任、设备科主任、采购负责人分别是哪些人？请重点搜索并总结他们关于医疗信息化、数字化转型、智慧医院建设等方面的观点或相关政策。`,
        cooperation: `${customerName}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、中标记录或签约情况？`,
      },
      government: {
        background: `${customerName}的部门职能、管辖范围、下属单位数量、服务对象等基本情况是什么？另外，${customerName}在数字政府建设、政务信息化、数字化转型方面有哪些战略规划或重点工程？`,
        decision: `${customerName}的局长、处长、信息化负责人、采购负责人分别是哪些人？请重点搜索并总结他们关于数字政府建设、政务信息化、数字化转型等方面的观点或相关政策。`,
        cooperation: `${customerName}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、框架协议或采购记录？`,
      },
      enterprise: {
        background: `${customerName}的员工规模、年营收规模、主营业务产品、行业地位、上下游合作伙伴等基本情况是什么？请提供具体数字。另外，${customerName}在企业数字化转型、智能制造/产业数字化方面有哪些战略规划、重点工程或建设方向？`,
        decision: `${customerName}的CEO/总经理、采购总监、CIO/CTO/信息化负责人分别是谁？请重点搜索并总结他们关于企业数字化转型、智能制造、产业数字化等方面的观点或相关战略。`,
        cooperation: `${customerName}和金山办公WPS365在WPS 365、文档中心、文档中台、AI、云文档等方面有哪些合作项目、战略协议或采购记录？包括战略合作、联合研发等形式。`,
      },
    };

    return queries[customerType];
  }

  /**
   * 根据客户类型获取Prompt字段说明
   */
  private getPromptInstructionsByType(customerType: 'education' | 'medical' | 'government' | 'enterprise') {
    const instructions = {
      education: {
        background: `**背景资料** (学校/教育局)：
- 学校类型（大学/高中/初中/小学/幼儿园/教育局）
- 学生人数、班级数量
- 办学层次、师资力量
- 服务范围（教育局）`,
        decision: `**决策链**：
- 高管层：校长/教育局局长
- 管理层：教务主任/信息化主任
- 采购层：采购负责人`,
      },
      medical: {
        background: `**背景资料** (医院)：
- 医院等级（三甲/二甲/社区医院）
- 床位数、门诊量
- 特色科室
- 服务范围`,
        decision: `**决策链**：
- 高管层：院长
- 科室层：信息科主任、设备科主任
- 采购层：采购负责人`,
      },
      government: {
        background: `**背景资料** (政府部门)：
- 部门职能介绍
- 下属单位数量
- 服务范围
- 管辖区域`,
        decision: `**决策链**：
- 高管层：局长/处长
- 信息化层：信息化负责人
- 采购层：采购负责人`,
      },
      enterprise: {
        background: `**背景资料** (企业)：
- 员工人数、公司规模
- 年营收、注册资本
- 主营业务、产品
- 行业地位、上下游关系`,
        decision: `**决策链**：
- 高管层：CEO/总经理
- 采购层：采购总监/经理
- 信息化层：CTO/信息化负责人`,
      },
    };

    return instructions[customerType];
  }

  /**
   * 根据字段名称获取针对性的AI指令
   * 优化策略：单字段instruction更聚焦，JSON提取更准确
   */
  private getFieldSpecificInstruction(fieldName: 'background' | 'decision' | 'cooperation', customerName: string, customerType: string): string {
    const baseInstructions = {
      background: `你是一个专业的企业信息分析助手。请根据搜索结果，提取客户背景资料。

**客户名称**：${customerName}
**客户类型**：${customerType}

**要求**：
- 优先提取**量化数据**（人数、规模、等级、营收等具体数字）
- 重点提取**数字化转型相关内容**：战略规划、建设重点、重点项目等
- 使用Markdown格式组织内容
- 内容简洁专业，突出关键信息

**输出格式**：必须是纯JSON，不要有任何额外的文字说明。
{
  "background_info": "客户背景（Markdown格式，包含数字化转型战略和规划）"
}`,
      decision: `你是一个专业的企业信息分析助手。请根据搜索结果，提取关键决策人信息。

**客户名称**：${customerName}
**客户类型**：${customerType}

**要求**：
- 提取关键决策人的姓名和职位
- **重点搜索并总结**他们对数字化转型、信息化建设等方面的观点、讲话或相关政策
- 按层级组织：高管层、管理层、采购层

**输出格式**：必须是纯JSON，不要有任何额外的文字说明。
{
  "decision_chain": {"高管层": "姓名(职位) - 关于数字化转型的观点", "管理层": "姓名(职位) - 关于数字化转型的观点", "采购层": "姓名(职位)"}
}

**注意**：
1. 如果某层级没有找到人物，该层返回null
2. 如果搜索结果中有决策人关于数字化转型的观点、讲话或政策，请务必总结在职位后面
3. 如果没有找到数字化转型相关观点，只返回姓名和职位`,
      cooperation: `你是一个专业的企业信息分析助手。请根据搜索结果，提取与金山办公WPS365的合作信息。

**客户名称**：${customerName}

**要求**：
- 合作产品：WPS 365、文档中心、文档中台、AI、云文档、其他（战略合作、联合研发等）
- 合作形式：中标/采购/项目合作/框架协议/战略协议
- 合作时间：具体年份
- 合作状态：进行中/已完成/未知

**输出格式**：
1. **如果找到了合作信息**，返回纯JSON：
{
  "history_notes": "历史合作信息（Markdown格式）"
}

2. **如果没有找到任何合作信息**，直接返回空JSON对象：
{}

**重要**：只有在确认搜索结果中存在相关合作项目、中标记录、签约情况时，才输出history_notes字段。否则返回空对象{}。`,
    };

    return baseInstructions[fieldName];
  }
  /**
   * 映射查询到对应的字段名称
   */
  private mapQueryToField(query: string, queries: { background: string; decision: string; cooperation: string }): 'background' | 'decision' | 'cooperation' {
    if (query === queries.background) return 'background';
    if (query === queries.decision) return 'decision';
    if (query === queries.cooperation) return 'cooperation';
    // 默认返回background
    return 'background';
  }

  /**
   * 合并多个查询结果
   */
  private mergeFieldResults(results: Array<{ field: string; content: string }>): any {
    const profileData: any = {};

    for (const result of results) {
      try {
        // Try to extract JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        let fieldData: any;
        if (jsonMatch) {
          fieldData = JSON.parse(jsonMatch[0]);
        } else {
          fieldData = JSON.parse(result.content);
        }

        // Merge based on field type
        if (result.field === 'background') {
          profileData.background_info = fieldData.background_info;
        } else if (result.field === 'decision') {
          profileData.decision_chain = fieldData.decision_chain;
        } else if (result.field === 'cooperation') {
          // Only add history_notes if it exists and is not null
          // AI will return empty object {} if no cooperation found
          if (fieldData.history_notes && fieldData.history_notes !== null) {
            profileData.history_notes = fieldData.history_notes;
          } else {
            this.logger.log('No cooperation history found, skipping history_notes field');
          }
        }
      } catch (parseError) {
        this.logger.warn(`Failed to parse ${result.field} result as JSON`);
        // If parsing fails, store raw content (except for cooperation if it looks like "not found")
        if (result.field === 'background') {
          profileData.background_info = result.content;
        } else if (result.field === 'decision') {
          profileData.decision_chain = result.content;
        } else if (result.field === 'cooperation') {
          // Only store if it doesn't look like a "not found" response
          if (result.content && 
              !result.content.includes('未找到') && 
              !result.content.includes('没有') && 
              !result.content.includes('not found') &&
              result.content.length > 20) {
            profileData.history_notes = result.content;
          } else {
            this.logger.log('Cooperation response appears to be "not found", skipping');
          }
        }
      }
    }

    return profileData;
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

    // 🔍 识别客户类型（结合名称和行业）
    const customerType = this.identifyCustomerType(customerName, customer.industry);
    this.logger.log(`🏢 Customer type identified: ${customerType} for "${customerName}" (industry: ${customer.industry || 'N/A'})`);

    // 🎯 根据客户类型获取自然语言搜索问题
    const queries = this.getSearchQueriesByType(customerName, customerType);

    // Build search queries based on goal and customer type
    const searchQueries: string[] = [];
    const filledFields: string[] = [];

    if (searchGoal === 'background' || searchGoal === 'all') {
      searchQueries.push(queries.background);
      filledFields.push('background_info');
    }

    if (searchGoal === 'decision_chain' || searchGoal === 'all') {
      searchQueries.push(queries.decision);
      filledFields.push('decision_chain');
    }

    if (searchGoal === 'cooperation_history' || searchGoal === 'all') {
      searchQueries.push(queries.cooperation);
      filledFields.push('history_notes');
    }

    this.logger.log(`🔍 Auto-filling customer profile for "${customerName}" (${customerType}) with goal: ${searchGoal}`);
    this.logger.log(`🔍 Will execute ${searchQueries.length} separate queries`);

    // 优化策略：分别查询每个字段，而非合并查询
    // 这样AI可以更聚焦地回答每个问题
    const results: Array<{ field: string; content: string; query: string; references: any[] }> = [];

    for (const query of searchQueries) {
      const fieldName = this.mapQueryToField(query, queries);
      const fieldTypeName = fieldName === 'background' ? '背景资料' : fieldName === 'decision' ? '决策链' : '历史合作';

      this.logger.log(`🔍 Executing query for ${fieldTypeName}: "${query}"`);

      // 获取针对该字段的AI指令
      const fieldInstruction = this.getFieldSpecificInstruction(fieldName, customerName, customerType);

      const searchResult = await this.aiService.baiduWebSearch(query, {
        maxCompletionTokens: 4096,  // 单查询降低token
        topK: 20,
        enableDeepSearch: false,     // 关闭深度搜索
        enableCornerMarkers: false,  // 去掉参考资料角标
        instruction: fieldInstruction,
      });

      this.logger.log(`📊 Query completed for ${fieldTypeName}: ${searchResult.content.length} chars, ${searchResult.references?.length || 0} references`);

      results.push({
        field: fieldName,
        content: searchResult.content,
        query: query,
        references: searchResult.references || [],
      });
    }

    try {
      // 合并所有查询结果
      const profileData = this.mergeFieldResults(results);

      // Debug: log the parsed profile data
      this.logger.log(`🔍 Profile data: ${JSON.stringify(profileData)}`);

      // Build update data with only requested fields
      const updateData: Partial<UpdateCustomerProfileDto> = {};
      const actualFilledFields: string[] = [];

      // Helper function to check if content has actual text (not null, undefined, or empty)
      const hasContent = (value: any): boolean => {
        // Handle null/undefined/empty
        if (!value || value === null || value === undefined || value === '' || value === 'null') {
          return false;
        }
        // If it's an object (including arrays)
        if (typeof value === 'object') {
          const keys = Object.keys(value);
          if (keys.length === 0) return false;
          // Check if any value is non-null and non-empty
          return keys.some(k => value[k] && value[k] !== null && value[k] !== '' && value[k] !== 'null');
        }
        // For strings, check if not empty after trim
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return true;
      };

      if ((searchGoal === 'background' || searchGoal === 'all') && hasContent(profileData.background_info)) {
        updateData.background_info = profileData.background_info;
        actualFilledFields.push('background_info');
      }

      if ((searchGoal === 'decision_chain' || searchGoal === 'all') && hasContent(profileData.decision_chain)) {
        updateData.decision_chain = profileData.decision_chain;
        actualFilledFields.push('decision_chain');
      }

      if ((searchGoal === 'cooperation_history' || searchGoal === 'all') && hasContent(profileData.history_notes)) {
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
        searchResults: results.map(r => ({
          query: r.query,
          resultCount: r.references.length,
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
