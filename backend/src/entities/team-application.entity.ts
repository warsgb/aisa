import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

@Entity('team_applications')
export class TeamApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: ApplicationStatus;

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
