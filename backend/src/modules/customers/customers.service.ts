import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { TeamMember } from '../../entities/team-member.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
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
}
