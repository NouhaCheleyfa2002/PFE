import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { ExamEntity } from './exam.entity';

@Entity('exam_submissions')
export class ExamSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  examId: string;

  @Column('uuid')
  studentId: string;

  @Column('jsonb')
  answers: Record<string, any>; // { questionId: answer }

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'int', nullable: true })
  maxScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage: number;

  @Column({ type: 'int', nullable: true })
  timeSpent: number; // in seconds

  @Column({ default: 'submitted' })
  status: string; // 'in_progress', 'submitted', 'graded'

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ExamEntity)
  @JoinColumn({ name: 'examId' })
  exam: ExamEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'studentId' })
  student: UserEntity;
}
