import { IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class CreateSystemLtcNodeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  default_skill_ids?: string[];
}
