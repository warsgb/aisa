import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Customer } from './customer.entity';

export enum MaterialType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  MD = 'MD',
  OTHER = 'OTHER',
}

@Entity('reference_materials')
export class ReferenceMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column({ name: 'customer_id', nullable: true })
  customer_id: string | null;

  @Column()
  filename: string;

  @Column()
  original_filename: string;

  @Column({ type: 'integer' })
  file_size: number;

  @Column({
    type: 'enum',
    enum: MaterialType,
  })
  file_type: MaterialType;

  @Column()
  file_path: string;

  @Column({ type: 'text', nullable: true })
  extracted_text: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.reference_materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Customer, (customer) => customer.reference_materials, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
