import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SkillInteraction } from './interaction.entity';

export enum MessageRole {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

@Entity('interaction_messages')
export class InteractionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'interaction_id' })
  interaction_id: string;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  turn: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    token_count?: number;
    model?: string;
    finish_reason?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => SkillInteraction, (interaction) => interaction.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interaction_id' })
  interaction: SkillInteraction;
}
