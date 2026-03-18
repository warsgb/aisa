import { IsOptional, IsObject, IsString } from 'class-validator';

export class ExecuteSkillMcpDto {
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  referenceDocumentId?: string;
}
