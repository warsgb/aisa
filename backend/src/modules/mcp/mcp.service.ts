import { Injectable, Logger, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from '../../entities/team.entity';
import { Customer } from '../../entities/customer.entity';
import { Document } from '../../entities/document.entity';
import { Skill } from '../../entities/skill.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { LtcNode } from '../../entities/ltc-node.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { CustomersService } from '../customers/customers.service';
import { LtcService } from '../ltc/ltc.service';
import { SkillExecutorService } from '../skills/skill-executor.service';
import { CreateCustomerMcpDto } from './dto/create-customer-mcp.dto';
import { ExecuteSkillMcpDto } from './dto/execute-skill-mcp.dto';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(LtcNode)
    private ltcNodeRepository: Repository<LtcNode>,
    @InjectRepository(NodeSkillBinding)
    private nodeSkillBindingRepository: Repository<NodeSkillBinding>,
    private readonly customerService: CustomersService,
    private readonly ltcService: LtcService,
    private readonly skillExecutorService: SkillExecutorService,
  ) {}

  /**
   * 查询用户所属的团队列表
   */
  async queryTeams(userId: string, search?: string) {
    // 获取用户所属的团队ID列表
    const teamMembers = await this.teamMemberRepository.find({
      where: { user_id: userId },
      select: ['team_id'],
    });

    const teamIds = teamMembers.map(tm => tm.team_id);

    if (teamIds.length === 0) {
      this.logger.log(`User ${userId} has no teams`);
      return [];
    }

    const query = this.teamRepository.createQueryBuilder('team');

    query.andWhere('team.id IN (:...teamIds)', { teamIds });

    if (search) {
      query.andWhere('team.name ILIKE :search', { search: `%${search}%` });
    }

    query.orderBy('team.updated_at', 'DESC').take(50);

    const teams = await query.getMany();
    this.logger.log(`Found ${teams.length} teams for user ${userId}`);
    return teams;
  }

  /**
   * 查询团队客户列表
   * 当 teamId 为 'fullteam' 时，查询用户所有团队的客户
   */
  async queryCustomers(userId: string, teamId: string, search?: string) {
    const query = this.customerRepository.createQueryBuilder('customer');

    // 如果是 fullteam，获取用户所有团队的客户
    if (teamId === 'fullteam') {
      const teamMembers = await this.teamMemberRepository.find({
        where: { user_id: userId },
        select: ['team_id'],
      });

      const teamIds = teamMembers.map(tm => tm.team_id);

      if (teamIds.length === 0) {
        this.logger.log(`User ${userId} has no teams`);
        return [];
      }

      query.andWhere('customer.team_id IN (:...teamIds)', { teamIds });
    } else {
      // 验证用户是否属于该团队
      const teamMember = await this.teamMemberRepository.findOne({
        where: { user_id: userId, team_id: teamId },
      });

      if (!teamMember) {
        this.logger.warn(`User ${userId} is not a member of team ${teamId}`);
        return [];
      }

      query.andWhere('customer.team_id = :teamId', { teamId });
    }

    if (search) {
      query.andWhere('customer.name ILIKE :search', { search: `%${search}%` });
    }

    query.orderBy('customer.updated_at', 'DESC').take(50);

    const customers = await query.getMany();
    this.logger.log(`Found ${customers.length} customers for user ${userId}, team ${teamId}`);
    return customers;
  }

  /**
   * 查询客户文档列表
   * 验证客户是否属于用户的团队
   */
  async queryDocuments(userId: string, customerId: string) {
    // 先验证该客户是否属于用户的团队
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      select: ['team_id'],
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${customerId}`);
      return [];
    }

    // 验证用户是否属于该客户所在的团队
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: customer.team_id },
    });

    if (!teamMember) {
      this.logger.warn(`User ${userId} is not a member of team ${customer.team_id} for customer ${customerId}`);
      return [];
    }

    const documents = await this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.customer', 'customer')
      .leftJoinAndSelect('doc.interaction', 'interaction')
      .leftJoin('interaction.skill', 'skill')
      .addSelect(['skill.id', 'skill.name'])
      .where('doc.customer_id = :customerId', { customerId })
      .orderBy('doc.updated_at', 'DESC')
      .take(50)
      .getMany();

    this.logger.log(`Found ${documents.length} documents for customer ${customerId}`);
    return documents;
  }

  /**
   * 获取文档内容
   * 验证文档所属客户是否属于用户的团队
   */
  async getDocument(userId: string, documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      this.logger.warn(`Document not found: ${documentId}`);
      return null;
    }

    // 验证用户是否有权限访问该文档所属的客户
    const customer = await this.customerRepository.findOne({
      where: { id: document.customer_id },
      select: ['team_id'],
    });

    if (!customer) {
      this.logger.warn(`Customer not found for document ${documentId}`);
      return null;
    }

    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: customer.team_id },
    });

    if (!teamMember) {
      this.logger.warn(`User ${userId} is not a member of team ${customer.team_id} for document ${documentId}`);
      return null;
    }

    this.logger.log(`Retrieved document: ${documentId}`);
    return document;
  }

  /**
   * Create customer with AI auto-research
   * Fire-and-forget pattern - returns immediately after triggering background research
   */
  async createCustomerWithAutoResearch(
    userId: string,
    teamId: string,
    dto: CreateCustomerMcpDto
  ) {
    // 1. Verify user is member of team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: teamId },
    });

    if (!teamMember) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // 2. Create customer using CustomerService
    const customer = await this.customerService.create(teamId, userId, {
      name: dto.name,
      industry: dto.industry,
      company_size: dto.company_size,
      description: dto.description,
      contact_info: dto.contact_info,
      metadata: dto.metadata,
    });

    // 3. Trigger auto-research asynchronously if enabled
    if (dto.triggerAutoResearch !== false) {
      // Fire-and-forget pattern
      setImmediate(async () => {
        try {
          await this.ltcService.autoFillCustomerProfile(
            teamId,
            customer.id,
            userId,
            { searchGoal: 'all' }
          );
          this.logger.log(`Auto-research completed for customer ${customer.id}`);
        } catch (error) {
          this.logger.error(`Auto-research failed for customer ${customer.id}:`, error);
        }
      });
    }

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        industry: customer.industry,
        created_at: customer.created_at,
      },
      message: dto.triggerAutoResearch !== false
        ? 'Customer created successfully. AI auto-research has been initiated and will run in the background.'
        : 'Customer created successfully.',
    };
  }

  /**
   * Execute skill on customer (async)
   * Fire-and-forget pattern - returns immediately after triggering skill execution
   */
  async executeSkillAsync(
    userId: string,
    customerId: string,
    skillId: string,
    dto: ExecuteSkillMcpDto
  ) {
    // 1. Verify customer exists and get team_id
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      select: ['team_id'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const teamId = customer.team_id;

    // 2. Verify user is member of team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: teamId },
    });

    if (!teamMember) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // 3. Verify skill exists - support ID, name, or slug
    let skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    // If not found by ID, try by name (Chinese name)
    if (!skill) {
      skill = await this.skillRepository.findOne({
        where: { name: skillId },
      });
    }

    // If still not found, try by slug
    if (!skill) {
      skill = await this.skillRepository.findOne({
        where: { slug: skillId },
      });
    }

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    // 4. Execute skill asynchronously (fire-and-forget)
    setImmediate(async () => {
      try {
        await this.skillExecutorService.executeSkill({
          skillId: skill.id,  // Use resolved skill ID
          teamId,
          customerId,
          userId,
          parameters: dto.parameters || {},
          message: dto.message,
          referenceDocumentId: dto.referenceDocumentId,
          // No callbacks - fire and forget
        });
        this.logger.log(`Skill execution initiated: ${skill.name} (${skill.id}) for customer ${customerId}`);
      } catch (error) {
        this.logger.error(`Skill execution failed: ${skill.name} (${skill.id}) for customer ${customerId}:`, error);
      }
    });

    return {
      success: true,
      message: 'Skill execution has been initiated. The skill is running in the background.',
      execution: {
        skill_id: skill.id,
        skill_name: skill.name,
        customer_id: customerId,
        team_id: teamId,
      },
    };
  }

  /**
   * Query latest document by customer and skill
   * Returns the most recent document generated by executing a specific skill on a customer
   */
  async getLatestDocumentByCustomerSkill(
    userId: string,
    customerId: string,
    skillId: string
  ) {
    // 1. Verify customer exists and get team_id
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      select: ['team_id'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 2. Verify user is member of team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: customer.team_id },
    });

    if (!teamMember) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // 3. Resolve skill ID - support ID, name, or slug
    let skill = await this.skillRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      skill = await this.skillRepository.findOne({
        where: { name: skillId },
      });
    }

    if (!skill) {
      skill = await this.skillRepository.findOne({
        where: { slug: skillId },
      });
    }

    if (!skill) {
      this.logger.warn(`Skill not found: ${skillId}`);
      return null;
    }

    // 4. Query latest document via skill interaction
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .innerJoin('document.interaction', 'interaction')
      .where('document.team_id = :teamId', { teamId: customer.team_id })
      .andWhere('document.customer_id = :customerId', { customerId })
      .andWhere('interaction.skill_id = :resolvedSkillId', { resolvedSkillId: skill.id })
      .orderBy('document.updated_at', 'DESC')
      .getOne();

    if (!document) {
      this.logger.warn(`No document found for customer ${customerId}, skill ${skillId}`);
      return null;
    }

    this.logger.log(`Retrieved latest document for customer ${customerId}, skill ${skillId}`);
    return document;
  }

  /**
   * Query all executable skills for a team
   * Returns skills that are bound to the team's LTC nodes (team-isolated)
   */
  async querySkills(userId: string, teamId: string, search?: string) {
    // 1. Verify user is member of team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: teamId },
    });

    if (!teamMember) {
      this.logger.warn(`User ${userId} is not a member of team ${teamId}`);
      return [];
    }

    // 2. Get all LTC node IDs for this team
    const ltcNodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      select: ['id'],
    });
    const nodeIds = ltcNodes.map(n => n.id);

    if (nodeIds.length === 0) {
      this.logger.log(`Team ${teamId} has no LTC nodes, returning empty skills list`);
      return [];
    }

    // 3. Get skill IDs bound to these nodes
    const bindings = await this.nodeSkillBindingRepository.find({
      where: { node_id: In(nodeIds) },
      select: ['skill_id'],
    });
    const skillIds = [...new Set(bindings.map(b => b.skill_id))];

    if (skillIds.length === 0) {
      this.logger.log(`Team ${teamId} has no skills bound to LTC nodes, returning empty list`);
      return [];
    }

    // 4. Query skills that are bound to team's LTC nodes and enabled
    const query = this.skillRepository.createQueryBuilder('skill');

    query.andWhere('skill.id IN (:...skillIds)', { skillIds });
    query.andWhere('skill.is_enabled = :isEnabled', { isEnabled: true });

    if (search) {
      query.andWhere('(skill.name ILIKE :search OR skill.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    query.orderBy('skill.name', 'ASC').take(100);

    const skills = await query.getMany();
    this.logger.log(`Found ${skills.length} team-isolated skills for user ${userId}, team ${teamId}`);
    return skills;
  }

  /**
   * Query executable skills for a specific customer
   * Returns skills that are bound to the customer's team LTC nodes (team-isolated)
   */
  async querySkillsForCustomer(userId: string, customerId: string) {
    // 1. Verify customer exists and get team_id
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      select: ['team_id'],
    });

    if (!customer) {
      this.logger.warn(`Customer not found: ${customerId}`);
      return [];
    }

    const teamId = customer.team_id;

    // 2. Verify user is member of team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: teamId },
    });

    if (!teamMember) {
      this.logger.warn(`User ${userId} is not a member of team ${teamId} for customer ${customerId}`);
      return [];
    }

    // 3. Get all LTC node IDs for this team
    const ltcNodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
      select: ['id'],
    });
    const nodeIds = ltcNodes.map(n => n.id);

    if (nodeIds.length === 0) {
      this.logger.log(`Team ${teamId} has no LTC nodes, returning empty skills list for customer ${customerId}`);
      return [];
    }

    // 4. Get skill IDs bound to these nodes
    const bindings = await this.nodeSkillBindingRepository.find({
      where: { node_id: In(nodeIds) },
      select: ['skill_id'],
    });
    const skillIds = [...new Set(bindings.map(b => b.skill_id))];

    if (skillIds.length === 0) {
      this.logger.log(`Team ${teamId} has no skills bound to LTC nodes, returning empty list for customer ${customerId}`);
      return [];
    }

    // 5. Query skills that are bound to team's LTC nodes and enabled
    const skills = await this.skillRepository.find({
      where: {
        id: In(skillIds),
        is_enabled: true,
      },
      order: {
        name: 'ASC',
      },
      take: 100,
    });

    this.logger.log(`Found ${skills.length} team-isolated skills for customer ${customerId}`);
    return skills;
  }

  /**
   * 更新客户档案
   */
  async updateCustomerProfile(
    userId: string,
    customerId: string,
    dto: {
      name?: string;
      industry?: string;
      company_size?: string;
      description?: string;
      contact_info?: string;
      background_info?: string;
      decision_chain?: string;
      history_notes?: string;
    }
  ) {
    // 1. Verify customer exists and user has access
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 2. Verify user is member of the customer's team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: userId, team_id: customer.team_id },
    });

    if (!teamMember) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // 3. Parse contact_info if provided as string
    let contactInfo = customer.contact_info;
    if (dto.contact_info) {
      try {
        contactInfo = typeof dto.contact_info === 'string'
          ? JSON.parse(dto.contact_info)
          : dto.contact_info;
      } catch (e) {
        throw new Error('Invalid contact_info JSON format');
      }
    }

    // 4. Prepare update data
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.industry !== undefined) updateData.industry = dto.industry;
    if (dto.company_size !== undefined) updateData.company_size = dto.company_size;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.contact_info !== undefined) updateData.contact_info = contactInfo;

    // Add profile fields to ltc_context
    const ltcContext = customer.ltc_context || {};
    if (dto.background_info !== undefined) ltcContext.background_info = dto.background_info;
    if (dto.decision_chain !== undefined) ltcContext.decision_chain = dto.decision_chain;
    if (dto.history_notes !== undefined) ltcContext.history_notes = dto.history_notes;
    updateData.ltc_context = ltcContext;

    // 5. Update customer
    await this.customerRepository.update(customerId, {
      ...updateData,
      updated_at: new Date(),
    });

    // 6. Fetch and return updated customer
    const updatedCustomer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!updatedCustomer) {
      throw new NotFoundException('Failed to fetch updated customer');
    }

    this.logger.log(`Customer ${customerId} updated by user ${userId}`);

    return {
      success: true,
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        industry: updatedCustomer.industry,
        company_size: updatedCustomer.company_size,
        description: updatedCustomer.description,
        contact_info: updatedCustomer.contact_info,
        ltc_context: updatedCustomer.ltc_context,
        updated_at: updatedCustomer.updated_at,
      },
    };
  }
}
