import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Team } from './team.entity';
import { IronTriangleRole } from './team-member-preference.entity';

@Entity('team_role_skill_configs')
@Unique(['team_id', 'role'])
export class TeamRoleSkillConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column({
    type: 'enum',
    enum: IronTriangleRole,
  })
  role: IronTriangleRole;

  @Column({
    type: 'jsonb',
    default: [],
  })
  default_skill_ids: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'enum', enum: ['SYSTEM', 'CUSTOM'], default: 'CUSTOM' })
  source: 'SYSTEM' | 'CUSTOM';

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
