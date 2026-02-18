import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Param,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReferencesService } from './references.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams/:teamId/references')
@UseGuards(JwtAuthGuard)
export class ReferencesController {
  constructor(private referencesService: ReferencesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const teamId = (req.params as any).teamId;
          const customerId = (req.body as any).customerId;
          const dir = customerId
            ? `/home/presales/aisa/uploads/teams/${teamId}/customers/${customerId}/references`
            : `/home/presales/aisa/uploads/teams/${teamId}/references`;
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadFile(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|docx|text|markdown)/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const customerId = (req.body as any).customerId;
    return this.referencesService.uploadFile(
      teamId,
      customerId,
      req.user.id,
      file,
    );
  }

  @Get()
  findAll(@Param('teamId') teamId: string, @Request() req: RequestWithUser) {
    return this.referencesService.findAll(teamId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.referencesService.findOne(id, teamId, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.referencesService.remove(id, teamId, req.user.id);
  }
}
