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
import { LtcService } from './ltc.service';
import { CreateLtcNodeDto } from './dto/create-ltc-node.dto';
import { UpdateLtcNodeDto } from './dto/update-ltc-node.dto';
import { ReorderLtcNodesDto } from './dto/reorder-ltc-nodes.dto';
import { CreateNodeSkillBindingDto } from './dto/create-node-skill-binding.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { UpdateTeamMemberPreferenceDto } from './dto/update-team-member-preference.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams/:teamId')
@UseGuards(JwtAuthGuard)
export class LtcController {
  constructor(private ltcService: LtcService) {}

  // Home Page Aggregate Data
  @Get('home')
  getHomeData(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.getHomeData(teamId, req.user.id);
  }

  // LTC Node Management
  @Get('ltc-nodes')
  findAllNodes(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.findAllNodes(teamId, req.user.id);
  }

  @Post('ltc-nodes')
  createNode(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateLtcNodeDto,
  ) {
    return this.ltcService.createNode(teamId, req.user.id, dto);
  }

  @Put('ltc-nodes/:id')
  updateNode(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateLtcNodeDto,
  ) {
    return this.ltcService.updateNode(teamId, id, req.user.id, dto);
  }

  @Delete('ltc-nodes/:id')
  deleteNode(
    @Param('teamId') teamId: string,
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.deleteNode(teamId, id, req.user.id);
  }

  @Put('ltc-nodes/reorder')
  reorderNodes(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: ReorderLtcNodesDto,
  ) {
    return this.ltcService.reorderNodes(teamId, req.user.id, dto.node_ids);
  }

  @Post('ltc-nodes/reset')
  resetToDefault(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.resetToDefault(teamId, req.user.id);
  }

  // Node-Skill Binding Management
  @Get('ltc-nodes/:nodeId/bindings')
  findBindings(
    @Param('teamId') teamId: string,
    @Param('nodeId') nodeId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.findBindings(teamId, nodeId, req.user.id);
  }

  @Post('ltc-nodes/:nodeId/bindings')
  createBinding(
    @Param('teamId') teamId: string,
    @Param('nodeId') nodeId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateNodeSkillBindingDto,
  ) {
    return this.ltcService.createBinding(teamId, nodeId, req.user.id, dto);
  }

  @Delete('ltc-nodes/:nodeId/bindings/:bindingId')
  deleteBinding(
    @Param('teamId') teamId: string,
    @Param('nodeId') nodeId: string,
    @Param('bindingId') bindingId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.deleteBinding(teamId, nodeId, bindingId, req.user.id);
  }

  // Customer Profile Management
  @Get('customers/:customerId/profile')
  findCustomerProfile(
    @Param('teamId') teamId: string,
    @Param('customerId') customerId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.findCustomerProfile(teamId, customerId, req.user.id);
  }

  @Put('customers/:customerId/profile')
  updateCustomerProfile(
    @Param('teamId') teamId: string,
    @Param('customerId') customerId: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.ltcService.updateCustomerProfile(
      teamId,
      customerId,
      req.user.id,
      dto,
    );
  }

  // Team Member Preference Management
  @Get('members/:memberId/preference')
  findTeamMemberPreference(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.ltcService.findTeamMemberPreference(
      teamId,
      memberId,
      req.user.id,
    );
  }

  @Put('members/:memberId/preference')
  updateTeamMemberPreference(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateTeamMemberPreferenceDto,
  ) {
    return this.ltcService.updateTeamMemberPreference(
      teamId,
      memberId,
      req.user.id,
      dto,
    );
  }
}
