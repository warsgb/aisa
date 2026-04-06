import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from '../../entities/customer.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import { TeamMember } from '../../entities/team-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerFollowup, TeamMember])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
