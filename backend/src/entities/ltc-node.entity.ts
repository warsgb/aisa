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
import { NodeSkillBinding } from './node-skill-binding.entity';

@Entity('ltc_nodes')
export class LtcNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id' })
  team_id: string;

  @Column()
  name: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.ltc_nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @OneToMany(() => NodeSkillBinding, (binding) => binding.node, { cascade: true })
  skill_bindings: NodeSkillBinding[];
}
