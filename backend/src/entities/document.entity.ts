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
import { SkillInteraction } from './interaction.entity';
import { DocumentVersion } from './document-version.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column({ name: 'customer_id', nullable: true })
  customer_id: string;

  @Column({ name: 'interaction_id', nullable: true })
  interaction_id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'markdown' })
  format: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => Customer, (customer) => customer.documents, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => SkillInteraction, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'interaction_id' })
  interaction: SkillInteraction;

  @OneToMany(() => DocumentVersion, (version) => version.document, { cascade: true })
  versions: DocumentVersion[];
}
