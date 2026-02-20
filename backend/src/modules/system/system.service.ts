import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { TeamMember, TeamRole } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { Document } from '../../entities/document.entity';
import { TeamApplication } from '../../entities/team-application.entity';

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalTeamMembers: number;
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
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(TeamApplication)
    private teamApplicationRepository: Repository<TeamApplication>,
  ) {}

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

  async getAllInteractions(page: number = 1, pageSize: number = 20, search?: string) {
    const query = this.interactionRepository.createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.team', 'team')
      .leftJoinAndSelect('interaction.skill', 'skill')
      .leftJoinAndSelect('interaction.customer', 'customer');

    if (search) {
      query.where('customer.name ILIKE :search', { search: `%${search}%` });
    }

    const [interactions, total] = await query
      .orderBy('interaction.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: interactions.map(i => ({
        id: i.id,
        team_id: i.team_id,
        team_name: i.team?.name,
        skill_id: i.skill_id,
        skill_name: i.skill?.name,
        customer_id: i.customer_id,
        customer_name: i.customer?.name,
        status: i.status,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })),
      total,
      page,
      pageSize,
    };
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

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
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
}
