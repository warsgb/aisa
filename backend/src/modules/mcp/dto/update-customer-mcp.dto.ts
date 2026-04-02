import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateCustomerMcpDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  company_size?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  contact_info?: string; // JSON string

  @IsOptional()
  background_info?: string; // 客户背景资料

  @IsOptional()
  decision_chain?: string; // 决策链

  @IsOptional()
  history_notes?: string; // 历史记录
}
