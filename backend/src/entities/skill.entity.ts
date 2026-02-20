import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IronTriangleRole } from './team-member-preference.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  usage_hint: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: any[];

  @Column({ type: 'text' })
  system_prompt: string;

  @Column({ default: true })
  supports_streaming: boolean;

  @Column({ default: false })
  supports_multi_turn: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({
    type: 'enum',
    enum: IronTriangleRole,
    nullable: true,
  })
  iron_triangle_role: IronTriangleRole | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
