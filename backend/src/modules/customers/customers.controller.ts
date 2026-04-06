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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerFollowupDto } from './dto/create-customer-followup.dto';
import { UpdateCustomerFollowupDto } from './dto/update-customer-followup.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    team_id?: string;
  };
}

@Controller('teams/:teamId/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  // ─── Customer Followup Endpoints (must be before :id routes) ───────────────────

  @Get(':customerId/followups')
  findFollowups(
    @Param('customerId') customerId: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.customersService.findFollowups(customerId, teamId, req.user.id);
  }

  @Post(':customerId/followups')
  createFollowup(
    @Param('customerId') customerId: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateCustomerFollowupDto,
  ) {
    return this.customersService.createFollowup(customerId, teamId, req.user.id, dto);
  }

  @Put(':customerId/followups/:followupId')
  updateFollowup(
    @Param('followupId') followupId: string,
    @Param('customerId') customerId: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateCustomerFollowupDto,
  ) {
    return this.customersService.updateFollowup(followupId, teamId, req.user.id, dto);
  }

  @Delete(':customerId/followups/:followupId')
  deleteFollowup(
    @Param('followupId') followupId: string,
    @Param('customerId') customerId: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.customersService.deleteFollowup(followupId, teamId, req.user.id);
  }

  // ─── Customer CRUD Endpoints ────────────────────────────────────────────────────

  @Post()
  create(
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(teamId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('teamId') teamId: string, @Request() req: RequestWithUser) {
    return this.customersService.findAll(teamId, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.customersService.findOne(id, teamId, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, teamId, req.user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.customersService.remove(id, teamId, req.user.id);
  }
}
