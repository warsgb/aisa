import { IsArray, IsString, IsEnum } from 'class-validator';
import { IronTriangleRole } from '../../../entities/team-member-preference.entity';

export class UpdateSystemRoleSkillConfigDto {
  @IsArray()
  @IsString({ each: true })
  skill_ids: string[];
}
