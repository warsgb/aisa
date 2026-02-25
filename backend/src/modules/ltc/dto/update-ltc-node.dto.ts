import { IsString, MinLength, IsOptional, IsInt } from 'class-validator';

export class UpdateLtcNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
