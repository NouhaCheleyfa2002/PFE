import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('user_notifications')
export class UserNotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['upload', 'rating', 'verification', 'comment', 'system', 'exam', 'question'],
    default: 'system',
  })
  type: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
