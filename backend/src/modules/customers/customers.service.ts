import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CustomerFollowup } from '../../entities/customer-followup.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerFollowupDto } from './dto/create-customer-followup.dto';
import { UpdateCustomerFollowupDto } from './dto/update-customer-followup.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerFollowup)
    private followupRepository: Repository<CustomerFollowup>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  private async verifyTeamAccess(teamId: string, userId: string): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this team');
    }
  }

  async create(teamId: string, userId: string, dto: CreateCustomerDto) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = this.customerRepository.create({
      team_id: teamId,
      ...dto,
    });
    return this.customerRepository.save(customer);
  }

  async findAll(teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const customers = await this.customerRepository.find({
      where: { team_id: teamId },
      order: { updated_at: 'DESC' },
    });

    return customers;
  }

  async findOne(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id, team_id: teamId },
      relations: ['interactions', 'documents', 'reference_materials'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, teamId: string, userId: string, dto: UpdateCustomerDto) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.customerRepository.update(id, dto);
    return this.findOne(id, teamId, userId);
  }

  async remove(id: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const customer = await this.customerRepository.findOne({
      where: { id, team_id: teamId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.customerRepository.delete(id);
    return { message: 'Customer deleted successfully' };
  }

  // ─── Customer Followup Methods ──────────────────────────────────────────────

  private async verifyCustomerOwnership(customerId: string, teamId: string) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, team_id: teamId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  async findFollowups(customerId: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);
    await this.verifyCustomerOwnership(customerId, teamId);

    return this.followupRepository.find({
      where: { customer_id: customerId, team_id: teamId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async createFollowup(
    customerId: string,
    teamId: string,
    userId: string,
    dto: CreateCustomerFollowupDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);
    await this.verifyCustomerOwnership(customerId, teamId);

    const followup = this.followupRepository.create({
      team_id: teamId,
      customer_id: customerId,
      user_id: userId,
      content: dto.content,
    });
    return this.followupRepository.save(followup);
  }

  async updateFollowup(
    followupId: string,
    teamId: string,
    userId: string,
    dto: UpdateCustomerFollowupDto,
  ) {
    await this.verifyTeamAccess(teamId, userId);

    const followup = await this.followupRepository.findOne({
      where: { id: followupId, team_id: teamId },
    });

    if (!followup) {
      throw new NotFoundException('Followup not found');
    }

    if (dto.content !== undefined) {
      followup.content = dto.content;
    }
    return this.followupRepository.save(followup);
  }

  async deleteFollowup(followupId: string, teamId: string, userId: string) {
    await this.verifyTeamAccess(teamId, userId);

    const followup = await this.followupRepository.findOne({
      where: { id: followupId, team_id: teamId },
    });

    if (!followup) {
      throw new NotFoundException('Followup not found');
    }

    await this.followupRepository.delete(followupId);
    return { message: 'Followup deleted successfully' };
  }
}
