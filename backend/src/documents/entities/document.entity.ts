import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { DocumentStatus } from '../document.interface';
import { ExamQuestionEntity } from '../../exam-pipeline/entities/exam-question.entity';
import { UserEntity } from '../../auth/entities/user.entity';

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

  // Relation to User
  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ name: 'originalFileName' })
  originalName: string;

  @Column({ name: 'storageUrl' })
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
  title?: string | null;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  level?: string | null;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  subject?: string | null;

  @Column({ nullable: true, type: 'int' })
  year?: number | null;

  // Enhanced metadata fields (Phase 2)
  @Column({ name: 'resource_type', type: 'varchar', length: 20, default: 'course', nullable: true })
  resourceType?: string;

  @Column({ name: 'class_level', type: 'varchar', length: 50, nullable: true })
  classLevel?: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  keywords?: string[] | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'free', nullable: true })
  license?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number | null;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified?: boolean;

  @Column({ name: 'views', type: 'int', default: 0 })
  views: number;

  @Column({ name: 'downloads', type: 'int', default: 0 })
  downloads: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0, nullable: true })
  averageRating: number;

  @Column({ name: 'total_ratings', type: 'int', default: 0 })
  totalRatings: number;

  @Column({ name: 'bookmark_count', type: 'int', default: 0 })
  bookmarkCount: number;

  // Content Verification (Phase 3)
  @Column({ name: 'verification_status', type: 'varchar', length: 20, default: 'pending', nullable: true })
  verificationStatus?: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  // Duplicate Detection (Phase 4)
  @Column({ name: 'embedding_vector', type: 'float', array: true, nullable: true })
  embeddingVector?: number[] | null;

  // Bac Section (Tunisian Education System - Phase 4)
  @Column({ name: 'bac_section', type: 'varchar', length: 20, nullable: true })
  bacSection?: string | null;

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
