import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DocumentEntity } from '../../documents/entities/document.entity';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('document_moderation')
export class DocumentModerationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'document_id' })
  documentId: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;

  // Status
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  // AI Scores
  @Column({ type: 'integer', nullable: true, name: 'ai_safety_score' })
  aiSafetyScore: number | null;

  @Column({ type: 'integer', nullable: true, name: 'ai_quality_score' })
  aiQualityScore: number | null;

  @Column({ type: 'integer', nullable: true, name: 'ai_educational_score' })
  aiEducationalScore: number | null;

  // Detected Metadata
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ai_category' })
  aiCategory: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ai_difficulty_level' })
  aiDifficultyLevel: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'ai_detected_subject' })
  aiDetectedSubject: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ai_detected_grade_level' })
  aiDetectedGradeLevel: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'ai_detected_language' })
  aiDetectedLanguage: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'ai_bac_section' })
  aiBacSection: string | null;

  // Risk Flags
  @Column({ type: 'boolean', default: false, name: 'has_inappropriate_content' })
  hasInappropriateContent: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_pii' })
  hasPii: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_malware' })
  hasMalware: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_copyright_risk' })
  hasCopyrightRisk: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_promotional_content' })
  hasPromotionalContent: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_external_links' })
  hasExternalLinks: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_duplicate' })
  isDuplicate: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'duplicate_of_id' })
  duplicateOfId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'duplicate_similarity_score' })
  duplicateSimilarityScore: number | null;

  // Issues & Recommendations (JSON)
  @Column({ type: 'jsonb', default: '[]', name: 'detected_issues' })
  detectedIssues: any[];

  @Column({ type: 'jsonb', default: '{}', name: 'ai_recommendations' })
  aiRecommendations: any;

  // Quality Metrics
  @Column({ type: 'integer', nullable: true, name: 'ocr_quality_score' })
  ocrQualityScore: number | null;

  @Column({ type: 'integer', nullable: true, name: 'language_quality_score' })
  languageQualityScore: number | null;

  @Column({ type: 'integer', nullable: true, name: 'completeness_score' })
  completenessScore: number | null;

  @Column({ type: 'integer', nullable: true, name: 'formatting_score' })
  formattingScore: number | null;

  // Overall Risk
  @Column({ type: 'integer', nullable: true, name: 'overall_risk_score' })
  overallRiskScore: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'risk_level' })
  riskLevel: string | null;

  // Phase 4: Advanced AI Features
  @Column({ type: 'integer', nullable: true, name: 'pii_score' })
  piiScore: number | null;

  @Column({ type: 'jsonb', default: '[]', name: 'pii_details' })
  piiDetails: any[];

  @Column({ type: 'integer', nullable: true, name: 'difficulty_score' })
  difficultyScore: number | null;

  @Column({ type: 'text', nullable: true, name: 'difficulty_reasoning' })
  difficultyReasoning: string | null;

  @Column({ type: 'jsonb', default: '[]', name: 'learning_objectives' })
  learningObjectives: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'bloom_taxonomy_level' })
  bloomTaxonomyLevel: string | null;

  // Duplicate Detection
  @Column({ type: 'boolean', default: false, name: 'embedding_generated' })
  embeddingGenerated: boolean;

  @Column({ type: 'boolean', default: false, name: 'similarity_check_completed' })
  similarityCheckCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'duplicate_check_date' })
  duplicateCheckDate: Date | null;

  // Admin Actions
  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: UserEntity | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true, name: 'admin_notes' })
  adminNotes: string | null;

  @Column({ type: 'text', nullable: true, name: 'changes_requested' })
  changesRequested: string | null;

  // Processing Info
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'virus_scan_status' })
  virusScanStatus: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'virus_scan_result' })
  virusScanResult: any;

  @Column({ type: 'text', nullable: true, name: 'ocr_extracted_text' })
  ocrExtractedText: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'ocr_completed_at' })
  ocrCompletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'metadata_extraction_completed_at' })
  metadataExtractionCompletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'ai_analysis_completed_at' })
  aiAnalysisCompletedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'processing_started_at' })
  processingStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'processing_completed_at' })
  processingCompletedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'processing_error' })
  processingError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
