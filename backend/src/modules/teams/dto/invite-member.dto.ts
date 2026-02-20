import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TeamRole } from '../../../entities/team-member.entity';
import { Expose, Transform } from 'class-transformer';

export class InviteMemberDto {
  @IsEmail()
  @Expose()
  email: string;

  @IsOptional()
  @IsString()
  @Expose()
  @Transform(({ value }) => value || undefined)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Expose()
  password?: string;

  @IsEnum(TeamRole)
  @Expose()
  role: TeamRole;
}
