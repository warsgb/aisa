import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from '../../entities/document.entity';
import { DocumentVersion } from '../../entities/document-version.entity';
import { TeamMember } from '../../entities/team-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentVersion, TeamMember])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
