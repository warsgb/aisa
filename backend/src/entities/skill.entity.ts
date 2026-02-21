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

  // 文件管理字段
  @Column({ type: 'varchar', default: 'file' })
  source: 'file' | 'database';

  @Column({ type: 'varchar', nullable: true })
  file_path: string | null;

  @Column({ default: true })
  is_enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_synced_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
