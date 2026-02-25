import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedFramework } from '../../entities/shared-framework.entity';
import { TeamMember, TeamRole } from '../../entities/team-member.entity';

@Injectable()
export class FrameworksService {
  constructor(
    @InjectRepository(SharedFramework)
    private frameworkRepository: Repository<SharedFramework>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async findAll() {
    const frameworks = await this.frameworkRepository.find({
      order: {
        scope: 'ASC',
        name: 'ASC',
      },
    });
    return frameworks;
  }

  async findOne(slug: string) {
    const framework = await this.frameworkRepository.findOne({
      where: { slug },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    return framework;
  }

  async create(userId: string, dto: any) {
    const framework = this.frameworkRepository.create({
      ...dto,
      scope: dto.teamId ? 'team' : 'global',
      team_id: dto.teamId || null,
    });

    return this.frameworkRepository.save(framework);
  }

  async update(id: string, userId: string, dto: any) {
    const framework = await this.frameworkRepository.findOne({
      where: { id },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    // Check permissions
    if (framework.scope === 'team' && framework.team_id) {
      const membership = await this.teamMemberRepository.findOne({
        where: { team_id: framework.team_id, user_id: userId },
      });

      if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
        throw new ForbiddenException('Only team owner or admin can edit team frameworks');
      }
    }

    await this.frameworkRepository.update(id, {
      name: dto.name,
      description: dto.description,
      content: dto.content,
    });

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const framework = await this.frameworkRepository.findOne({
      where: { id },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    // Check permissions
    if (framework.scope === 'team' && framework.team_id) {
      const membership = await this.teamMemberRepository.findOne({
        where: { team_id: framework.team_id, user_id: userId },
      });

      if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
        throw new ForbiddenException('Only team owner or admin can delete team frameworks');
      }
    }

    await this.frameworkRepository.delete(id);
    return { message: 'Framework deleted successfully' };
  }
}
