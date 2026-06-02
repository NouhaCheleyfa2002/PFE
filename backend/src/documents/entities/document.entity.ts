import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { DocumentStatus } from '../document.interface';
import { ExamQuestionEntity } from '../../exam-pipeline/entities/exam-question.entity';

@Entity('documents')
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
@Index(['level'])
@Index(['subject'])
@Index(['year'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  originalName: string;

  @Column()
  storageUrl: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  @Index()
  status: DocumentStatus;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({ nullable: true })
  ocrResultUrl?: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;

  // Exam metadata fields
  @Column({ nullable: true, type: 'varchar', length: 500 })
  title?: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  level?: string;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  subject?: string;

  @Column({ nullable: true, type: 'int' })
  year?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  processedAt?: Date;

  // Reverse relation to questions
  @OneToMany(() => ExamQuestionEntity, question => question.document)
  questions: ExamQuestionEntity[];
}
