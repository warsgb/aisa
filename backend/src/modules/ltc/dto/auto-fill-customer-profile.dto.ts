import { IsEnum, IsOptional } from 'class-validator';

export type AutoFillSearchGoal = 'background' | 'decision_chain' | 'cooperation_history' | 'all';

export class AutoFillCustomerProfileDto {
  @IsEnum(['background', 'decision_chain', 'cooperation_history', 'all'])
  searchGoal: AutoFillSearchGoal;
}
