import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('activity_logs')
@Index(['userId'])
@Index(['activityType'])
@Index(['createdAt'])
@Index(['userId', 'activityType'])
export class ActivityLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  activityType: string; // 'document_upload', 'question_generated', 'search', 'verification_request', etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional context about the activity

  @Column({ type: 'varchar', length: 50, nullable: true })
  resourceType: string; // 'document', 'question', 'verification', etc.

  @Column({ type: 'uuid', nullable: true })
  resourceId: string; // ID of the related resource

  @CreateDateColumn()
  createdAt: Date;
}
