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
import { SkillInteraction } from './interaction.entity';
import { Document } from './document.entity';
import { ReferenceMaterial } from './reference-material.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  company_size: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  contact_info: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @OneToMany(() => SkillInteraction, (interaction) => interaction.customer)
  interactions: SkillInteraction[];

  @OneToMany(() => Document, (document) => document.customer)
  documents: Document[];

  @OneToMany(() => ReferenceMaterial, (ref) => ref.customer)
  reference_materials: ReferenceMaterial[];
}
