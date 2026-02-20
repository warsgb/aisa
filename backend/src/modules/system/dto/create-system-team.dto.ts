import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSystemTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsUUID()
  owner_id: string;
}
