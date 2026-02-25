import { IsString, MinLength, IsOptional, IsInt } from 'class-validator';

export class CreateLtcNodeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
