import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  document_id: string;

  @Column({ type: 'int' })
  version_number: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'created_by' })
  created_by: string;

  @Column({ type: 'text', nullable: true })
  change_description: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Document, (document) => document.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
