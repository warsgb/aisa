import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { SkillInteraction } from '../../entities/interaction.entity';
import { InteractionMessage } from '../../entities/interaction-message.entity';
import { TeamMember } from '../../entities/team-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SkillInteraction, InteractionMessage, TeamMember])],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
