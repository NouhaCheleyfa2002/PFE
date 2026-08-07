import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('resource_ratings')
export class ResourceRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'teacher_id', type: 'uuid' })
  teacherId: string;

  @Column({ name: 'overall_rating', type: 'integer' })
  overallRating: number;

  @Column({ name: 'quality_rating', type: 'integer', nullable: true })
  qualityRating?: number;

  @Column({ name: 'accuracy_rating', type: 'integer', nullable: true })
  accuracyRating?: number;

  @Column({ name: 'usability_rating', type: 'integer', nullable: true })
  usabilityRating?: number;

  @Column({ name: 'would_recommend', type: 'boolean', nullable: true })
  wouldRecommend?: boolean;

  @Column({ type: 'text', nullable: true })
  review?: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'helpful_votes', type: 'integer', default: 0 })
  helpfulVotes: number;

  @Column({ name: 'not_helpful_votes', type: 'integer', default: 0 })
  notHelpfulVotes: number;

  @Column({ default: false })
  flagged: boolean;

  @Column({ name: 'flagged_at', type: 'timestamp', nullable: true })
  flaggedAt?: Date;

  @Column({ name: 'flagged_reason', type: 'text', nullable: true })
  flaggedReason?: string;

  @Column({ name: 'moderation_status', type: 'varchar', length: 20, default: 'pending' })
  moderationStatus: string; // 'pending', 'approved', 'rejected'

  @Column({ name: 'moderated_at', type: 'timestamp', nullable: true })
  moderatedAt?: Date;

  @Column({ name: 'moderated_by', type: 'uuid', nullable: true })
  moderatedBy?: string;

  @Column({ name: 'ai_moderation_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  aiModerationScore?: number;

  @Column({ name: 'ai_moderation_flags', type: 'text', array: true, default: [] })
  aiModerationFlags: string[];

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', type: 'uuid', nullable: true })
  deletedBy?: string;

  @Column({ name: 'deletion_reason', type: 'text', nullable: true })
  deletionReason?: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'teacher_id' })
  teacher: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('rating_votes')
export class RatingVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rating_id', type: 'uuid' })
  ratingId: string;

  @Column({ name: 'voter_id', type: 'uuid' })
  voterId: string;

  @Column({ name: 'vote_type', type: 'varchar' })
  voteType: 'helpful' | 'not_helpful';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('resource_bookmarks')
export class ResourceBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('resource_downloads')
export class ResourceDownload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'downloaded_at' })
  downloadedAt: Date;
}

@Entity('teacher_follows')
export class TeacherFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'follower_id', type: 'uuid' })
  followerId: string;

  @Column({ name: 'following_id', type: 'uuid' })
  followingId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
