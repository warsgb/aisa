import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { IronTriangleRole } from './team-member-preference.entity';

@Entity('system_role_skill_configs')
@Unique(['role'])
export class SystemRoleSkillConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: IronTriangleRole })
  role: IronTriangleRole;

  @Column({ type: 'jsonb', default: [] })
  default_skill_ids: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
