import { IsArray, IsEnum, ArrayMaxSize } from 'class-validator';
import { IronTriangleRole } from '../../../entities/team-member-preference.entity';

export class UpdateTeamRoleSkillsDto {
  @IsArray()
  @ArrayMaxSize(100)
  skill_ids: string[];
}

export class SetTeamDefaultRoleDto {
  @IsEnum(IronTriangleRole)
  default_role: IronTriangleRole;
}
