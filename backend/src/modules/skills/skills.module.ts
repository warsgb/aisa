import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillLoaderService } from './skill-loader.service';
import { SkillExecutorService } from './skill-executor.service';
import { StreamingGateway } from './streaming.gateway';
import { AIService } from '../../common/services/ai.service';
import { SearchService } from '../../common/services/search.service';
import { Skill } from '../../entities/skill.entity';
import { SkillInteraction } from '../../entities/interaction.entity';
import { InteractionMessage } from '../../entities/interaction-message.entity';
import { Customer } from '../../entities/customer.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import { ReferenceMaterial } from '../../entities/reference-material.entity';
import { SharedFramework } from '../../entities/shared-framework.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { Document } from '../../entities/document.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Skill,
      SkillInteraction,
      InteractionMessage,
      Customer,
      CustomerProfile,
      CustomerFollowup,
      ReferenceMaterial,
      SharedFramework,
      TeamMember,
      Document,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    AuthModule,
  ],
  controllers: [SkillsController],
  providers: [
    SkillsService,
    SkillLoaderService,
    SkillExecutorService,
    StreamingGateway,
    AIService,
    SearchService,
  ],
  exports: [
    SkillsService,
    SkillLoaderService,
    SkillExecutorService,
    AIService,
    SearchService,
  ],
})
export class SkillsModule implements OnModuleInit {
  constructor(private skillLoaderService: SkillLoaderService) {}

  async onModuleInit() {
    // Sync skills to database on module init
    await this.skillLoaderService.syncSkillsToDatabase();
  }
}
