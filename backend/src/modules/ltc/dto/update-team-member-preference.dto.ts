import { IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { IronTriangleRole } from '../../../entities/team-member-preference.entity';

export class UpdateTeamMemberPreferenceDto {
  @IsOptional()
  @IsEnum(IronTriangleRole)
  iron_triangle_role?: IronTriangleRole;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  favorite_skill_ids?: string[];
}
