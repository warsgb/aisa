import { IsEmail, IsOptional, IsString } from 'class-validator';
import { TeamRole } from '../../../entities/team-member.entity';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEnum(TeamRole)
  role: TeamRole;
}
