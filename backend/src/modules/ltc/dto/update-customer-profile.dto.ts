import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  background_info?: string;

  @IsOptional()
  @IsString()
  decision_chain?: string;

  @IsOptional()
  @IsString()
  history_notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
