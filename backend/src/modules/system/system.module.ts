import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { User } from '../../entities/user.entity';
import { Team } from '../../entities/team.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { Document } from '../../entities/document.entity';
import { TeamApplication } from '../../entities/team-application.entity';
import { SystemLtcNode } from '../../entities/system-ltc-node.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';
import { LtcNode } from '../../entities/ltc-node.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User, Team, TeamMember, Customer, Skill, SkillInteraction, Document, TeamApplication,
    SystemLtcNode, SystemRoleSkillConfig, LtcNode, TeamRoleSkillConfig, NodeSkillBinding
  ])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
