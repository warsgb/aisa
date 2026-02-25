import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Request, Response } from 'express';
import type { Response as ResponseType } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams/:teamId/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  private extractUserId(req: RequestWithUser): string {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error('User not authenticated: req.user is ' +
        JSON.stringify(req.user) + '. Please check your JWT token.');
    }

    return userId;
  }

  @Post()
  create(@Param('teamId') teamId: string, @Req() req: RequestWithUser, @Body() dto: CreateDocumentDto) {
    const userId = this.extractUserId(req);
    return this.documentsService.create(teamId, userId, dto);
  }

  @Get()
  findAll(@Param('teamId') teamId: string, @Req() req: RequestWithUser, @Query('customerId') customerId?: string) {
    const userId = this.extractUserId(req);
    return this.documentsService.findAll(teamId, userId, customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser) {
    const userId = this.extractUserId(req);
    return this.documentsService.findOne(id, teamId, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser, @Body() dto: UpdateDocumentDto) {
    const userId = this.extractUserId(req);
    return this.documentsService.update(id, teamId, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser) {
    const userId = this.extractUserId(req);
    return this.documentsService.remove(id, teamId, userId);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser) {
    const userId = this.extractUserId(req);
    return this.documentsService.getVersions(id, teamId, userId);
  }

  @Get(':id/versions/:versionId')
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser) {
    const userId = this.extractUserId(req);
    return this.documentsService.getVersion(id, versionId, teamId, userId);
  }

  @Get(':id/export')
  async exportDocument(@Param('id') id: string, @Param('teamId') teamId: string, @Req() req: RequestWithUser, @Res() res: ResponseType, @Query('format') format: string = 'markdown') {
    const userId = this.extractUserId(req);
    const { file, filename } = await this.documentsService.exportDocument(id, teamId, userId, format);

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      markdown: 'text/markdown',
      pdf: 'application/pdf',
      txt: 'text/plain',
    };

    const ext = format === 'pdf' ? 'pdf' : format === 'txt' ? 'txt' : 'md';

    res.setHeader('Content-Type', contentTypes[format] || 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
    res.send(file);
  }
}
