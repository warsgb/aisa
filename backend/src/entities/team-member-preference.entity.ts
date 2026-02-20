import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

export enum IronTriangleRole {
  AR = 'AR',
  SR = 'SR',
  FR = 'FR',
}

@Entity('team_member_preferences')
export class TeamMemberPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_member_id', unique: true })
  team_member_id: string;

  @Column({
    type: 'enum',
    enum: IronTriangleRole,
    nullable: true,
  })
  iron_triangle_role: IronTriangleRole;

  @Column({ type: 'jsonb', nullable: true })
  favorite_skill_ids: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => TeamMember, (teamMember) => teamMember.preference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_member_id' })
  team_member: TeamMember;
}
