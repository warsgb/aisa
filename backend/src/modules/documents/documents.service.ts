import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities/document.entity';
import { DocumentVersion } from '../../entities/document-version.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private documentVersionRepository: Repository<DocumentVersion>,
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

  async create(teamId: string, userId: string, dto: CreateDocumentDto) {
    await this.verifyTeamAccess(teamId, userId);

    const document = this.documentRepository.create({
      team_id: teamId,
      ...dto,
    });
    const savedDoc = await this.documentRepository.save(document);

    // Create initial version
    await this.createVersion(savedDoc.id, dto.content, userId, 'Initial version');

    return this.findOne(savedDoc.id, teamId, userId);
  }

  async findAll(teamId: string, userId: string, customerId?: string) {
    this.logger.log(`Finding documents for team: ${teamId}, user: ${userId}, customer: ${customerId || 'all'}`);

    try {
      await this.verifyTeamAccess(teamId, userId);

      const where: any = { team_id: teamId };
      if (customerId) {
        where.customer_id = customerId;
      }

      const documents = await this.documentRepository.find({
        where,
        relations: ['customer', 'interaction'],
        order: { updated_at: 'DESC' },
      });

      this.logger.log(`Found ${documents.length} documents for team ${teamId}`);
      return documents;
    } catch (error) {
      this.logger.error(`Error in findAll for team ${teamId}:`, error);
      throw error;
    }
  }

  async findOne(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
      relations: ['customer', 'interaction', 'versions'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(id: string, teamId: string, userId: string, dto: UpdateDocumentDto) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Create version before updating if content changed
    if (dto.content && dto.content !== document.content) {
      await this.createVersion(
        id,
        document.content,
        userId,
        dto.change_description || 'Content updated',
      );
    }

    await this.documentRepository.update(id, {
      title: dto.title,
      content: dto.content,
      format: dto.format,
      metadata: dto.metadata,
    });

    return this.findOne(id, teamId, userId);
  }

  async remove(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.documentRepository.delete(id);
    return { message: 'Document deleted successfully' };
  }

  async getVersions(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const versions = await this.documentVersionRepository.find({
      where: { document_id: id },
      order: { version_number: 'DESC' },
    });

    return versions;
  }

  async getVersion(id: string, versionId: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const version = await this.documentVersionRepository.findOne({
      where: { id: versionId, document_id: id },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  private async createVersion(
    documentId: string,
    content: string,
    userId: string,
    changeDescription?: string,
  ): Promise<DocumentVersion> {
    // Get current version count
    const count = await this.documentVersionRepository.count({
      where: { document_id: documentId },
    });

    const version = this.documentVersionRepository.create({
      document_id: documentId,
      version_number: count + 1,
      content,
      created_by: userId,
      change_description: changeDescription,
    });

    return await this.documentVersionRepository.save(version);
  }

  async exportDocument(id: string, teamId: string, userId: string, format: string) {
    await this.verifyTeamAccess(teamId, userId);

    const document = await this.documentRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    let content = document.content;
    let filename = document.title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-');

    if (format === 'txt') {
      // Convert markdown to plain text
      content = content
        .replace(/^#{1,6}\s+/gm, '') // Remove headers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove code
        .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
    } else if (format === 'pdf') {
      // For PDF, we would need a PDF library like jsPDF or puppeteer
      // For now, just log warning and return markdown
      this.logger.warn('PDF export not fully implemented, returning markdown format');
    }

    return {
      file: content,
      filename,
    };
  }
}
