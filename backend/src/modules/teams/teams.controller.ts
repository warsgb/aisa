import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  Request,
  ValidationPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateTeamRoleSkillsDto, SetTeamDefaultRoleDto } from './dto/update-team-role-skills.dto';
import { TeamRole } from '../../entities/team-member.entity';
import { IronTriangleRole } from '../../entities/team-member-preference.entity';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  create(@Request() req: RequestWithUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teamsService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  inviteMember(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() dto: any,
  ) {
    console.log('[Invite Member] Received raw body:', JSON.stringify(dto));
    return this.teamsService.inviteMember(id, req.user.id, dto.email, dto.role, dto.password, dto.full_name);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: RequestWithUser) {
    return this.teamsService.removeMember(id, req.user.id, memberId);
  }

  @Put(':id/members/:memberId/password')
  updateMemberPassword(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: RequestWithUser,
    @Body('password') password: string,
  ) {
    console.log(`[Password Update] Team: ${id}, Member: ${memberId}, User: ${req.user.id}`);
    return this.teamsService.updateMemberPassword(id, req.user.id, memberId, password);
  }

  @Put(':id/members/:memberId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: RequestWithUser,
    @Body('role') role: TeamRole,
  ) {
    return this.teamsService.updateMemberRole(id, req.user.id, memberId, role);
  }

  // Team Role Skill Configuration endpoints
  @Get(':id/role-skill-configs')
  getRoleSkillConfigs(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teamsService.getRoleSkillConfigs(id, req.user.id);
  }

  @Get(':id/role-skill-configs/:role')
  getRoleSkillConfig(
    @Param('id') id: string,
    @Param('role', new ParseEnumPipe(IronTriangleRole)) role: IronTriangleRole,
    @Request() req: RequestWithUser,
  ) {
    return this.teamsService.getRoleSkillConfig(id, req.user.id, role);
  }

  @Put(':id/role-skill-configs/:role')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  updateRoleSkillConfig(
    @Param('id') id: string,
    @Param('role', new ParseEnumPipe(IronTriangleRole)) role: IronTriangleRole,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateTeamRoleSkillsDto,
  ) {
    return this.teamsService.updateRoleSkillConfig(id, req.user.id, role, dto.skill_ids);
  }

  @Get(':id/default-role')
  getDefaultRole(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teamsService.getDefaultRole(id, req.user.id);
  }

  @Put(':id/default-role')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  setDefaultRole(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() dto: SetTeamDefaultRoleDto,
  ) {
    return this.teamsService.setDefaultRole(id, req.user.id, dto.default_role);
  }

  @Post(':id/role-skill-configs/reset')
  resetRoleSkillConfigs(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.teamsService.resetRoleSkillConfigs(id, req.user.id);
  }
}
