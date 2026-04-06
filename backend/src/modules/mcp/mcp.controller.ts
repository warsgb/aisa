import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { McpService } from './mcp.service';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { CreateCustomerMcpDto } from './dto/create-customer-mcp.dto';
import { ExecuteSkillMcpDto } from './dto/execute-skill-mcp.dto';
import { UpdateCustomerMcpDto } from './dto/update-customer-mcp.dto';
import { CreateFollowupMcpDto } from './dto/create-followup-mcp.dto';

@Controller('mcp')
@UseGuards(ApiTokenGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('teams')
  async queryTeams(@Query() query: QueryTeamsDto, @Request() req?: any) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }
    return this.mcpService.queryTeams(userId, query.search);
  }

  @Get('teams/:teamId/customers')
  async queryCustomers(
    @Param('teamId') teamId: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }
    return this.mcpService.queryCustomers(userId, teamId, search);
  }

  @Get('customers/:customerId/documents')
  async queryDocuments(
    @Param('customerId') customerId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }
    return this.mcpService.queryDocuments(userId, customerId);
  }

  @Get('documents/:id')
  async getDocument(
    @Param('id') id: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return null;
    }
    return this.mcpService.getDocument(userId, id);
  }

  @Post('teams/:teamId/customers')
  async createCustomer(
    @Param('teamId') teamId: string,
    @Body() dto: CreateCustomerMcpDto,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.mcpService.createCustomerWithAutoResearch(userId, teamId, dto);
  }

  @Post('customers/:customerId/skills/:skillId/execute')
  async executeSkill(
    @Param('customerId') customerId: string,
    @Param('skillId') skillId: string,
    @Body() dto: ExecuteSkillMcpDto,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.mcpService.executeSkillAsync(userId, customerId, skillId, dto);
  }

  @Get('customers/:customerId/skills/:skillId/latest-document')
  async getLatestDocument(
    @Param('customerId') customerId: string,
    @Param('skillId') skillId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return null;
    }
    return this.mcpService.getLatestDocumentByCustomerSkill(userId, customerId, skillId);
  }

  @Get('customers/:customerId/skills/:skillId/interaction-status')
  async getSkillInteractionStatus(
    @Param('customerId') customerId: string,
    @Param('skillId') skillId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return null;
    }
    return this.mcpService.getSkillInteractionStatus(userId, customerId, skillId);
  }

  @Get('teams/:teamId/skills')
  async querySkills(
    @Param('teamId') teamId: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }
    return this.mcpService.querySkills(userId, teamId, search);
  }

  @Get('customers/:customerId/skills')
  async querySkillsForCustomer(
    @Param('customerId') customerId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }
    return this.mcpService.querySkillsForCustomer(userId, customerId);
  }

  @Put('customers/:customerId')
  async updateCustomerProfile(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerMcpDto,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.mcpService.updateCustomerProfile(userId, customerId, dto);
  }

  @Post('customers/:customerId/followups')
  async addFollowup(
    @Param('customerId') customerId: string,
    @Body() dto: CreateFollowupMcpDto,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.mcpService.addFollowup(userId, customerId, dto);
  }

  @Post('customers/:customerId/customer360')
  async generateCustomer360(
    @Param('customerId') customerId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.mcpService.generateCustomer360(userId, customerId);
  }

  @Get('customers/:customerId/customer360')
  async getCustomer360Url(
    @Param('customerId') customerId: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      return { customer_id: customerId, exists: false, preview_url: null };
    }
    return this.mcpService.getCustomer360Url(userId, customerId);
  }
}
