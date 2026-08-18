import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('collaboration_comments')
export class CollaborationCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_type' })
  resourceType: string; // 'document', 'exam'

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId: string;

  @Column({ name: 'element_id', nullable: true })
  elementId: string; // e.g., 'question-42', 'header', 'instructions'

  @Column({ name: 'element_type', nullable: true })
  elementType: string; // 'question', 'section', 'header', 'instructions'

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  @Column('text')
  content: string;

  @Column('uuid', { array: true, default: [] })
  mentions: string[];

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => CollaborationCommentEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: CollaborationCommentEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: UserEntity;
}
