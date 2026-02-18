import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from '../../entities/team-member.entity';

@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const teamId = request.params.teamId || request.body.teamId;
    const userId = request.user?.id;

    if (!teamId || !userId) {
      throw new ForbiddenException('Team ID and User ID are required');
    }

    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }

    // Attach team info to request for later use
    request.team = { id: teamId, role: membership.role };
    return true;
  }
}
