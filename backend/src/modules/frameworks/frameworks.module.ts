import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';
import { SharedFramework } from '../../entities/shared-framework.entity';
import { TeamMember } from '../../entities/team-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharedFramework, TeamMember])],
  controllers: [FrameworksController],
  providers: [FrameworksService],
  exports: [FrameworksService],
})
export class FrameworksModule {}
