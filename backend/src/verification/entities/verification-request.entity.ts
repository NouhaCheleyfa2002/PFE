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

  @CreateDateColumn()
  submittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
