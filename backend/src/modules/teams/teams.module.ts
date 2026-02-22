import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { Team } from '../../entities/team.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { User } from '../../entities/user.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, User, TeamRoleSkillConfig, SystemRoleSkillConfig])],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
