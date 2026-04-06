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
import { KuaichaService } from '../kuaicha/kuaicha.service';

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

/**
 * 搜索查询配置类型定义
 */
interface SearchQueries {
  background: string;
  decision_executives?: string;
  decision_management?: string;
  decision_it?: string;
  decision_procurement?: string;
  cooperation: string | string[];
}

/**
 * 搜索结果类型定义
 */
interface SearchResult {
  field: string;
  content: string;
  query: string;
  references: any[];
}

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
    private kuaichaService: KuaichaService,
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
   *
   * 优化策略：
   * 1. 决策链：针对不同层级分别搜索，提高准确性
   * 2. 历史合作：使用多个具体关键词组合，避免遗漏
   */
  private getSearchQueriesByType(customerName: string, customerType: 'education' | 'medical' | 'government' | 'enterprise'): SearchQueries {
    const queries: Record<string, SearchQueries> = {
      education: {
        background: `${customerName}的办学规模、学生人数、师资力量、办学特色等基本情况是什么？请用数字说话，包括具体的学生人数、教职工数量、校区分布等量化数据。另外，${customerName}在教育信息化、数字化转型升级方面有哪些战略规划和建设重点？`,
        // 决策链多轮搜索：分别针对不同层级
        decision_executives: `${customerName} 校长 教育局局长 教育信息化 智慧校园 数字化转型 讲话 致辞 峰会 采访`,
        decision_management: `${customerName} 教务主任 信息化主任 信息中心主任 智慧校园 数字化校园 信息化建设 技术架构`,
        decision_procurement: `${customerName} 采购负责人 教学设备采购 教育信息化 采购招标`,
        // 历史合作多轮搜索：使用不同关键词组合
        cooperation: [
          `${customerName} WPS365 中标 2022 2023 2024 2025`,
          `${customerName} 金山办公 签约 采购 教育信息化 项目`,
          `${customerName} WPS 办公软件 智慧校园 部署 实施`,
          `${customerName} 金山 教育信息化 战略合作 框架协议`,
        ],
      },
      medical: {
        background: `${customerName}的医院等级（三甲/二甲/社区医院）、床位数、年门诊量、特色科室等基本情况是什么？请提供具体的数字数据。另外，${customerName}在医疗信息化、智慧医院建设、数字化转型方面有哪些战略规划和重点项目？`,
        // 决策链多轮搜索
        decision_executives: `${customerName} 院长 党委书记 智慧医院 医疗信息化 数字化转型 讲话 采访 峰会 致辞`,
        decision_management: `${customerName} 信息科主任 设备科主任 医疗信息化 数据治理 技术架构 智慧医院`,
        decision_procurement: `${customerName} 采购负责人 医疗设备采购 耗材采购 招标 数字化采购`,
        // 历史合作多轮搜索
        cooperation: [
          `${customerName} WPS365 中标 2022 2023 2024 2025`,
          `${customerName} 金山办公 签约 采购 医疗信息化 项目`,
          `${customerName} WPS 办公软件 智慧医院 部署 实施`,
          `${customerName} 金山 医疗信息化 战略合作 框架协议`,
        ],
      },
      government: {
        background: `${customerName}的部门职能、管辖范围、下属单位数量、服务对象等基本情况是什么？另外，${customerName}在数字政府建设、政务信息化、数字化转型方面有哪些战略规划或重点工程？`,
        // 决策链多轮搜索
        decision_executives: `${customerName} 局长 处长 主任 数字政府 政务信息化 数字化转型 讲话 致辞 采访 报告`,
        decision_management: `${customerName} 信息化负责人 信息中心主任 大数据中心 数字政府 技术架构 数据治理`,
        decision_procurement: `${customerName} 采购负责人 政府采购 信息化采购 招标 数字化转型采购`,
        // 历史合作多轮搜索
        cooperation: [
          `${customerName} WPS365 中标 2022 2023 2024 2025`,
          `${customerName} 金山办公 签约 采购 政务信息化 项目`,
          `${customerName} WPS 办公软件 数字政府 部署 实施`,
          `${customerName} 金山 政务信息化 战略合作 框架协议`,
        ],
      },
      enterprise: {
        background: `${customerName}的员工规模、年营收规模、主营业务产品、行业地位、上下游合作伙伴等基本情况是什么？请提供具体数字。另外，${customerName}在企业数字化转型、智能制造/产业数字化方面有哪些战略规划、重点工程或建设方向？`,
        // 决策链多轮搜索：分别针对不同层级
        // 高管层：重点搜索CEO/总经理/董事长的数字化转型观点、讲话、采访、访谈
        decision_executives: `${customerName} CEO 总经理 董事长 数字化转型 智能化 工业互联网 讲话 采访 峰会 致辞`,
        // 信息化层：重点搜索CIO/CTO的数字化建设观点、技术架构、系统集成
        decision_it: `${customerName} CIO CTO 信息化总监 首席信息官 数字化建设 技术架构 数据治理 AI应用`,
        // 采购层：重点搜索采购总监的数字化采购策略、供应链管理
        decision_procurement: `${customerName} 采购总监 供应链 数字化采购 智能供应链 采购策略`,
        // 历史合作多轮搜索：使用不同关键词组合
        cooperation: [
          `${customerName} WPS365 中标 2022 2023 2024 2025`,
          `${customerName} 金山办公 签约 采购 合作 项目`,
          `${customerName} WPS 办公软件 部署 实施`,
          `${customerName} 金山 战略合作 框架协议 企业数字化`,
        ],
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
   *
   * 优化策略：
   * 1. 增强验证要求，禁止编造信息
   * 2. 明确要求提供信息来源
   * 3. 优化决策链Prompt，要求具体的人物姓名和职位
   * 4. 优化历史合作Prompt，要求真实的合作项目、时间、形式
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

**重点要求**：
1. 必须基于搜索结果中真实存在的人物信息
2. 如果搜索结果中没有某个人物的具体信息，该层级返回null
3. 对于数字化转型观点，只提取搜索结果中明确的讲话、访谈、政策或文章引用
4. 不要编造或猜测任何信息
5. 提供姓名和具体职位

**输出格式**：必须是纯JSON，不要有任何额外的文字说明。
{
  "高管层": "姓名(职位) - 观点（仅当搜索结果中有明确引用时）",
  "管理层": "姓名(职位) - 观点（仅当搜索结果中有明确引用时）",
  "信息化层": "姓名(职位) - 观点（仅当搜索结果中有明确引用时）",
  "采购层": "姓名(职位)"
}

**注意**：
1. 如果某层级没有找到人物，该层返回null
2. 如果搜索结果中有决策人关于数字化转型的观点、讲话或政策，请务必总结在职位后面
3. 如果没有找到数字化转型相关观点，只返回姓名和职位
4. 只要有姓名和职位，就应该包含该层级，不要设为null`,
      cooperation: `你是一个专业的企业信息分析助手。请根据搜索结果，提取与金山办公WPS365的合作信息。

**客户名称**：${customerName}

**验证要求**：
1. 只提取搜索结果中明确提到的合作项目、中标记录、签约情况
2. 如果搜索结果完全没有相关信息，返回空对象 {}
3. 合作信息应包含：产品、形式、时间、状态
4. 优先提取官方公告、新闻报道、中标结果等权威信息源
5. 不要编造或猜测任何合作信息

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
   * 扁平化搜索查询配置
   * 将嵌套的查询配置转换为扁平的查询列表
   */
  private flattenSearchQueries(queries: SearchQueries, searchGoal: string): Array<{ query: string; field: string; label: string }> {
    const flatQueries: Array<{ query: string; field: string; label: string }> = [];

    // 背景资料
    if (searchGoal === 'background' || searchGoal === 'all') {
      flatQueries.push({
        query: queries.background,
        field: 'background',
        label: '背景资料',
      });
    }

    // 决策链（多轮搜索）
    if (searchGoal === 'decision_chain' || searchGoal === 'all') {
      if (queries.decision_executives) {
        flatQueries.push({
          query: queries.decision_executives,
          field: 'decision_executives',
          label: '决策链-高管层',
        });
      }
      if (queries.decision_management) {
        flatQueries.push({
          query: queries.decision_management,
          field: 'decision_management',
          label: '决策链-管理层',
        });
      }
      if (queries.decision_it) {
        flatQueries.push({
          query: queries.decision_it,
          field: 'decision_it',
          label: '决策链-信息化层',
        });
      }
      if (queries.decision_procurement) {
        flatQueries.push({
          query: queries.decision_procurement,
          field: 'decision_procurement',
          label: '决策链-采购层',
        });
      }
    }

    // 历史合作（多轮搜索）
    if (searchGoal === 'cooperation_history' || searchGoal === 'all') {
      if (Array.isArray(queries.cooperation)) {
        queries.cooperation.forEach((query, index) => {
          flatQueries.push({
            query,
            field: `cooperation_${index}`,
            label: `历史合作-查询${index + 1}`,
          });
        });
      } else {
        flatQueries.push({
          query: queries.cooperation,
          field: 'cooperation_0',
          label: '历史合作',
        });
      }
    }

    return flatQueries;
  }

  /**
   * 执行多轮搜索并聚合结果
   */
  private async executeMultiRoundSearch(
    flatQueries: Array<{ query: string; field: string; label: string }>,
    customerName: string,
    customerType: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    this.logger.log(`🔍 Executing ${flatQueries.length} search queries in parallel`);

    // 并行执行所有搜索
    const searchPromises = flatQueries.map(async ({ query, field, label }) => {
      this.logger.log(`🔍 Executing ${label}: "${query}"`);

      // 确定字段类型用于生成Prompt
      let fieldType: 'background' | 'decision' | 'cooperation';
      if (field.startsWith('decision_')) {
        fieldType = 'decision';
      } else if (field.startsWith('cooperation_')) {
        fieldType = 'cooperation';
      } else {
        fieldType = 'background';
      }

      // 获取针对该字段的AI指令
      const fieldInstruction = this.getFieldSpecificInstruction(fieldType, customerName, customerType);

      try {
        const searchResult = await this.aiService.baiduWebSearch(query, {
          maxCompletionTokens: 4096,
          topK: 20,
          enableDeepSearch: false,
          enableCornerMarkers: false,
          instruction: fieldInstruction,
        });

        this.logger.log(`📊 ${label} completed: ${searchResult.content.length} chars, ${searchResult.references?.length || 0} references`);

        return {
          field,
          content: searchResult.content,
          query,
          references: searchResult.references || [],
        };
      } catch (error) {
        this.logger.error(`❌ ${label} failed:`, error);
        return {
          field,
          content: '',
          query,
          references: [],
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);
    results.push(...searchResults);

    return results;
  }

  /**
   * 执行快查三段式搜索
   */
  private async executeKuaichaTripleSearch(customerName: string, customerType: string): Promise<{
    backgroundResult: string;
    biddingResult: string;
    decisionChainResult: string;
  }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();
    const currentTimeStr = `${currentYear}年${currentMonth}月${currentDate}日`;

    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    const twoMonthsAgoTs = Math.floor(twoMonthsAgo.getTime() / 1000);
    const nowTs = Math.floor(now.getTime() / 1000);

    // 并行执行3次快查搜索
    const [backgroundResult, biddingResult, decisionChainResult] = await Promise.all([
      // Search1: 基本信息、主营业务、员工规模、营收、产业链、客户
      (async () => {
        try {
          const result = await this.kuaichaService.search(
            `${customerName}企业基本信息：主营业务、员工规模、` +
            `${currentYear}年/${currentYear - 1}年/${currentYear - 2}年的营收和利润、` +
            `产业链位置、主要客户和供应商。营收必须标注具体年份和金额。`
          );
          if (result.success && result.data?.answer) {
            // answer可能是字符串或JSON对象
            const answer = typeof result.data.answer === 'string'
              ? result.data.answer
              : JSON.stringify(result.data.answer, null, 2);
            this.logger.log(`✅ [Kuaicha] Search1-基本信息 completed: ${answer.length} chars`);
            return answer;
          }
          this.logger.warn(`⚠️ [Kuaicha] Search1-基本信息 returned empty answer`);
          return '';
        } catch (e: any) {
          this.logger.error(`❌ [Kuaicha] Search1-基本信息 failed: ${e.message}`);
          return '';
        }
      })(),

      // Search2: 二级公司、数字化招投标、供应商、金额、最近2个月招标
      (async () => {
        try {
          const result = await this.kuaichaService.search(
            `${customerName}的二级公司（对外投资、主要子公司及持股比例）、` +
            `${currentYear - 2}年至${currentYear}年的数字化/IT/办公类招投标和中标信息（项目名称、金额、中标单位）、` +
            `主要供应商及合作金额、最近2个月的新招标信息。要求输出结构化格式。`
          );
          if (result.success && result.data?.answer) {
            // answer可能是字符串或JSON对象
            const answer = typeof result.data.answer === 'string'
              ? result.data.answer
              : JSON.stringify(result.data.answer, null, 2);
            this.logger.log(`✅ [Kuaicha] Search2-招投标 completed: ${answer.length} chars`);
            return answer;
          }
          this.logger.warn(`⚠️ [Kuaicha] Search2-招投标 returned empty answer`);
          return '';
        } catch (e: any) {
          this.logger.error(`❌ [Kuaicha] Search2-招投标 failed: ${e.message}`);
          return '';
        }
      })(),

      // Search3: 数字化新闻/成果/奖项、数字化领导、十五五规划（直接调用资讯查询）
      (async () => {
        try {
          this.logger.log(`📰 [Kuaicha] Search3-决策链: 开始查询数字化资讯...`);

          // 第一步：获取企业的creditcode
          const creditcode = await this.kuaichaService.getCreditCode(customerName);
          if (!creditcode) {
            this.logger.warn(`⚠️ [Kuaicha] Search3: 无法获取企业creditcode`);
            return '';
          }

          this.logger.log(`✅ [Kuaicha] Search3: 获取到creditcode: ${creditcode}`);

          // 第二步：并行查询3个不同维度的资讯
          const [newsResult, leadershipResult, planResult] = await Promise.all([
            // 查询1：数字化/智能化新闻、成果、奖项
            this.kuaichaService.queryNews(
              creditcode,
              `${customerName} 数字化 智能化 转型 新闻 成果 奖项`
            ),
            // 查询2：数字化相关领导的发言
            this.kuaichaService.queryNews(
              creditcode,
              `${customerName} 数字化 智能化 领导 董事长 总经理 发言 讲话`
            ),
            // 查询3：十五五规划数字化要求
            this.kuaichaService.queryNews(
              creditcode,
              `${customerName} 十五五规划 数字化 智能化 目标 要求`
            ),
          ]);

          // 第三步：聚合结果
          const decisionChainParts: string[] = [];

          if (newsResult.success && newsResult.data) {
            this.logger.log(`✅ [Kuaicha] Search3-新闻资讯: 获取到数据`);
            decisionChainParts.push(this.formatNewsToMarkdown('数字化新闻与成果', newsResult.data));
          }

          if (leadershipResult.success && leadershipResult.data) {
            this.logger.log(`✅ [Kuaicha] Search3-领导发言: 获取到数据`);
            decisionChainParts.push(this.formatNewsToMarkdown('数字化领导发言', leadershipResult.data));
          }

          if (planResult.success && planResult.data) {
            this.logger.log(`✅ [Kuaicha] Search3-十五五规划: 获取到数据`);
            decisionChainParts.push(this.formatNewsToMarkdown('十五五规划数字化要求', planResult.data));
          }

          const combinedResult = decisionChainParts.join('\n\n');
          this.logger.log(`✅ [Kuaicha] Search3-决策链 completed: ${combinedResult.length} chars`);

          return combinedResult || '';
        } catch (e: any) {
          this.logger.error(`❌ [Kuaicha] Search3-决策链 failed: ${e.message}`);
          return '';
        }
      })(),
    ]);

    return { backgroundResult, biddingResult, decisionChainResult };
  }

  /**
   * 格式化快查三段结果为结构化Markdown
   */
  /**
   * 清理招投标结果中的重复章节（Search2可能包含"一、基本信息"等与Search1重复的内容）
   */
  private stripDuplicateSections(content: string): string {
    let cleaned = content;

    // 移除 "## 一、基本信息\n\n..." 及其后续章节直到 "## X、" 格式的新章节或文件末尾
    // 匹配从"一、基本信息"到下一个罗马数字章节（## 二、 ## 三、 等）的范围
    cleaned = cleaned.replace(
      /##\s*[一二三四五六七八九十]+、[^#\n]+[\s\S]*?(?=##\s*[一二三四五六七八九十]+、|$)/g,
      ''
    );

    // 也移除"### 基本信息\n"格式的章节
    cleaned = cleaned.replace(
      /###\s*基本信息[\s\S]*?(?=###|##|$)/g,
      ''
    );

    // 移除只包含企业名称的空章节（## 企业名称\n\n\n\n---\n这种）
    cleaned = cleaned.replace(/##\s*[^\n]+企业[^\n]*\n+(?=\n+|##)/g, '');

    // 清理多余空行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }

  private synthesizeKuaichaResults(
    backgroundResult: string,
    biddingResult: string,
    decisionChainResult: string,
    customerName: string,
  ): { background_info: string; decision_chain: string } {
    // 背景资料：基本信息 + 招投标/供应商
    const bgParts: string[] = [];

    if (backgroundResult) {
      const normalized = this.formatKuaichaJsonToMarkdown(backgroundResult);
      bgParts.push(`## 企业基本信息\n\n${normalized}`);
    }

    if (biddingResult) {
      // 清理Search2结果中的重复章节（基本信息、二级公司等）
      const cleanedBidding = this.stripDuplicateSections(biddingResult);
      const normalized = this.formatKuaichaJsonToMarkdown(cleanedBidding);
      if (normalized && normalized.trim().length > 10) {
        bgParts.push(`## 招投标与供应商\n\n${normalized}`);
      }
    }

    if (bgParts.length === 0) {
      bgParts.push(`（未获取到有效数据）`);
    }

    const background_info = `# ${customerName}\n\n${bgParts.join('\n\n')}\n\n---\n*数据来源：同花顺旗下快查企业数据引擎*`;

    // 决策链：直接使用Search3的结果（已经是格式化后的Markdown）
    let decision_chain = '';
    if (decisionChainResult) {
      this.logger.log(`📝 [Synthesize] decisionChainResult长度: ${decisionChainResult.length} chars`);
      this.logger.log(`📝 [Synthesize] decisionChainResult预览: ${decisionChainResult.substring(0, 200)}...`);
      decision_chain = decisionChainResult; // 直接使用，不需要二次格式化
    }

    this.logger.log(`✅ [Synthesize] 直接格式化完成: background_info=${background_info.length} chars, decision_chain=${decision_chain.length} chars`);
    return { background_info, decision_chain };
  }

  /**
   * 将快查返回的JSON数据格式化为易读的Markdown
   */
  /**
   * 将快查资讯查询结果格式化为Markdown
   */
  private formatNewsToMarkdown(title: string, data: any): string {
    const lines: string[] = [];
    lines.push(`### ${title}`);
    lines.push('');

    // data可能是对象、数组或嵌套数组
    let newsList: any[] = [];

    if (Array.isArray(data)) {
      // 处理嵌套数组 [[{...}, {...}], [{...}]]
      if (data.length > 0) {
        const first = data[0];
        if (Array.isArray(first)) {
          // data是嵌套数组 [[{...}], ...]，展平所有子数组
          newsList = data.flat();
        } else {
          // data是普通数组 [{...}, ...]
          newsList = data;
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      // 对象格式：可能包含list字段
      if (data.list && Array.isArray(data.list)) {
        newsList = data.list;
      }
    }

    if (newsList.length > 0) {
      this.logger.log(`📰 [formatNewsToMarkdown] ${title}: 解析到${newsList.length}条数据，第一条: ${JSON.stringify(newsList[0]).substring(0, 200)}`);
      // 数组格式：资讯列表
      for (const item of newsList.slice(0, 10)) { // 最多显示10条
        const title = item.title || item.news_title || item.abstractContent?.substring(0, 30) || '无标题';
        const date = item.pub_date || item.date || '';
        const url = item.url || item.link || '';
        const content = item.content || item.summary || item.description || item.abstractContent || '';

        lines.push(`**${title}**`);
        if (date) {
          lines.push(`> 时间：${date}`);
        }
        if (content) {
          const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
          lines.push(`> ${preview}`);
        }
        if (url) {
          lines.push(`> 来源：[${url}](${url})`);
        }
        lines.push('');
      }
    } else if (typeof data === 'object' && data !== null) {
      // 直接输出对象内容
      lines.push(`数据：${JSON.stringify(data, null, 2)}`);
    } else {
      lines.push('暂无数据');
    }

    return lines.join('\n');
  }

  private formatKuaichaJsonToMarkdown(content: string): string {
    let formatted = content;
    const trimmed = content.trim();

    // 如果已经是结构化的Markdown（包含##标题），直接返回
    if (trimmed.startsWith('#') || trimmed.includes('## ')) {
      return this.cleanMarkdownContent(trimmed);
    }

    // 如果是JSON字符串，解析并优先展示关键字段
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed);
        formatted = this.formatEnterpriseDataToMarkdown(data);
      } catch {
        // 解析失败，返回原文
        formatted = trimmed;
      }
    }

    // 从招标信息中提取供应商
    const suppliers = this.extractSuppliersFromBidding(formatted);
    if (suppliers.length > 0) {
      // 检查原文是否已有供应商章节
      if (!formatted.includes('主要供应商') && !formatted.includes('供应商')) {
        // 在现有内容末尾追加供应商信息
        const supplierSection = `\n\n### 主要供应商（从招标信息提取）\n${suppliers.map(s => `- **${s.name}**${s.amount ? `：${s.amount}` : ''}`).join('\n')}`;
        formatted = formatted + supplierSection;
      }
    }

    return this.cleanMarkdownContent(formatted);
  }

  /**
   * 清理Markdown内容中的重复和格式问题
   */
  private cleanMarkdownContent(content: string): string {
    let cleaned = content;

    // 移除重复的企业名称（连续重复）
    cleaned = cleaned.replace(/^(#+\s*)?([^\n]+)\n\1\2\n/gm, '$1$2\n');

    // 移除多余的空行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 移除标题前可能重复的企业名称
    cleaned = cleaned.replace(/^([^\n#]+)\n(#+\s*)?\1$/gm, '$2$1');

    return cleaned.trim();
  }

  /**
   * 将企业数据对象格式化为结构化的Markdown
   * 优先展示关键信息：员工数、营收、主营业务等
   */
  private formatEnterpriseDataToMarkdown(data: any): string {
    if (!data || typeof data !== 'object') {
      return String(data || '');
    }

    // 如果是数组，取第一个元素
    if (Array.isArray(data)) {
      if (data.length === 0) return '（无数据）';
      return this.formatEnterpriseDataToMarkdown(data[0]);
    }

    const lines: string[] = [];

    // 优先级字段映射
    const fieldPriority: Record<string, { label: string; priority: number }> = {
      // 基本信息
      'corp_name': { label: '企业名称', priority: 1 },
      'company_name': { label: '企业名称', priority: 1 },
      'legal_person': { label: '法定代表人', priority: 2 },
      'reg_capital': { label: '注册资本', priority: 3 },
      'established_date': { label: '成立日期', priority: 4 },
      'operating_status': { label: '经营状态', priority: 5 },
      'industry': { label: '行业', priority: 6 },
      'national_industry': { label: '国标行业', priority: 6 },
      'industry_classify_name': { label: '行业分类', priority: 6 },

      // 规模指标（最高优先级）
      'staff_num': { label: '员工人数', priority: 10 },
      'social_staff_num': { label: '参保人数', priority: 10 },
      'employee_count': { label: '员工人数', priority: 10 },
      'insured_num': { label: '参保人数', priority: 10 },

      // 财务数据
      'total_revenue': { label: '总营收', priority: 20 },
      'revenue': { label: '营业收入', priority: 20 },
      'main_business': { label: '主营业务', priority: 21 },
      'business_scope': { label: '经营范围', priority: 22 },

      // 其他
      'corp_type': { label: '企业类型', priority: 30 },
      'scale_level': { label: '企业规模', priority: 31 },
      'actual_capital': { label: '实收资本', priority: 32 },
    };

    // 按优先级收集字段
    const fields: Array<{ label: string; value: string; priority: number }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '' || value === 'null') {
        continue;
      }

      const fieldConfig = fieldPriority[key];
      if (fieldConfig) {
        fields.push({
          label: fieldConfig.label,
          value: String(value),
          priority: fieldConfig.priority,
        });
      } else if (typeof value === 'string' || typeof value === 'number') {
        // 未配置的字段，显示在最后
        fields.push({
          label: key,
          value: String(value),
          priority: 100,
        });
      }
    }

    // 按优先级排序
    fields.sort((a, b) => a.priority - b.priority);

    // 格式化输出
    let currentSection = '';
    const sections: string[] = [];

    for (const field of fields) {
      // 员工人数和营收 - 特殊高亮
      if (field.priority === 10) {
        // 员工人数
        if (!currentSection) currentSection = '### 规模指标\n';
        currentSection += `- **${field.label}**：${field.value}\n`;
      } else if (field.priority === 20) {
        // 营收
        if (!currentSection || currentSection.includes('规模指标')) {
          if (currentSection) sections.push(currentSection);
          currentSection = '### 财务数据\n';
        }
        currentSection += `- **${field.label}**：${field.value}\n`;
      } else if (field.priority < 10) {
        // 基本信息
        if (currentSection && !currentSection.includes('基本信息')) {
          sections.push(currentSection);
          currentSection = '';
        }
        if (!currentSection) currentSection = '### 基本信息\n';
        currentSection += `- **${field.label}**：${field.value}\n`;
      } else {
        // 其他信息
        if (currentSection) sections.push(currentSection);
        currentSection = `### ${field.label}\n${field.value}\n`;
        sections.push(currentSection);
        currentSection = '';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.join('\n') || '（无有效数据）';
  }

  /**
   * 从招标信息中提取供应商
   */
  private extractSuppliersFromBidding(content: string): Array<{ name: string; amount?: string }> {
    const suppliers: Array<{ name: string; amount?: string }> = [];

    // 匹配"中标单位：xxx"或"中标人：xxx"
    const winnerPattern = /中标[单位人][:：]\s*([^\n，,。]+)/g;
    let match;
    const seen = new Set<string>();

    while ((match = winnerPattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (name && !seen.has(name) && name.length < 50) {
        seen.add(name);
        suppliers.push({ name });
      }
    }

    // 匹配"xxx公司 中标 xxx 项目"模式
    const companyPattern = /([^\s，,。]+?公司|有限公司|集团有限公司)[^\s]*中标[^\s]*项目[^\n，,。]*/g;
    while ((match = companyPattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (name && !seen.has(name) && name.length < 50) {
        seen.add(name);
        suppliers.push({ name });
      }
    }

    return suppliers;
  }

  /**
   * 将决策链结果格式化为结构化Markdown
   */
  private formatDecisionChainToMarkdown(content: string): string {
    const lines: string[] = [];
    lines.push(`## 数字化领导层\n`);

    // 尝试提取人名、职位和发言
    const leadershipPattern = /([^\s（(]+)[（(]([^)]+)[）)]\s*[-:—–]?\s*([^。]+)/g;
    const leaders: Array<{ name: string; position: string; quote: string }> = [];

    let match;
    while ((match = leadershipPattern.exec(content)) !== null) {
      const [, namePart, position, quote] = match;
      // 清理名字部分
      const name = namePart.replace(/^[#\s*\d+\s]*/, '').trim();
      leaders.push({ name, position: position.trim(), quote: quote.trim() });
    }

    if (leaders.length > 0) {
      leaders.forEach((leader, index) => {
        lines.push(`### ${index + 1}. ${leader.name}（${leader.position}）`);
        lines.push(`> ${leader.quote}`);
        lines.push(``);
      });
    } else {
      // 没有匹配到结构化格式，直接使用原文
      lines.push(content);
    }

    // 提取新闻/奖项
    const newsPattern = /\*\*([^\*]+)\*\*[：:]\s*([^。\n]+)/g;
    const newsItems: string[] = [];
    let lastMatch: RegExpExecArray | null = null;

    // 按行扫描新闻内容
    const contentLines = content.split('\n');
    for (const line of contentLines) {
      if (line.match(/^\d{4}年\d{1,2}月/) || line.match(/^\*\*\d{4}/)) {
        newsItems.push(line.trim());
      }
    }

    if (newsItems.length > 0) {
      lines.push(`## 数字化新闻与成果\n`);
      newsItems.forEach(item => {
        lines.push(`- ${item}`);
      });
      lines.push(``);
    }

    // 提取十五五规划
    if (content.includes('十五五') || content.includes('十四五')) {
      const planMatch = content.match(/(?:十五五|十四五)[^。]*。/g);
      if (planMatch && planMatch.length > 0) {
        lines.push(`## 十五五数字化规划\n`);
        planMatch.forEach(plan => lines.push(`- ${plan.trim()}`));
      }
    }

    const result = lines.join('\n').trim() || content;
    return `${result}\n\n---\n*数据来源：同花顺旗下快查企业数据引擎*`;
  }

  /**
   * 将JSON对象递归转换为Markdown格式
   */
  private jsonToMarkdown(data: any, indent = 0): string {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
      if (data.length === 0) return '（无数据）';
      return data.map((item, i) => {
        const prefix = data.every(d => typeof d === 'object' && d !== null)
          ? `### ${i + 1}\n`
          : `- `;
        return prefix + this.jsonToMarkdown(item, indent + 1);
      }).join('\n');
    }
    if (typeof data === 'object' && data !== null) {
      const parts: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined || value === '') continue;
        const displayKey = String(key).replace(/[_\u4e00-\u9fa5]+/g, (m) => m);
        // 跳过嵌套的对象/数组太深
        if (typeof value === 'object' && !Array.isArray(value) && indent < 2) {
          parts.push(`**${displayKey}**：${this.jsonToMarkdown(value, indent + 1)}`);
        } else if (Array.isArray(value) && indent < 2) {
          parts.push(`**${displayKey}**：\n${this.jsonToMarkdown(value, indent + 1)}`);
        } else {
          parts.push(`- **${displayKey}**：${this.jsonToMarkdown(value, indent + 1)}`);
        }
      }
      return parts.join('\n');
    }
    return String(data);
  }

  /**
   * 快查搜索主入口（带降级）
   */
  private async kuaichaSearchWithFallback(
    flatQueries: Array<{ query: string; field: string; label: string }>,
    customerName: string,
    customerType: string,
    searchGoal: string,
  ): Promise<SearchResult[]> {
    // 检查开关
    const useKuaicha = process.env.USE_KUAICHA_FOR_AUTO_FILL !== 'false';
    if (!useKuaicha) {
      this.logger.log(`[AutoFill] 快查开关关闭，使用百度搜索`);
      return this.executeMultiRoundSearch(flatQueries, customerName, customerType);
    }

    this.logger.log(`[AutoFill] 启用快查搜索模式 for "${customerName}", searchGoal=${searchGoal}`);

    try {
      const { backgroundResult, biddingResult, decisionChainResult } =
        await this.executeKuaichaTripleSearch(customerName, customerType);

      // 三段全失败 → 降级
      if (!backgroundResult && !biddingResult && !decisionChainResult) {
        this.logger.warn(`⚠️ [AutoFill] 快查三段全失败，降级到百度搜索`);
        return this.executeMultiRoundSearch(flatQueries, customerName, customerType);
      }

      // 至少一段成功 → AI综合
      this.logger.log(`🔄 [AutoFill] 开始AI综合: backgroundResult=${backgroundResult.length}chars, biddingResult=${biddingResult.length}chars, decisionChainResult=${decisionChainResult.length}chars`);
      const synthesized = await this.synthesizeKuaichaResults(
        backgroundResult,
        biddingResult,
        decisionChainResult,
        customerName,
      );
      this.logger.log(`�� [AutoFill] AI综合完成: synthesized包含${Object.keys(synthesized).length}个字段`);

      const results: SearchResult[] = [];

      if (searchGoal === 'background' || searchGoal === 'all') {
        results.push({
          field: 'background',
          content: synthesized.background_info,
          query: 'kuaicha-综合背景信息',
          references: [],
        });
      }

      if (searchGoal === 'decision_chain' || searchGoal === 'all') {
        this.logger.log(`🔍 [AutoFill] decision_chain条件满足: searchGoal=${searchGoal}, synthesized.decision_chain长度=${synthesized.decision_chain.length}`);
        if (synthesized.decision_chain) {
          this.logger.log(`✅ [AutoFill] 添加decision_chain到results`);
          results.push({
            field: 'decision_chain',
            content: synthesized.decision_chain,
            query: 'kuaicha-综合决策链',
            references: [],
          });
        } else {
          this.logger.warn(`⚠️ [AutoFill] synthesized.decision_chain为空，不添加`);
        }
      } else {
        this.logger.log(`⏭️ [AutoFill] 跳过decision_chain: searchGoal=${searchGoal}`);
      }

      // 历史合作：组合快查招投标提取 + 百度智能搜索
      if (searchGoal === 'cooperation_history' || searchGoal === 'all') {
        const cooperationParts: string[] = [];

        // 1. 从快查招投标结果中提取金山办公相关合作
        const ksoCooperation = this.extractCooperationHistoryFromBidding(
          backgroundResult + '\n\n' + biddingResult
        );
        if (ksoCooperation) {
          cooperationParts.push(ksoCooperation);
        }

        // 2. 补充百度智能搜索的结果（更精准的金山办公合作信息）
        this.logger.log(`[AutoFill] 使用百度智能搜索补充金山办公合作信息...`);
        const cooperationQueries = flatQueries.filter(q => q.field.startsWith('cooperation_'));
        if (cooperationQueries.length > 0) {
          try {
            const baiduResults = await this.executeMultiRoundSearch(cooperationQueries, customerName, customerType);
            for (const baiduResult of baiduResults) {
              if (baiduResult.content && baiduResult.content !== 'null') {
                // 清理markdown代码块标记
                let cleanedContent = baiduResult.content;
                cleanedContent = cleanedContent.replace(/```json\s*/g, '');
                cleanedContent = cleanedContent.replace(/```\s*/g, '');

                // 尝试解析JSON格式的content
                let actualContent = cleanedContent;
                try {
                  // 检查是否是JSON对象
                  const trimmed = cleanedContent.trim();
                  if (trimmed.startsWith('{')) {
                    const jsonData = JSON.parse(trimmed);
                    // 提取history_notes字段
                    if (jsonData.history_notes) {
                      actualContent = jsonData.history_notes;
                    }
                  }
                } catch {
                  // 不是JSON，直接使用清理后的内容
                  actualContent = cleanedContent;
                }

                if (actualContent && actualContent !== 'null' && actualContent !== '{}') {
                  // 直接使用内容，不添加"百度智能搜索补充"前缀
                  cooperationParts.push(actualContent);
                }
              }
            }
          } catch (e) {
            this.logger.warn(`⚠️ [AutoFill] 百度智能搜索补充失败: ${e.message}`);
          }
        }

        // 只有在有实际内容时才添加结果
        if (cooperationParts.length > 0) {
          results.push({
            field: 'cooperation_0',
            content: cooperationParts.join('\n\n---\n\n'),
            query: 'kuaicha-招投标提取+百度智能搜索',
            references: [],
          });
        } else {
          this.logger.log(`[AutoFill] 未找到金山办公相关合作记录，历史合作字段留空`);
        }
      }

      return results;
    } catch (e: any) {
      this.logger.error(`❌ [AutoFill] 快查搜索异常: ${e.message}，降级到百度搜索`);
      return this.executeMultiRoundSearch(flatQueries, customerName, customerType);
    }
  }

  /**
   * 聚合决策链搜索结果
   */
  private aggregateDecisionChainResults(results: SearchResult[]): any {
    const decisionData: Record<string, string[]> = {
      '高管层': [],
      '管理层': [],
      '信息化层': [],
      '采购层': [],
    };

    // 收集所有决策链相关的结果
    const decisionResults = results.filter(r => r.field.startsWith('decision_'));

    for (const result of decisionResults) {
      try {
        let markdownContent: string | null = null;

        // 尝试提取JSON（旧的百度搜索格式）
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const fieldData = JSON.parse(jsonMatch[0]);
            if (fieldData && typeof fieldData === 'object') {
              // 收集各层级的信息
              for (const [key, value] of Object.entries(fieldData)) {
                if (value && typeof value === 'string' && value !== 'null' && value.trim()) {
                  // 根据key映射到对应层级
                  if (key.includes('高管') || key.includes('executives')) {
                    decisionData['高管层'].push(value);
                  } else if (key.includes('管理') || key.includes('management')) {
                    decisionData['管理层'].push(value);
                  } else if (key.includes('信息化') || key.includes('it')) {
                    decisionData['信息化层'].push(value);
                  } else if (key.includes('采购') || key.includes('procurement')) {
                    decisionData['采购层'].push(value);
                  }
                }
              }
            }
          } catch (e) {
            // JSON解析失败，继续尝试直接使用content
          }
        }

        // 如果JSON中没有找到数据，直接使用content（新的快查格式）
        if (!markdownContent && result.content.trim() && result.content !== 'null') {
          markdownContent = result.content;
        }

        // 如果找到了Markdown格式的决策链，直接使用
        if (markdownContent) {
          return markdownContent;
        }
      } catch (error) {
        this.logger.warn(`Failed to parse decision result: ${error.message}`);
      }
    }

    // 生成Markdown格式的决策链（旧格式）
    const markdownParts: string[] = [];
    for (const [level, people] of Object.entries(decisionData)) {
      if (people.length > 0) {
        // 去重
        const uniquePeople = [...new Set(people)];
        markdownParts.push(`## ${level}\n${uniquePeople.join('\n')}`);
      }
    }

    if (markdownParts.length === 0) {
      return null;
    }

    return markdownParts.join('\n\n');
  }

  /**
   * 从招标信息中提取金山办公相关的历史合作信息
   */
  private extractCooperationHistoryFromBidding(content: string): string {
    // 金山办公相关关键词
    const ksoKeywords = [
      '金山办公', '金山软件', 'WPS', 'WPS Office', 'WPS365', 'WPS 365',
      'Kingsoft', '珠海金山', '北京金山'
    ];

    // 提取中标/合作信息，并过滤金山办公相关
    const cooperationPattern = /(?:中标|成交|签约|合作|中标人|承包商|供应商)[:：]\s*([^\n]+)/g;
    const matches: string[] = [];
    let match;

    while ((match = cooperationPattern.exec(content)) !== null) {
      const matchedText = match[1].trim();
      // 检查是否包含金山办公相关关键词
      const isKSORelated = ksoKeywords.some(keyword =>
        matchedText.toLowerCase().includes(keyword.toLowerCase())
      );
      if (isKSORelated) {
        matches.push(matchedText);
      }
    }

    // 如果没有找到相关合作，返回空字符串
    if (matches.length === 0) {
      return '';
    }

    // 有合作记录才构建内容
    const lines: string[] = [];
    lines.push(`## 历史合作记录\n`);
    lines.push(`（基于${new Date().getFullYear()}年往前3年的招投标信息）\n`);
    lines.push(`### 与金山办公/WPS相关的合作记录`);

    // 去重并显示
    const uniqueMatches = [...new Set(matches)];
    uniqueMatches.forEach((m, i) => {
      lines.push(`${i + 1}. ${m}`);
    });

    return lines.join('\n').trim() + `\n\n---\n*数据来源：同花顺旗下快查企业数据引擎*`;
  }

  /**
   * 聚合历史合作搜索结果
   */
  private aggregateCooperationResults(results: SearchResult[]): string | null {
    const cooperationResults = results.filter(r => r.field.startsWith('cooperation_'));

    // 收集所有有效的合作信息
    const validCooperations: string[] = [];

    for (const result of cooperationResults) {
      try {
        let content: string | null = null;

        // 尝试提取JSON（旧的百度搜索格式）
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const fieldData = JSON.parse(jsonMatch[0]);
            if (fieldData && fieldData.history_notes && fieldData.history_notes !== 'null') {
              content = fieldData.history_notes;
            }
          } catch {
            // JSON解析失败，尝试直接使用内容
          }
        }

        // 如果JSON中没找到，直接使用content（新的快查格式）
        if (!content && result.content.trim() && result.content !== 'null') {
          content = result.content;
        }

        if (content) {
          validCooperations.push(content);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse cooperation result: ${error.message}`);
      }
    }

    if (validCooperations.length === 0) {
      return null;
    }

    // 合并所有合作信息
    return validCooperations.join('\n\n---\n\n');
  }

  /**
   * 验证决策链结果质量
   */
  private validateDecisionChainResult(result: string): boolean {
    if (!result || result.trim().length === 0) {
      return false;
    }

    // 检查1: 是否包含具体的人名和职位（传统决策链格式）
    const hasNameAndPosition = /([A-Za-z\u4e00-\u9fa5]+)(\s*)(CEO|总经理|董事长|院长|局长|处长|主任|总监|经理|负责人)/.test(result);
    if (hasNameAndPosition) {
      return true;
    }

    // 检查2: 是否包含新闻资讯格式（快查Search3返回的数字化新闻/领导发言/规划信息）
    const hasNewsFormat = /###?\s*(数字化新闻|数字化领导|十五五规划|新闻|成果|奖项|发言|讲话|规划)/.test(result);
    if (hasNewsFormat) {
      return true;
    }

    // 检查3: 是否包含标题或内容（任何非空内容）
    const hasTitleOrContent = /\*\*[^*]+\*\*/.test(result) || /\d{4}[-年]\d{1,2}[-月]/.test(result);
    return hasTitleOrContent;
  }

  /**
   * 验证历史合作结果质量
   */
  private validateCooperationResult(result: string): boolean {
    if (!result || result.trim().length === 0) {
      return false;
    }

    // 检查是否包含具体的合作关键词
    const hasCooperationKeywords = /中标|签约|采购|合作|部署|实施|项目|协议/.test(result);
    return hasCooperationKeywords;
  }

  /**
   * 合并多个查询结果
   */
  private mergeFieldResults(results: SearchResult[], searchGoal: string): any {
    const profileData: any = {};

    // 处理背景资料
    if (searchGoal === 'background' || searchGoal === 'all') {
      const backgroundResult = results.find(r => r.field === 'background');
      if (backgroundResult) {
        try {
          const jsonMatch = backgroundResult.content.match(/\{[\s\S]*\}/);
          let fieldData: any;
          if (jsonMatch) {
            fieldData = JSON.parse(jsonMatch[0]);
          } else {
            fieldData = JSON.parse(backgroundResult.content);
          }

          if (fieldData && fieldData.background_info) {
            profileData.background_info = fieldData.background_info;
          }
        } catch (error) {
          this.logger.warn('Failed to parse background result as JSON');
          profileData.background_info = backgroundResult.content;
        }
      }
    }

    // 处理决策链（聚合多轮搜索结果）
    if (searchGoal === 'decision_chain' || searchGoal === 'all') {
      const decisionChain = this.aggregateDecisionChainResults(results);
      if (decisionChain && this.validateDecisionChainResult(decisionChain)) {
        profileData.decision_chain = decisionChain;
      }
    }

    // 处理历史合作（聚合多轮搜索结果）
    if (searchGoal === 'cooperation_history' || searchGoal === 'all') {
      const cooperation = this.aggregateCooperationResults(results);
      if (cooperation && this.validateCooperationResult(cooperation)) {
        profileData.history_notes = cooperation;
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

    // 🎯 根据客户类型获取搜索查询配置
    const queries = this.getSearchQueriesByType(customerName, customerType);

    // 🔄 扁平化搜索查询
    const flatQueries = this.flattenSearchQueries(queries, searchGoal);

    this.logger.log(`🔍 Auto-filling customer profile for "${customerName}" (${customerType}) with goal: ${searchGoal}`);
    this.logger.log(`🔍 Will execute ${flatQueries.length} search queries (multi-round strategy)`);

    // 🔍 执行多轮搜索（快查优先，带降级）
    const results = await this.kuaichaSearchWithFallback(flatQueries, customerName, customerType, searchGoal);

    try {
      // 合并所有查询结果
      const profileData = this.mergeFieldResults(results, searchGoal);

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
          // Filter out string "null" as well (AI sometimes returns "null" instead of null)
          return keys.some(k => {
            const v = value[k];
            return v && v !== null && v !== '' && v !== 'null' && v !== 'undefined';
          });
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
