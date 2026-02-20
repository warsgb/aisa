import { IsUUID, IsOptional, IsInt } from 'class-validator';

export class CreateNodeSkillBindingDto {
  @IsUUID()
  skill_id: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
