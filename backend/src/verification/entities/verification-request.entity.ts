import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MORE_INFO_NEEDED = 'more_info_needed',
}

export enum TeachingLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  UNIVERSITY = 'university',
  PRIVATE_TUTOR = 'private_tutor',
}

@Entity('verification_requests')
@Index(['status'])
@Index(['userId'])
export class VerificationRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  // Teacher Information
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  institution: string;

  @Column({
    type: 'enum',
    enum: TeachingLevel,
  })
  teachingLevel: TeachingLevel;

  @Column({ type: 'text', array: true })
  subjects: string[];

  // Supporting Documents (URLs from SeaweedFS)
  @Column({ type: 'text', array: true })
  documentUrls: string[];

  // Identity Verification
  @Column({ type: 'varchar', length: 500, nullable: true })
  verificationVideoUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  verificationCode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'id_number' })
  idNumber: string | null;

  // Status
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  @Index()
  status: VerificationStatus;

  // Admin Review
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  // AI Verification Fields
  @Column({ type: 'jsonb', nullable: true, name: 'ai_extracted_data' })
  aiExtractedData: any | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'ai_verification_score' })
  aiVerificationScore: number | null;

  @Column({ type: 'varchar', length: 50, default: 'pending', name: 'ai_status' })
  aiStatus: string;

  @Column({ type: 'varchar', length: 20, default: 'unknown', name: 'ai_risk_level' })
  aiRiskLevel: string;

  @Column({ type: 'jsonb', default: () => "'[]'", name: 'ai_flags' })
  aiFlags: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'duplicate_check_result' })
  duplicateCheckResult: any | null;

  @Column({ type: 'jsonb', default: () => "'[]'", name: 'similarity_matches' })
  similarityMatches: any[];

  @Column({ type: 'timestamp', nullable: true, name: 'ai_processed_at' })
  aiProcessedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'professional_id' })
  professionalId: string | null;

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
