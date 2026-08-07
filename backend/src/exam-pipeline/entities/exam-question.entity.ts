import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';

@Entity('exam_questions')
@Index(['topic'])
@Index(['difficulty'])
@Index(['documentId'])
@Index(['status'])
export class ExamQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  // Alias for backward compatibility
  get text(): string {
    return this.questionText;
  }
  set text(value: string) {
    this.questionText = value;
  }

  @Column({ name: 'question_type', type: 'varchar', length: 50 })
  questionType: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  difficulty: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  points: number | null;

  @Column({ name: 'page_number', type: 'int', nullable: true })
  pageNumber: number | null;

  @Column({ type: 'jsonb', nullable: true })
  options: any | null;

  @Column({ name: 'correct_answer', type: 'text', nullable: true })
  correctAnswer: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  topic: string | null;

  @Column({ name: 'bloom_taxonomy', type: 'varchar', length: 50, nullable: true })
  bloomTaxonomy: string | null;

  @Column({ name: 'extraction_confidence', type: 'decimal', precision: 3, scale: 2, nullable: true })
  extractionConfidence: number | null;

  @Column({ name: 'extracted_at', type: 'timestamp', nullable: true })
  extractedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  // Add explanation field for backward compatibility  
  explanation: string | null = null;

  // Add embedding field for semantic search (stored as JSON array)
  @Column({ type: 'jsonb', nullable: true })
  embedding: any;

  // Link back to source document
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // Visual content support for questions that reference images, graphs, tables, etc.
  @Column({ name: 'has_visual_content', type: 'boolean', default: false })
  hasVisualContent: boolean;

  @Column({ name: 'visual_content_ref', type: 'text', nullable: true })
  visualContentRef: string | null;

  @Column({ name: 'visual_content_type', type: 'varchar', length: 50, nullable: true })
  visualContentType: string | null;

  @Column({ name: 'visual_context_keywords', type: 'text', array: true, nullable: true })
  visualContextKeywords: string[] | null;
}
