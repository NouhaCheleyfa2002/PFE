import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'teacher', 'student'],
    default: 'student',
  })
  @Index()
  role: 'admin' | 'teacher' | 'student';

  @Column({ nullable: true })
  university?: string;

  @Column({ nullable: true })
  region?: string;

  @Column({ nullable: true })
  specialty?: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'varchar', length: 20, default: 'unverified', nullable: true })
  verificationStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationRequestedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verificationCompletedAt: Date;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ default: false })
  banned: boolean;

  @Column({ name: 'banned_at', type: 'timestamp', nullable: true })
  bannedAt?: Date;

  @Column({ name: 'banned_reason', type: 'text', nullable: true })
  bannedReason?: string;

  @Column({ name: 'banned_by', type: 'uuid', nullable: true })
  bannedBy?: string;

  @Column({ default: false })
  restricted: boolean;

  @Column({ name: 'restricted_at', type: 'timestamp', nullable: true })
  restrictedAt?: Date;

  @Column({ name: 'restricted_reason', type: 'text', nullable: true })
  restrictedReason?: string;

  @Column({ name: 'restricted_by', type: 'uuid', nullable: true })
  restrictedBy?: string;

  @Column({ name: 'restriction_type', type: 'varchar', length: 50, nullable: true })
  restrictionType?: string; // 'upload', 'comment', 'download', 'all'

  @CreateDateColumn()
  createdAt: Date;
}
