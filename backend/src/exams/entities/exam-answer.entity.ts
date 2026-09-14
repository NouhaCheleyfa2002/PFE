import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ExamAttemptEntity } from './exam-attempt.entity';
import { ExamQuestionSetEntity } from './exam-question-set.entity';

@Entity('exam_answers')
@Index(['attemptId', 'examQuestionId'], { unique: true })
export class ExamAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attempt_id' })
  attemptId: string;

  @Column({ name: 'exam_question_id' })
  examQuestionId: string;

  // Answer data
  @Column({ name: 'answer_data', type: 'jsonb' })
  answerData: any;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean | null;

  @Column({ name: 'points_earned', type: 'decimal', precision: 5, scale: 2, nullable: true })
  pointsEarned: number | null;

  // Timing
  @Column({ name: 'time_spent_seconds', default: 0 })
  timeSpentSeconds: number;

  @Column({ name: 'answered_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  answeredAt: Date;

  // Manual grading (for essay/open-ended questions)
  @Column({ name: 'feedback', type: 'text', nullable: true })
  feedback: string | null;

  @Column({ name: 'graded_by', type: 'varchar', length: 50, nullable: true })
  gradedBy: string | null; // 'auto' or 'teacher'

  @Column({ name: 'graded_at', type: 'timestamp', nullable: true })
  gradedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExamAttemptEntity, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttemptEntity;

  @ManyToOne(() => ExamQuestionSetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_question_id' })
  examQuestion: ExamQuestionSetEntity;
}
