import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Team } from './team.entity';
import { Customer } from './customer.entity';
import { Skill } from './skill.entity';
import { InteractionMessage } from './interaction-message.entity';

export enum InteractionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('skill_interactions')
export class SkillInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column({ name: 'customer_id', nullable: true })
  customer_id: string;

  @Column({ name: 'skill_id' })
  skill_id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: InteractionStatus,
    default: InteractionStatus.PENDING,
  })
  status: InteractionStatus;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ name: 'node_id', nullable: true })
  node_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.interactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Customer, (customer) => customer.interactions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @OneToMany(() => InteractionMessage, (message) => message.interaction, { cascade: true })
  messages: InteractionMessage[];
}
