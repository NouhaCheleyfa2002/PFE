import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('question_locks')
export class QuestionLockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ name: 'locked_by', type: 'uuid' })
  lockedBy: string;

  @Column({ name: 'locked_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lockedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', default: () => "CURRENT_TIMESTAMP + INTERVAL '30 seconds'" })
  expiresAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'locked_by' })
  user: UserEntity;
}
