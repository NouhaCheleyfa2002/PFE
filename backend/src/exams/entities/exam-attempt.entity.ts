import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ExamEntity } from './exam.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { ExamAnswerEntity } from './exam-answer.entity';

export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';

@Entity('exam_attempts')
@Index(['studentId', 'examId'])
export class ExamAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'exam_id' })
  examId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  // Attempt metadata
  @Column({ default: 'in_progress' })
  status: AttemptStatus;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  // Scoring
  @Column({ name: 'total_questions' })
  totalQuestions: number;

  @Column({ name: 'answered_questions', default: 0 })
  answeredQuestions: number;

  @Column({ name: 'correct_answers', default: 0 })
  correctAnswers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxScore: number | null;

  // Timing
  @Column({ name: 'time_spent_seconds', default: 0 })
  timeSpentSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExamEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @OneToMany(() => ExamAnswerEntity, (answer) => answer.attempt)
  answers: ExamAnswerEntity[];
}
