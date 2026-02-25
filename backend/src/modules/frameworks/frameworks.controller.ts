import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FrameworksService } from './frameworks.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('frameworks')
@UseGuards(JwtAuthGuard)
export class FrameworksController {
  constructor(private frameworksService: FrameworksService) {}

  @Get()
  findAll() {
    return this.frameworksService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.frameworksService.findOne(slug);
  }

  @Post()
  create(@Request() req: RequestWithUser, @Body() dto: any) {
    return this.frameworksService.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: any) {
    return this.frameworksService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.frameworksService.remove(id, req.user.id);
  }
}
