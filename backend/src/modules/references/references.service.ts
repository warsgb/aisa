import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceMaterial, MaterialType } from '../../entities/reference-material.entity';
import { TeamMember } from '../../entities/team-member.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';

// pdf-parse is a CommonJS module, need to use require
const pdfParse: any = require('pdf-parse');

@Injectable()
export class ReferencesService {
  private readonly logger = new Logger(ReferencesService.name);

  constructor(
    @InjectRepository(ReferenceMaterial)
    private referenceRepository: Repository<ReferenceMaterial>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  private async verifyTeamAccess(teamId: string, userId: string): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }
  }

  async uploadFile(
    teamId: string,
    customerId: string | undefined,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    // Extract file extension and determine type
    const ext = path.extname(file.originalname).toLowerCase();
    let materialType: MaterialType;

    switch (ext) {
      case '.pdf':
        materialType = MaterialType.PDF;
        break;
      case '.docx':
        materialType = MaterialType.DOCX;
        break;
      case '.txt':
        materialType = MaterialType.TXT;
        break;
      case '.md':
        materialType = MaterialType.MD;
        break;
      default:
        materialType = MaterialType.OTHER;
    }

    // Extract text content
    let extractedText: string | null = null;
    try {
      extractedText = await this.extractText(file.path, materialType);
    } catch (error) {
      this.logger.warn(`Failed to extract text from ${file.originalname}:`, error);
    }

    const material = this.referenceRepository.create();
    material.team_id = teamId;
    material.customer_id = customerId || null;
    material.filename = file.filename;
    material.original_filename = file.originalname;
    material.file_size = file.size;
    material.file_type = materialType;
    material.file_path = file.path;
    material.extracted_text = extractedText;

    return this.referenceRepository.save(material);
  }

  async findAll(teamId: string, userId: string, customerId?: string) {
    await this.verifyTeamAccess(teamId, userId);

    const where: any = { team_id: teamId };
    if (customerId) {
      where.customer_id = customerId;
    }

    const materials = await this.referenceRepository.find({
      where,
      relations: ['customer'],
      order: { created_at: 'DESC' },
    });

    return materials;
  }

  async findOne(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const material = await this.referenceRepository.findOne({
      where: { id, team_id: teamId },
      relations: ['customer'],
    });

    if (!material) {
      throw new NotFoundException('Reference material not found');
    }

    return material;
  }

  async remove(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const material = await this.referenceRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!material) {
      throw new NotFoundException('Reference material not found');
    }

    // Delete file from filesystem
    try {
      if (fs.existsSync(material.file_path)) {
        fs.unlinkSync(material.file_path);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file ${material.file_path}:`, error);
    }

    await this.referenceRepository.delete(id);
    return { message: 'Reference material deleted successfully' };
  }

  private async extractText(filePath: string, fileType: MaterialType): Promise<string | null> {
    try {
      switch (fileType) {
        case MaterialType.TXT:
        case MaterialType.MD:
          return fs.readFileSync(filePath, 'utf-8');

        case MaterialType.PDF: {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData: any = await pdfParse(dataBuffer);
          return pdfData.text;
        }

        case MaterialType.DOCX: {
          const docxBuffer = fs.readFileSync(filePath);
          const docxResult: any = await mammoth.extractRawText({ buffer: docxBuffer });
          return docxResult.value;
        }

        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Error extracting text from ${filePath}:`, error);
      return null;
    }
  }
}
