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
import { ExamEntity } from './exam.entity';

@Entity('exam_question_set')
@Index(['examId', 'orderIndex'], { unique: true })
export class ExamQuestionSetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'exam_id', type: 'uuid' })
  examId: string;

  @Column({ name: 'question_id', type: 'varchar', nullable: true })
  questionId: string | null;

  // Question snapshot at publish time
  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ name: 'question_type', type: 'varchar' })
  questionType: string;

  @Column({ name: 'question_data', type: 'jsonb' })
  questionData: any;

  // Exam-specific metadata
  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column({ type: 'int', default: 1 })
  points: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExamEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamEntity;
}
