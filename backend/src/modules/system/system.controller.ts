import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemService, SystemStats } from './system.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { CreateSystemTeamDto } from './dto/create-system-team.dto';
import { SubmitTeamApplicationDto } from './dto/submit-team-application.dto';
import { ReviewTeamApplicationDto } from './dto/review-team-application.dto';

@Controller('system')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class SystemController {
  constructor(private systemService: SystemService) {}

  // User Management Endpoints
  @Get('users')
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllUsers(page, pageSize, search);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.systemService.getUserById(id);
  }

  @Post('users')
  async createUser(@Body() dto: CreateSystemUserDto) {
    return this.systemService.createUser(dto);
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.systemService.updateUserStatus(id, dto.is_active);
  }

  @Post('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.systemService.resetUserPassword(id, dto.new_password);
  }

  // Team Management Endpoints
  @Get('teams')
  async getAllTeams(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllTeams(page, pageSize, search);
  }

  @Get('teams/:id/members')
  async getTeamMembers(@Param('id') teamId: string) {
    return this.systemService.getTeamMembers(teamId);
  }

  @Delete('teams/:id')
  async deleteTeam(@Param('id') id: string) {
    return this.systemService.deleteTeam(id);
  }

  @Post('teams')
  async createTeam(@Body() dto: CreateSystemTeamDto) {
    return this.systemService.createTeam(dto);
  }

  // Team Application Endpoints
  @Post('team-applications')
  @UseGuards(JwtAuthGuard)
  async submitTeamApplication(
    @Body() dto: SubmitTeamApplicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.systemService.submitTeamApplication(req.user.id, dto);
  }

  @Get('team-applications')
  async getTeamApplications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    return this.systemService.getTeamApplications(page, pageSize, status);
  }

  @Get('team-applications/my')
  @UseGuards(JwtAuthGuard)
  async getMyTeamApplications(@Request() req: { user: { id: string } }) {
    return this.systemService.getUserTeamApplications(req.user.id);
  }

  @Put('team-applications/:id/review')
  async reviewTeamApplication(
    @Param('id') id: string,
    @Body() dto: ReviewTeamApplicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.systemService.reviewTeamApplication(id, req.user.id, {
      status: dto.status,
      rejectionReason: dto.rejectionReason,
    });
  }

  // System Monitoring Endpoints
  @Get('stats')
  async getSystemStats(): Promise<SystemStats> {
    return this.systemService.getSystemStats();
  }

  // System-wide data endpoints for admin
  @Get('customers')
  async getAllCustomers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllCustomers(page, pageSize, search);
  }

  @Get('skills')
  async getAllSkills(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllSkills(page, pageSize, search);
  }

  @Get('interactions')
  async getAllInteractions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllInteractions(page, pageSize, search);
  }

  @Get('documents')
  async getAllDocuments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.systemService.getAllDocuments(page, pageSize, search);
  }
}
