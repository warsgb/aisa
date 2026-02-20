import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Team } from '../../entities/team.entity';
import { TeamMember, TeamRole } from '../../entities/team-member.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateTeamDto) {
    const team = this.teamRepository.create(dto);
    await this.teamRepository.save(team);

    // Add creator as owner
    const teamMember = this.teamMemberRepository.create({
      team_id: team.id,
      user_id: userId,
      role: TeamRole.OWNER,
    });
    await this.teamMemberRepository.save(teamMember);

    return this.findOne(team.id, userId);
  }

  async findAll(userId: string) {
    const teamMembers = await this.teamMemberRepository.find({
      where: { user_id: userId },
      relations: ['team'],
    });

    return teamMembers.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      description: tm.team.description,
      logo_url: tm.team.logo_url,
      role: tm.role,
      created_at: tm.team.created_at,
    }));
  }

  async findOne(teamId: string, userId: string) {
    // Check if user is a member
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
      relations: ['team'],
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }

    const members = await this.teamMemberRepository.find({
      where: { team_id: teamId },
      relations: ['user'],
    });

    return {
      ...membership.team,
      role: membership.role,
      members: members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        full_name: m.user.full_name,
        role: m.role,
        joined_at: m.joined_at,
      })),
    };
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    // Check if user is owner or admin
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can update team');
    }

    await this.teamRepository.update(teamId, dto);
    return this.findOne(teamId, userId);
  }

  async remove(teamId: string, userId: string) {
    // Check if user is owner
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || membership.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Only owner can delete team');
    }

    await this.teamRepository.delete(teamId);
    return { message: 'Team deleted successfully' };
  }

  async inviteMember(teamId: string, userId: string, email: string, role: TeamRole, password?: string, full_name?: string) {
    // Check if user is owner or admin
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can invite members');
    }

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // User doesn't exist
      if (password) {
        // Create user with provided password and name
        const password_hash = await bcrypt.hash(password, 10);
        user = this.userRepository.create({
          email,
          password_hash,
          full_name: full_name || email.split('@')[0], // 使用提供的名字或临时名字
          role: UserRole.MEMBER,
          is_active: true,
        });
        await this.userRepository.save(user);
      } else {
        // No password provided, ask user to register first
        throw new NotFoundException('User not found. Please register first.');
      }
    } else if (password) {
      // User exists and password provided, update password
      const password_hash = await bcrypt.hash(password, 10);
      user.password_hash = password_hash;
      await this.userRepository.save(user);
    }

    // Check if already a member
    const existingMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: user.id },
    });

    if (existingMember) {
      throw new ForbiddenException('User is already a member of this team');
    }

    // Add member
    const teamMember = this.teamMemberRepository.create({
      team_id: teamId,
      user_id: user.id,
      role,
    });

    await this.teamMemberRepository.save(teamMember);

    return {
      message: 'Member added successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role,
      },
    };
  }

  async removeMember(teamId: string, userId: string, memberId: string) {
    // Check if user is owner or admin
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can remove members');
    }

    // Cannot remove owner
    const targetMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: memberId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    if (targetMember.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot remove team owner');
    }

    await this.teamMemberRepository.delete({
      team_id: teamId,
      user_id: memberId,
    });

    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(teamId: string, userId: string, memberId: string, role: TeamRole) {
    // Check if user is owner
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || membership.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Only owner can update member roles');
    }

    const targetMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: memberId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (targetMember.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }

    await this.teamMemberRepository.update(
      { team_id: teamId, user_id: memberId },
      { role }
    );

    return { message: 'Member role updated successfully' };
  }

  async updateMemberPassword(teamId: string, userId: string, memberId: string, password: string) {
    // Check if user is owner or admin
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('Only owner or admin can update member passwords');
    }

    // Check if target member exists
    const targetMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: memberId },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Update user password
    const password_hash = await bcrypt.hash(password, 10);
    await this.userRepository.update(memberId, { password_hash });

    return { message: 'Member password updated successfully' };
  }
}
