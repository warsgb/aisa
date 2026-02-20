import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TeamMember } from './team-member.entity';
import { Customer } from './customer.entity';
import { SkillInteraction } from './interaction.entity';
import { Document } from './document.entity';
import { ReferenceMaterial } from './reference-material.entity';
import { LtcNode } from './ltc-node.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => TeamMember, (teamMember) => teamMember.team)
  members: TeamMember[];

  @OneToMany(() => Customer, (customer) => customer.team)
  customers: Customer[];

  @OneToMany(() => SkillInteraction, (interaction) => interaction.team)
  interactions: SkillInteraction[];

  @OneToMany(() => Document, (document) => document.team)
  documents: Document[];

  @OneToMany(() => ReferenceMaterial, (ref) => ref.team)
  reference_materials: ReferenceMaterial[];

  @OneToMany(() => LtcNode, (node) => node.team)
  ltc_nodes: LtcNode[];
}
