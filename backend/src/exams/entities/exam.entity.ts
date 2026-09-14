import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('exams')
export class ExamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ownerId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  classLevel: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  duration: string;

  @Column('text', { nullable: true })
  instructions: string;

  @Column('jsonb')
  questions: any[];

  @Column('uuid', { nullable: true })
  templateId: string;

  @Column({ nullable: true })
  maxPoints: number;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'published'

  // Publishing metadata
  @Column({ name: 'bac_section', type: 'varchar', nullable: true })
  bacSection: string | null;

  @Column({ name: 'keywords', type: 'text', array: true, nullable: true })
  keywords: string[] | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'license', default: 'free' })
  license: string; // 'free', 'paid'

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ name: 'source_type', default: 'manual' })
  sourceType: string; // 'manual', 'ai_generated'

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'verification_status', default: 'pending' })
  verificationStatus: string; // 'pending', 'approved', 'rejected'

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  downloads: number;

  // Generated document files
  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'docx_url', type: 'text', nullable: true })
  docxUrl: string | null;

  // Collaboration - store co-authors (collaborators who helped create the exam)
  @Column({ name: 'co_authors', type: 'jsonb', nullable: true })
  coAuthors: { userId: string; fullName: string; role: string }[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: UserEntity;
}
