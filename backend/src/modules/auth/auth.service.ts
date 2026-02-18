import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { TeamMember, TeamRole } from '../../entities/team-member.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const password_hash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      password_hash,
      full_name: dto.full_name,
      role: UserRole.MEMBER,
      is_active: true,
    });
    await this.userRepository.save(user);

    // Create team if provided
    let team: Team | null = null;
    if (dto.team_name) {
      team = this.teamRepository.create({
        name: dto.team_name,
      });
      await this.teamRepository.save(team);

      // Add user as team owner
      const teamMember = this.teamMemberRepository.create({
        team_id: team.id,
        user_id: user.id,
        role: TeamRole.OWNER,
      });
      await this.teamMemberRepository.save(teamMember);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, team?.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      team: team
        ? {
            id: team.id,
            name: team.name,
          }
        : null,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Get user's first team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: user.id },
      relations: ['team'],
    });

    const tokens = await this.generateTokens(user.id, teamMember?.team_id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      team: teamMember?.team
        ? {
            id: teamMember.team.id,
            name: teamMember.team.name,
          }
        : null,
      ...tokens,
    };
  }

  async refreshToken(refresh_token: string) {
    try {
      const payload = this.jwtService.verify(refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user || !user.is_active) {
        throw new UnauthorizedException('Invalid token');
      }

      const teamMember = await this.teamMemberRepository.findOne({
        where: { user_id: user.id },
        relations: ['team'],
      });

      const tokens = await this.generateTokens(user.id, teamMember?.team_id);

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        team: teamMember?.team
        ? {
            id: teamMember.team.id,
            name: teamMember.team.name,
          }
        : null,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Get user's first team
    const teamMember = await this.teamMemberRepository.findOne({
      where: { user_id: user.id },
      relations: ['team'],
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      team: teamMember?.team
        ? {
            id: teamMember.team.id,
            name: teamMember.team.name,
            description: teamMember.team.description,
            logo_url: teamMember.team.logo_url,
            role: teamMember.role,
          }
        : null,
    };
  }

  private async generateTokens(userId: string, teamId?: string) {
    const payload = { sub: userId, team_id: teamId };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production-aisa-2026',
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
  }
}
