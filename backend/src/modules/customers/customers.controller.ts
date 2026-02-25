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
