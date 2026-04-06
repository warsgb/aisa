import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
