import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LtcController } from './ltc.controller';
import { LtcService } from './ltc.service';
import { LtcNode } from '../../entities/ltc-node.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { TeamMemberPreference } from '../../entities/team-member-preference.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Customer } from '../../entities/customer.entity';
import { Skill } from '../../entities/skill.entity';
import { SystemLtcNode } from '../../entities/system-ltc-node.entity';
import { SystemRoleSkillConfig } from '../../entities/system-role-skill-config.entity';
import { TeamRoleSkillConfig } from '../../entities/team-role-skill-config.entity';
import { AIService } from '../../common/services/ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LtcNode,
      NodeSkillBinding,
      CustomerProfile,
      TeamMemberPreference,
      TeamMember,
      Customer,
      Skill,
      SystemLtcNode,
      SystemRoleSkillConfig,
      TeamRoleSkillConfig,
    ]),
  ],
  controllers: [LtcController],
  providers: [LtcService, AIService],
  exports: [LtcService, AIService],
})
export class LtcModule {}
