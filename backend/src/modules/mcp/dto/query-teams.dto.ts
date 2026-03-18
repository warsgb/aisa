import { IsOptional, IsString } from 'class-validator';

export class QueryTeamsDto {
  @IsOptional()
  @IsString()
  search?: string;
}
