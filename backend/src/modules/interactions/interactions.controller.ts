import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InteractionsService } from './interactions.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams/:teamId/interactions')
@UseGuards(JwtAuthGuard)
export class InteractionsController {
  constructor(private interactionsService: InteractionsService) {}

  @Get()
  findAll(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Query('customerId') customerId?: string,
    @Query('skillId') skillId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.interactionsService.findAll(teamId, req.user.id, {
      customerId,
      skillId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.interactionsService.findOne(id, teamId, req.user.id);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.interactionsService.getMessages(id, teamId, req.user.id);
  }

  @Put(':id/messages/:messageId')
  updateMessage(
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() body: { content: string },
  ) {
    return this.interactionsService.updateMessage(id, messageId, teamId, req.user.id, body.content);
  }
}
