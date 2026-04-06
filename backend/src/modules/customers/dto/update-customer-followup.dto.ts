import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerFollowupDto } from './create-customer-followup.dto';

export class UpdateCustomerFollowupDto extends PartialType(CreateCustomerFollowupDto) {}
