import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateSystemUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  is_active?: boolean;
}
