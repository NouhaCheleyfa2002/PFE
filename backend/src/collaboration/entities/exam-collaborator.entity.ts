import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('exam_collaborators')
export class ExamCollaboratorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string;

  @Column({ default: 'editor' })
  role: string; // 'owner', 'editor', 'reviewer'

  @Column({ default: 'pending' })
  status: string; // 'pending', 'accepted', 'declined', 'removed'

  @Column({ name: 'invited_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  invitedAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'invited_by' })
  inviter: UserEntity;
}
