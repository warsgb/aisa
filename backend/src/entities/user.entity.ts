import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  full_name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.user)
  team_memberships: TeamMember[];
}
