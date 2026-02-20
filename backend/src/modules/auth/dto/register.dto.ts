import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @MinLength(2)
  full_name: string;

  @IsString()
  @IsNotEmpty()
  team_name: string;
}
