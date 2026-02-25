import { IsString, MinLength, IsOptional, IsObject } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  name: string;

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
  @IsObject()
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
