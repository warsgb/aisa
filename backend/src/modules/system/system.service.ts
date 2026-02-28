import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { TeamMember, TeamRole } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { InteractionMessage } from '../../entities/interaction-message.entity';
import { Document } from '../../entities/document.entity';
import { TeamApplication } from '../../entities/team-application.entity';
import { SystemLtcNode } from '../../entities/system-ltc-node.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';
import { LtcNode } from '../../entities/ltc-node.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { IronTriangleRole } from '../../entities/team-member-preference.entity';
import { SystemConfig, ConfigKey } from '../../entities/system-config.entity';

export interface TeamSyncChanges {
  hasChanges: boolean;
  changes: {
    ltcNodes: { added: number; updated: number; skipped: number };
    roleConfigs: { updated: number; skipped: number };
  };
}

export interface SyncResult {
  success: number;
  skipped: number;
  errors: number;
  details: Array<{
    teamId: string;
    teamName?: string;
    changes?: TeamSyncChanges;
    error?: string;
  }>;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalTeamMembers: number;
}

export interface DashboardStats {
  overview: {
    userCount: number;
    teamCount: number;
    customerCount: number;
    interactionCount: number;
  };
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    interactionCount: number;
  }>;
  topTeams: Array<{
    teamId: string;
    teamName: string;
    interactionCount: number;
  }>;
  recentInteractions: SkillInteraction[];
}

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(SkillInteraction)
    private interactionRepository: Repository<SkillInteraction>,
    @InjectRepository(InteractionMessage)
    private messageRepository: Repository<InteractionMessage>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(TeamApplication)
    private teamApplicationRepository: Repository<TeamApplication>,
    @InjectRepository(SystemLtcNode)
    private systemLtcNodeRepository: Repository<SystemLtcNode>,
    @InjectRepository(SystemRoleSkillConfig)
    private systemRoleSkillConfigRepository: Repository<SystemRoleSkillConfig>,
    @InjectRepository(LtcNode)
    private ltcNodeRepository: Repository<LtcNode>,
    @InjectRepository(TeamRoleSkillConfig)
    private teamRoleSkillConfigRepository: Repository<TeamRoleSkillConfig>,
    @InjectRepository(NodeSkillBinding)
    private nodeSkillBindingRepository: Repository<NodeSkillBinding>,
    @InjectRepository(SystemConfig)
    private systemConfigRepository: Repository<SystemConfig>,
  ) {}

  // ========== System Config Management ==========

  async getSystemConfig(key: string): Promise<string | null> {
    const config = await this.systemConfigRepository.findOne({
      where: { key: key as ConfigKey },
    });
    return config?.value || null;
  }

  async setSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
    let config = await this.systemConfigRepository.findOne({
      where: { key: key as ConfigKey },
    });

    if (config) {
      config.value = value;
      if (description !== undefined) {
        config.description = description;
      }
    } else {
      config = this.systemConfigRepository.create({
        key: key as ConfigKey,
        value,
        description: description || null,
      });
    }

    return this.systemConfigRepository.save(config);
  }

  async getAllSystemConfigs(): Promise<SystemConfig[]> {
    return this.systemConfigRepository.find({
      order: { key: 'ASC' },
    });
  }

  async getAllUsers(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.userRepository.createQueryBuilder('user');

    if (search) {
      query.where(
        '(user.email ILIKE :search OR user.full_name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // Get team memberships for each user
    const usersWithTeams = await Promise.all(
      users.map(async (user) => {
        const teamMembers = await this.teamMemberRepository.find({
          where: { user_id: user.id },
          relations: ['team'],
        });

        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          teams: teamMembers.map(tm => ({
            id: tm.team.id,
            name: tm.team.name,
            role: tm.role,
          })),
        };
      }),
    );

    return {
      data: usersWithTeams,
      total,
      page,
      pageSize,
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const teamMembers = await this.teamMemberRepository.find({
      where: { user_id: user.id },
      relations: ['team'],
    });

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      teams: teamMembers.map(tm => ({
        id: tm.team.id,
        name: tm.team.name,
        role: tm.role,
        joined_at: tm.joined_at,
      })),
    };
  }

  async updateUserStatus(id: string, is_active: boolean) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.is_active = is_active;
    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    };
  }

  async resetUserPassword(id: string, new_password: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    user.password_hash = password_hash;
    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      message: 'Password reset successfully',
    };
  }

  async getAllTeams(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.teamRepository.createQueryBuilder('team');

    if (search) {
      query.where('team.name ILIKE :search', { search: `%${search}%` });
    }

    const [teams, total] = await query
      .orderBy('team.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // Get member count for each team
    const teamsWithMemberCount = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await this.teamMemberRepository.count({
          where: { team_id: team.id },
        });

        const owner = await this.teamMemberRepository.findOne({
          where: { team_id: team.id, role: TeamRole.OWNER },
          relations: ['user'],
        });

        return {
          id: team.id,
          name: team.name,
          description: team.description,
          logo_url: team.logo_url,
          created_at: team.created_at,
          updated_at: team.updated_at,
          member_count: memberCount,
          owner: owner ? {
            id: owner.user.id,
            email: owner.user.email,
            full_name: owner.user.full_name,
          } : null,
        };
      }),
    );

    return {
      data: teamsWithMemberCount,
      total,
      page,
      pageSize,
    };
  }

  async getTeamMembers(teamId: string) {
    const teamMembers = await this.teamMemberRepository.find({
      where: { team_id: teamId },
      relations: ['user'],
    });

    return teamMembers.map(tm => ({
      id: tm.user.id,
      email: tm.user.email,
      full_name: tm.user.full_name,
      role: tm.role,
      joined_at: tm.joined_at,
      is_active: tm.user.is_active,
    }));
  }

  async deleteTeam(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Delete all team members first
    await this.teamMemberRepository.delete({
      team_id: id,
    });

    // Delete the team
    await this.teamRepository.delete(id);

    return {
      message: 'Team deleted successfully',
    };
  }

  async changeTeamOwner(teamId: string, newOwnerId: string) {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const newOwner = await this.userRepository.findOne({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner user not found');
    }

    // Find current owner
    const currentOwner = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, role: TeamRole.OWNER },
    });

    if (!currentOwner) {
      throw new NotFoundException('Current owner not found');
    }

    // Check if new owner is already a member
    const existingMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: newOwnerId },
    });

    if (existingMember) {
      // If already a member, remove them first
      await this.teamMemberRepository.delete(existingMember.id);
    }

    // Demote current owner to admin
    await this.teamMemberRepository.update(currentOwner.id, {
      role: TeamRole.ADMIN,
    });

    // Create new owner
    const newOwnerMember = this.teamMemberRepository.create({
      team_id: teamId,
      user_id: newOwnerId,
      role: TeamRole.OWNER,
    });

    await this.teamMemberRepository.save(newOwnerMember);

    return {
      message: 'Team owner changed successfully',
    };
  }

  async getSystemStats(): Promise<SystemStats> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { is_active: true },
    });
    const totalTeams = await this.teamRepository.count();
    const totalTeamMembers = await this.teamMemberRepository.count();

    return {
      totalUsers,
      activeUsers,
      totalTeams,
      totalTeamMembers,
    };
  }

  // System-wide data endpoints for admin
  async getAllCustomers(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.customerRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.team', 'team');

    if (search) {
      query.where('customer.name ILIKE :search', { search: `%${search}%` });
    }

    const [customers, total] = await query
      .orderBy('customer.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: customers.map(c => ({
        id: c.id,
        team_id: c.team_id,
        team_name: c.team?.name,
        name: c.name,
        industry: c.industry,
        company_size: c.company_size,
        description: c.description,
        contact_info: c.contact_info,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getAllSkills(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.skillRepository.createQueryBuilder('skill');

    if (search) {
      query.where('(skill.name ILIKE :search OR skill.description ILIKE :search OR skill.category ILIKE :search)', { search: `%${search}%` });
    }

    const [skills, total] = await query
      .orderBy('skill.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: skills.map(s => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        usage_hint: s.usage_hint,
        supports_streaming: s.supports_streaming,
        supports_multi_turn: s.supports_multi_turn,
        created_at: s.created_at,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getAllInteractions(page: number = 1, pageSize: number = 20, search?: string, customerId?: string, skillId?: string) {
    const query = this.interactionRepository.createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.team', 'team')
      .leftJoinAndSelect('interaction.skill', 'skill')
      .leftJoinAndSelect('interaction.customer', 'customer')
      .leftJoinAndSelect('interaction.messages', 'messages');

    // Build where conditions
    const conditions: string[] = [];
    const parameters: Record<string, any> = {};

    if (search) {
      conditions.push('customer.name ILIKE :search');
      parameters.search = `%${search}%`;
    }

    if (customerId) {
      conditions.push('interaction.customer_id = :customerId');
      parameters.customerId = customerId;
    }

    if (skillId) {
      conditions.push('interaction.skill_id = :skillId');
      parameters.skillId = skillId;
    }

    if (conditions.length > 0) {
      query.where(conditions.join(' AND '), parameters);
    }

    const [interactions, total] = await query
      .orderBy('interaction.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: interactions,
      total,
      page,
      pageSize,
    };
  }

  async getInteractionById(id: string) {
    const interaction = await this.interactionRepository.createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.team', 'team')
      .leftJoinAndSelect('interaction.skill', 'skill')
      .leftJoinAndSelect('interaction.customer', 'customer')
      .leftJoinAndSelect('interaction.messages', 'messages')
      .where('interaction.id = :id', { id })
      .getOne();

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    return interaction;
  }

  async updateInteractionMessage(interactionId: string, messageId: string, content: string) {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
      relations: ['messages'],
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    const message = interaction.messages.find(m => m.id === messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.content = content;
    await this.messageRepository.save(message);

    return { message: 'Message updated successfully' };
  }

  async getAllDocuments(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.documentRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.team', 'team')
      .leftJoinAndSelect('document.interaction', 'interaction');

    if (search) {
      query.where('document.title ILIKE :search', { search: `%${search}%` });
    }

    const [documents, total] = await query
      .orderBy('document.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: documents.map(d => ({
        id: d.id,
        team_id: d.team_id,
        team_name: d.team?.name,
        title: d.title,
        content: d.content,
        interaction_id: d.interaction_id,
        format: d.format,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      total,
      page,
      pageSize,
    };
  }

  // Create user by system admin
  async createUser(data: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    is_active?: boolean;
    team_ids?: string[];
  }) {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: data.email,
      full_name: data.full_name,
      password_hash,
      role: (data.role as any) || 'MEMBER',
      is_active: data.is_active ?? true,
    });

    await this.userRepository.save(user);

    // Add user to teams if team_ids provided
    if (data.team_ids && data.team_ids.length > 0) {
      for (const teamId of data.team_ids) {
        const team = await this.teamRepository.findOne({ where: { id: teamId } });
        if (team) {
          const teamMember = this.teamMemberRepository.create({
            team_id: teamId,
            user_id: user.id,
            role: TeamRole.MEMBER,
          });
          await this.teamMemberRepository.save(teamMember);
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  // Update user teams
  async updateUserTeams(userId: string, teamIds: string[]) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get current team memberships
    const currentMemberships = await this.teamMemberRepository.find({
      where: { user_id: userId },
    });

    // Remove all current memberships
    await this.teamMemberRepository.delete({ user_id: userId });

    // Add new memberships
    for (const teamId of teamIds) {
      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (team) {
        // Check if user was already a member and had OWNER role
        const existingMembership = currentMemberships.find(m => m.team_id === teamId);
        const role = existingMembership?.role === TeamRole.OWNER ? TeamRole.OWNER : TeamRole.MEMBER;

        const teamMember = this.teamMemberRepository.create({
          team_id: teamId,
          user_id: userId,
          role,
        });
        await this.teamMemberRepository.save(teamMember);
      }
    }

    return {
      message: 'User teams updated successfully',
    };
  }

  // Create team by system admin
  async createTeam(data: {
    name: string;
    description?: string;
    logo_url?: string;
    owner_id: string;
  }) {
    // Check if owner exists
    const owner = await this.userRepository.findOne({
      where: { id: data.owner_id },
    });

    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    // Check if team name already exists
    const existingTeam = await this.teamRepository.findOne({
      where: { name: data.name },
    });

    if (existingTeam) {
      throw new ConflictException('Team with this name already exists');
    }

    // Create team
    const team = this.teamRepository.create({
      name: data.name,
      description: data.description,
      logo_url: data.logo_url,
    });

    await this.teamRepository.save(team);

    // Create team membership for owner
    const teamMember = this.teamMemberRepository.create({
      team_id: team.id,
      user_id: data.owner_id,
      role: TeamRole.OWNER,
    });

    await this.teamMemberRepository.save(teamMember);

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      logo_url: team.logo_url,
      created_at: team.created_at,
      owner: {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
      },
    };
  }

  // Submit team application
  async submitTeamApplication(userId: string, data: { name: string; description?: string }) {
    // Check if user already has a pending application for this team name
    const existingApplication = await this.teamApplicationRepository.findOne({
      where: {
        userId,
        name: data.name,
        status: 'pending',
      },
    });

    if (existingApplication) {
      throw new ConflictException('You already have a pending application for this team name');
    }

    // Check if team name already exists
    const existingTeam = await this.teamRepository.findOne({
      where: { name: data.name },
    });

    if (existingTeam) {
      throw new ConflictException('Team with this name already exists');
    }

    const application = this.teamApplicationRepository.create({
      userId,
      name: data.name,
      description: data.description,
      status: 'pending',
    });

    await this.teamApplicationRepository.save(application);

    return {
      id: application.id,
      name: application.name,
      description: application.description,
      status: application.status,
      created_at: application.createdAt,
    };
  }

  // Get all team applications (for admin)
  async getTeamApplications(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
  ) {
    const query = this.teamApplicationRepository.createQueryBuilder('application')
      .leftJoinAndSelect('application.user', 'user')
      .leftJoinAndSelect('application.reviewer', 'reviewer');

    if (status) {
      query.where('application.status = :status', { status });
    }

    const [applications, total] = await query
      .orderBy('application.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: applications.map(app => ({
        id: app.id,
        name: app.name,
        description: app.description,
        status: app.status,
        user: {
          id: app.user.id,
          email: app.user.email,
          full_name: app.user.full_name,
        },
        reviewer: app.reviewer ? {
          id: app.reviewer.id,
          full_name: app.reviewer.full_name,
        } : null,
        reviewed_at: app.reviewedAt,
        rejection_reason: app.rejectionReason,
        created_at: app.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // Get user's team applications
  async getUserTeamApplications(userId: string) {
    const applications = await this.teamApplicationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return applications.map(app => ({
      id: app.id,
      name: app.name,
      description: app.description,
      status: app.status,
      reviewed_at: app.reviewedAt,
      rejection_reason: app.rejectionReason,
      created_at: app.createdAt,
    }));
  }

  // Review team application
  async reviewTeamApplication(
    applicationId: string,
    reviewerId: string,
    data: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    const application = await this.teamApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['user'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== 'pending') {
      throw new ConflictException('Application has already been reviewed');
    }

    application.status = data.status;
    application.reviewedBy = reviewerId;
    application.reviewedAt = new Date();
    application.rejectionReason = data.rejectionReason;

    await this.teamApplicationRepository.save(application);

    // If approved, create the team
    let team = null;
    if (data.status === 'approved') {
      team = await this.createTeam({
        name: application.name,
        description: application.description,
        owner_id: application.userId,
      });
    }

    return {
      id: application.id,
      status: application.status,
      team: team ? {
        id: team.id,
        name: team.name,
      } : null,
    };
  }

  // ========== System-Level Configuration Management ==========

  // System LTC Node Management
  async getSystemLtcNodes() {
    return this.systemLtcNodeRepository.find({
      order: { order: 'ASC' },
    });
  }

  async createSystemLtcNode(data: {
    name: string;
    description?: string;
    order?: number;
    default_skill_ids?: string[];
  }) {
    // Get max order if not provided
    if (data.order === undefined) {
      const maxOrder = await this.systemLtcNodeRepository
        .createQueryBuilder('node')
        .select('MAX(node.order)', 'max')
        .getRawOne();
      data.order = maxOrder?.max ? parseInt(maxOrder.max) + 1 : 0;
    }

    const node = this.systemLtcNodeRepository.create({
      name: data.name,
      description: data.description,
      order: data.order,
      default_skill_ids: data.default_skill_ids || [],
    });

    return this.systemLtcNodeRepository.save(node);
  }

  async updateSystemLtcNode(id: string, data: {
    name?: string;
    description?: string;
    order?: number;
    default_skill_ids?: string[];
  }) {
    const node = await this.systemLtcNodeRepository.findOne({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException('System LTC node not found');
    }

    Object.assign(node, data);
    return this.systemLtcNodeRepository.save(node);
  }

  async deleteSystemLtcNode(id: string) {
    const node = await this.systemLtcNodeRepository.findOne({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException('System LTC node not found');
    }

    await this.systemLtcNodeRepository.delete(id);
    return { message: 'System LTC node deleted successfully' };
  }

  async reorderSystemLtcNodes(nodes: Array<{ id: string; order: number }>) {
    for (const node of nodes) {
      await this.systemLtcNodeRepository.update(node.id, {
        order: node.order,
      });
    }

    return this.getSystemLtcNodes();
  }

  // System Role Skill Configuration Management
  async getSystemRoleSkillConfigs() {
    return this.systemRoleSkillConfigRepository.find();
  }

  async updateSystemRoleSkillConfig(role: IronTriangleRole, skillIds: string[]) {
    let config = await this.systemRoleSkillConfigRepository.findOne({
      where: { role },
    });

    if (!config) {
      config = this.systemRoleSkillConfigRepository.create({
        role,
        default_skill_ids: skillIds,
      });
    } else {
      config.default_skill_ids = skillIds;
    }

    return this.systemRoleSkillConfigRepository.save(config);
  }

  // ========== Sync Logic ==========

  async syncToAllTeams(): Promise<SyncResult> {
    const teams = await this.teamRepository.find();
    const results: SyncResult = {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const team of teams) {
      try {
        const teamChanges = await this.syncToTeam(team.id);
        if (teamChanges.hasChanges) {
          results.success++;
          results.details.push({
            teamId: team.id,
            teamName: team.name,
            changes: teamChanges,
          });
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          teamId: team.id,
          teamName: team.name,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncToTeam(teamId: string): Promise<TeamSyncChanges> {
    const changes = {
      ltcNodes: { added: 0, updated: 0, skipped: 0 },
      roleConfigs: { updated: 0, skipped: 0 },
    };

    // 1. Sync LTC nodes (smart merge)
    const systemNodes = await this.systemLtcNodeRepository.find({
      order: { order: 'ASC' },
    });
    const teamNodes = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
    });

    // Create mapping of existing team nodes by system_node_id
    const teamNodeMap = new Map<string, LtcNode>();
    teamNodes.forEach(node => {
      if (node.system_node_id) {
        teamNodeMap.set(node.system_node_id, node);
      }
    });

    for (const systemNode of systemNodes) {
      const existingNode = teamNodeMap.get(systemNode.id);

      if (!existingNode) {
        // Add new system node to team
        await this.ltcNodeRepository.save({
          team_id: teamId,
          name: systemNode.name,
          description: systemNode.description,
          order: systemNode.order,
          source: 'SYSTEM',
          system_node_id: systemNode.id,
        });
        changes.ltcNodes.added++;
      } else if (existingNode.source === 'SYSTEM') {
        // Update existing system node if content changed
        if (
          existingNode.name !== systemNode.name ||
          existingNode.description !== systemNode.description ||
          existingNode.order !== systemNode.order
        ) {
          await this.ltcNodeRepository.update(existingNode.id, {
            name: systemNode.name,
            description: systemNode.description,
            order: systemNode.order,
          });
          changes.ltcNodes.updated++;
        } else {
          changes.ltcNodes.skipped++;
        }
      } else {
        // Skip custom nodes
        changes.ltcNodes.skipped++;
      }
    }

    // 2. Sync role skill configurations
    const systemConfigs = await this.systemRoleSkillConfigRepository.find();

    for (const systemConfig of systemConfigs) {
      const teamConfig = await this.teamRoleSkillConfigRepository.findOne({
        where: { team_id: teamId, role: systemConfig.role },
      });

      if (!teamConfig || teamConfig.source === 'SYSTEM') {
        // Use upsert to handle both insert and update cases
        if (teamConfig) {
          // Update existing system config
          await this.teamRoleSkillConfigRepository.update(teamConfig.id, {
            default_skill_ids: systemConfig.default_skill_ids,
            source: 'SYSTEM',
          });
        } else {
          // Create new system config
          await this.teamRoleSkillConfigRepository.save({
            team_id: teamId,
            role: systemConfig.role,
            default_skill_ids: systemConfig.default_skill_ids,
            source: 'SYSTEM',
          });
        }
        changes.roleConfigs.updated++;
      } else {
        changes.roleConfigs.skipped++;
      }
    }

    // 3. Sync node-skill bindings for system nodes
    const teamNodesAfterSync = await this.ltcNodeRepository.find({
      where: { team_id: teamId },
    });

    for (const systemNode of systemNodes) {
      const teamNode = teamNodesAfterSync.find(
        (tn) => tn.system_node_id === systemNode.id && tn.source === 'SYSTEM'
      );

      if (teamNode) {
        // Delete old bindings
        await this.nodeSkillBindingRepository.delete({
          node_id: teamNode.id,
        });

        // Create new bindings from system config
        let order = 1;
        for (const skillId of systemNode.default_skill_ids) {
          await this.nodeSkillBindingRepository.save({
            node_id: teamNode.id,
            skill_id: skillId,
            order: order++,
          });
        }
      }
    }

    return {
      hasChanges:
        changes.ltcNodes.added > 0 ||
        changes.ltcNodes.updated > 0 ||
        changes.roleConfigs.updated > 0,
      changes,
    };
  }

  // ========== Dashboard Stats for System Admin ==========
  async getDashboardStats(): Promise<DashboardStats> {
    // Get overview stats in parallel
    const [userCount, teamCount, customerCount, interactionCount] = await Promise.all([
      this.userRepository.count(),
      this.teamRepository.count(),
      this.customerRepository.count(),
      this.interactionRepository.count(),
    ]);

    // Get top customers by interaction count
    const topCustomers = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.customer_id', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('COUNT(*)', 'interactionCount')
      .leftJoin('interaction.customer', 'customer')
      .where('interaction.customer_id IS NOT NULL')
      .groupBy('interaction.customer_id, customer.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // Get top teams by interaction count
    const topTeams = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.team_id', 'teamId')
      .addSelect('team.name', 'teamName')
      .addSelect('COUNT(*)', 'interactionCount')
      .leftJoin('interaction.team', 'team')
      .groupBy('interaction.team_id, team.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // Get recent interactions with relations
    const recentInteractions = await this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.customer', 'customer')
      .leftJoinAndSelect('interaction.skill', 'skill')
      .leftJoinAndSelect('interaction.team', 'team')
      .orderBy('interaction.created_at', 'DESC')
      .limit(10)
      .getMany();

    return {
      overview: { userCount, teamCount, customerCount, interactionCount },
      topCustomers: topCustomers.map(c => ({
        customerId: c.customerId,
        customerName: c.customerName || '未知客户',
        interactionCount: parseInt(c.interactionCount as string),
      })),
      topTeams: topTeams.map(t => ({
        teamId: t.teamId,
        teamName: t.teamName || '未知团队',
        interactionCount: parseInt(t.interactionCount as string),
      })),
      recentInteractions,
    };
  }
}
