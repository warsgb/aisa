import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkillsService } from './skills.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

interface SaveSkillBody {
  name: string;
  description: string;
  category?: string;
  usage_hint?: string;
  parameters?: any[];
  supports_multi_turn?: boolean;
  role?: string;
  system_prompt: string;
}

interface ImportSkillBody {
  content: string;
  originalName: string;
  targetFolder?: string;
}

interface UpdateFileBody {
  path: string;
  content: string;
}

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    return this.skillsService.findAll(includeDisabled === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(id);
  }

  @Get(':id/content')
  getSkillContent(@Param('id') id: string) {
    return this.skillsService.getSkillContent(id);
  }

  @Post('sync')
  async syncSkills() {
    return this.skillsService.syncSkills();
  }

  @Post()
  createSkill(@Body() body: SaveSkillBody & { slug: string }) {
    return this.skillsService.createSkill(body);
  }

  @Put(':id')
  saveSkill(@Param('id') id: string, @Body() body: SaveSkillBody) {
    return this.skillsService.saveSkillToFile(id, body);
  }

  @Put(':id/toggle')
  toggleSkill(@Param('id') id: string) {
    return this.skillsService.toggleSkill(id);
  }

  @Delete(':id')
  deleteSkill(@Param('id') id: string) {
    return this.skillsService.deleteSkill(id);
  }

  @Post('import')
  importSkill(@Body() body: ImportSkillBody) {
    return this.skillsService.importSkill(body);
  }

  // 文件上传导入（用于处理 multipart/form-data）
  @Post('import/file')
  @UseInterceptors(FileInterceptor('file'))
  importSkillFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetFolder') targetFolder?: string,
  ) {
    return this.skillsService.importSkill({
      content: file.buffer.toString('utf-8'),
      originalName: file.originalname,
      targetFolder,
    });
  }

  // ZIP文件上传导入
  @Post('import/zip')
  @UseInterceptors(FileInterceptor('file'))
  importSkillFromZip(
    @UploadedFile() file: Express.Multer.File,
    @Body('targetFolder') targetFolder?: string,
  ) {
    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('只支持ZIP文件格式');
    }
    return this.skillsService.importSkillFromZip(file.buffer, targetFolder);
  }

  // 获取技能的所有文件
  @Get(':id/files')
  getSkillFiles(@Param('id') id: string) {
    return this.skillsService.getSkillFiles(id);
  }

  // 获取技能文件内容
  @Get(':id/files/content')
  getSkillFileContent(@Param('id') id: string, @Query('path') filePath: string) {
    if (!filePath) {
      throw new BadRequestException('文件路径不能为空');
    }
    return this.skillsService.getFileContent(id, filePath);
  }

  // 更新技能文件内容
  @Put(':id/files/content')
  updateFileContent(@Param('id') id: string, @Body() body: UpdateFileBody) {
    return this.skillsService.updateFileContent(id, body.path, body.content);
  }

  // 更新技能参数标签
  @Put(':id/parameter-labels')
  updateParameterLabels(@Param('id') id: string, @Body() body: { parameters: any[] }) {
    return this.skillsService.updateParameterLabels(id, body.parameters);
  }
}
