import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;
}
