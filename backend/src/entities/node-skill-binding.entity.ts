import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LtcNode } from './ltc-node.entity';
import { Skill } from './skill.entity';

@Entity('node_skill_bindings')
@Unique(['node_id', 'skill_id'])
export class NodeSkillBinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'node_id' })
  node_id: string;

  @Column({ name: 'skill_id' })
  skill_id: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => LtcNode, (node) => node.skill_bindings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node: LtcNode;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;
}
