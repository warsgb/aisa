import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { Team } from '../../entities/team.entity';
import { Customer } from '../../entities/customer.entity';
import { Document } from '../../entities/document.entity';
import { Skill } from '../../entities/skill.entity';
import { User } from '../../entities/user.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { LtcNode } from '../../entities/ltc-node.entity';
import { NodeSkillBinding } from '../../entities/node-skill-binding.entity';
import { CustomersModule } from '../customers/customers.module';
import { LtcModule } from '../ltc/ltc.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, Customer, Document, Skill, User, TeamMember, LtcNode, NodeSkillBinding]),
    CustomersModule,
    LtcModule,
    SkillsModule,
  ],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
