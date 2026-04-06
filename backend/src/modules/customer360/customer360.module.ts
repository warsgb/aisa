import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer360Controller } from './customer360.controller';
import { Customer360Service } from './customer360.service';
import { Customer } from '../../entities/customer.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import { Document } from '../../entities/document.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { Skill } from '../../entities/skill.entity';
import { AIService } from '../../common/services/ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerProfile, CustomerFollowup, Document, SkillInteraction, Skill])],
  controllers: [Customer360Controller],
  providers: [Customer360Service, AIService],
  exports: [Customer360Service],
})
export class Customer360Module {}
