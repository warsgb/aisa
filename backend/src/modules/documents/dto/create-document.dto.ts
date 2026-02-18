import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
