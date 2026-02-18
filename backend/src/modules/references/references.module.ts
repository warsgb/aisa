import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { ReferenceMaterial } from '../../entities/reference-material.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferenceMaterial, TeamMember]),
    MulterModule.register({
      dest: '/home/presales/aisa/uploads',
    }),
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
