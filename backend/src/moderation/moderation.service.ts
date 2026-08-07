import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentModerationEntity } from './entities/document-moderation.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { AIAnalysisService } from './ai-analysis.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { QuestionExtractionService } from './question-extraction.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(DocumentModerationEntity)
    private readonly moderationRepository: Repository<DocumentModerationEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    private readonly aiAnalysisService: AIAnalysisService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly questionExtractionService: QuestionExtractionService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  /**
   * Public method to manually extract questions from a document
   */
  async manuallyExtractQuestionsForDocument(
    documentId: string,
    ocrText: string,
    subject?: string,
    gradeLevel?: string,
  ): Promise<{ success: boolean; questionsFound: number; questionsSaved: number; error?: string }> {
    try {
      this.logger.log(`Manual question extraction triggered for document: ${documentId}`);
      
      const extractionResult = await this.questionExtractionService.extractQuestions(
        ocrText,
        subject,
        gradeLevel
      );

      if (extractionResult.success && extractionResult.questionsFound > 0) {
        const savedCount = await this.questionExtractionService.saveExtractedQuestions(
          documentId,
          extractionResult.questions,
          subject,
          gradeLevel
        );
        
        return {
          success: true,
          questionsFound: extractionResult.questionsFound,
          questionsSaved: savedCount,
        };
      }

      return {
        success: false,
        questionsFound: 0,
        questionsSaved: 0,
        error: extractionResult.error || 'No questions found',
      };
    } catch (error) {
      this.logger.error('Manual question extraction failed:', error);
      return {
        success: false,
        questionsFound: 0,
        questionsSaved: 0,
        error: error.message,
      };
    }
  }

  /**
   * Re-extract diagrams for a document's questions
   */
  async reExtractDiagramsForDocument(documentId: string): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      this.logger.log(`Re-extraction triggered for document: ${documentId}`);
      return await this.questionExtractionService.reExtractDiagramsForDocument(documentId);
    } catch (error) {
      this.logger.error('Re-extraction failed:', error);
      return {
        success: false,
        processed: 0,
        error: error.message,
      };
    }
  }


  /**
   * Create moderation record and run AI analysis
   */
  async createModerationForDocument(documentId: string, ocrText: string): Promise<DocumentModerationEntity> {
    this.logger.log(`Creating moderation record for document ${documentId}`);

    const moderation = this.moderationRepository.create({
      documentId,
      status: 'pending',
      processingStartedAt: new Date(),
    });

    await this.moderationRepository.save(moderation);

    // Run AI analysis asynchronously
    this.runAIAnalysis(moderation.id, ocrText).catch(error => {
      this.logger.error(`AI analysis failed for moderation ${moderation.id}:`, error);
    });

    return moderation;
  }

  /**
   * Run comprehensive AI analysis
   */
  private async runAIAnalysis(moderationId: string, ocrText: string): Promise<void> {
    try {
      const moderation = await this.moderationRepository.findOne({
        where: { id: moderationId },
      });

      if (!moderation) {
        this.logger.error(`Moderation ${moderationId} not found`);
        return;
      }

      this.logger.log(`Running AI analysis for moderation ${moderationId}`);

      // Store OCR text and mark OCR completion
      moderation.ocrExtractedText = ocrText.substring(0, 50000); // Store first 50k chars
      moderation.ocrCompletedAt = new Date();
      await this.moderationRepository.save(moderation);

      // Notify teacher that AI processing has started
      try {
        const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
        if (document) {
          await this.userNotificationsService.notifyAIProcessingStarted(
            document.userId,
            document.id,
            document.originalName
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to send AI processing notification: ${error.message}`);
      }

      // Run analyses in parallel
      const [safetyResult, subjectResult, qualityResult, piiResult, difficultyResult, objectivesResult] = await Promise.all([
        this.aiAnalysisService.analyzeSafety(ocrText),
        this.aiAnalysisService.detectSubject(ocrText),
        this.aiAnalysisService.assessQuality(ocrText),
        this.aiAnalysisService.detectPII(ocrText),
        this.aiAnalysisService.detectDifficulty(ocrText),
        this.aiAnalysisService.generateLearningObjectives(ocrText),
      ]);

      // Get document to extract filename for metadata extraction
      const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
      
      // Extract comprehensive metadata for auto-filling
      let extractedMetadata: { title: string; subject: string; classLevel: string; resourceType: 'course' | 'exam'; keywords: string[]; description: string; year: number | null; bacSection: string | null; confidence: number } | null = null;
      if (document) {
        try {
          extractedMetadata = await this.aiAnalysisService.extractMetadata(ocrText, document.originalName);
          this.logger.log(`Metadata extracted for ${document.id}: ${JSON.stringify(extractedMetadata)}`);
          moderation.metadataExtractionCompletedAt = new Date();
          await this.moderationRepository.save(moderation);
        } catch (error) {
          this.logger.error('Metadata extraction failed:', error);
        }
      }

      // Update moderation record - Basic AI Analysis
      moderation.aiSafetyScore = safetyResult.score;
      moderation.hasInappropriateContent = !safetyResult.safe;
      
      moderation.aiDetectedSubject = subjectResult.subject;
      moderation.aiCategory = subjectResult.category;
      moderation.aiDetectedGradeLevel = subjectResult.gradeLevel ?? null;
      moderation.aiDetectedLanguage = subjectResult.language ?? null;
      moderation.aiBacSection = subjectResult.bacSection ?? null;
      
      moderation.aiQualityScore = qualityResult.score;
      moderation.languageQualityScore = qualityResult.languageQualityScore;
      moderation.completenessScore = qualityResult.completenessScore;

      // Phase 4: Advanced AI Features
      // PII Detection
      moderation.hasPii = piiResult.found;
      moderation.piiScore = piiResult.score;
      moderation.piiDetails = piiResult.piiItems;

      // Difficulty Analysis
      moderation.aiDifficultyLevel = difficultyResult.level;
      moderation.difficultyScore = difficultyResult.score;
      moderation.difficultyReasoning = difficultyResult.reasoning;

      // Learning Objectives
      moderation.learningObjectives = objectivesResult.objectives;
      moderation.bloomTaxonomyLevel = objectivesResult.bloomLevel;

      // Duplicate Detection (run after other analyses)
      try {
        this.logger.log('Running duplicate detection...');
        const duplicateResult = await this.duplicateDetectionService.checkForDuplicates(
          moderation.documentId,
          ocrText
        );

        moderation.isDuplicate = duplicateResult.isDuplicate;
        moderation.duplicateSimilarityScore = duplicateResult.highestSimilarity;
        
        if (duplicateResult.isDuplicate && duplicateResult.similarDocuments.length > 0) {
          moderation.duplicateOfId = duplicateResult.similarDocuments[0].documentId;
          this.logger.warn(`Duplicate detected: ${moderation.documentId} is ${(duplicateResult.highestSimilarity * 100).toFixed(1)}% similar to ${moderation.duplicateOfId}`);
        }

        moderation.similarityCheckCompleted = true;
        moderation.embeddingGenerated = true;
      } catch (error) {
        this.logger.error('Duplicate detection failed:', error);
        moderation.similarityCheckCompleted = false;
      }

      // Question Extraction (for exams/quizzes)
      try {
        // Document was already fetched above for metadata extraction
        if (document) {
          // Check both title and original filename for exam detection
          const titleToCheck = document.title || '';
          const filenameToCheck = document.originalName || '';
          
          if (this.questionExtractionService.isLikelyExamOrQuiz(ocrText, titleToCheck) ||
              this.questionExtractionService.isLikelyExamOrQuiz(ocrText, filenameToCheck)) {
            this.logger.log('Document appears to be an exam/quiz, extracting questions...');
            
            const extractionResult = await this.questionExtractionService.extractQuestions(
              ocrText,
              moderation.aiDetectedSubject || document.subject || undefined,
              moderation.aiDetectedGradeLevel || document.classLevel || undefined
            );

            if (extractionResult.success && extractionResult.questionsFound > 0) {
              this.logger.log(`Extracted ${extractionResult.questionsFound} questions from document`);
              
              // Save questions to database
              const savedCount = await this.questionExtractionService.saveExtractedQuestions(
                moderation.documentId,
                extractionResult.questions,
                moderation.aiDetectedSubject || document.subject || undefined,
                moderation.aiDetectedGradeLevel || document.classLevel || undefined
              );
              
              this.logger.log(`Successfully saved ${savedCount} questions to database`);
            } else {
              this.logger.log('No questions found in document');
            }
          } else {
            this.logger.log(`Document does not appear to be an exam/quiz (title="${titleToCheck}", filename="${filenameToCheck}"), skipping question extraction`);
          }
        }
      } catch (error) {
        this.logger.error('Question extraction failed:', error);
      }

      // Collect issues
      const issues = [
        ...safetyResult.issues.map(i => ({ ...i, category: 'safety' })),
        ...qualityResult.issues.map(i => ({ ...i, category: 'quality' })),
      ];
      moderation.detectedIssues = issues;

      // Calculate overall risk score
      moderation.overallRiskScore = this.calculateRiskScore(moderation);
      moderation.riskLevel = this.getRiskLevel(moderation.overallRiskScore);

      // Generate AI recommendation
      moderation.aiRecommendations = this.generateRecommendation(moderation);

      moderation.aiAnalysisCompletedAt = new Date();
      moderation.processingCompletedAt = new Date();

      await this.moderationRepository.save(moderation);

      // Update document with detected metadata (including extracted comprehensive metadata)
      await this.updateDocumentMetadata(moderation.documentId, moderation, extractedMetadata);

      // Notify teacher that AI processing is complete
      try {
        const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
        if (document) {
          // Count extracted questions
          const questionsExtracted = await this.questionExtractionService.getQuestionCount(document.id);
          
          await this.userNotificationsService.notifyAIProcessingCompleted(
            document.userId,
            document.id,
            document.originalName,
            questionsExtracted
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to send AI completion notification: ${error.message}`);
      }

      // Detect high-risk content and notify admins
      const overallScore = moderation.overallRiskScore ?? 0;
      if (overallScore < 70) {
        try {
          const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
          if (document) {
            const issues: string[] = [];
            if (moderation.hasInappropriateContent) issues.push('Inappropriate content');
            if (moderation.hasPii) issues.push('PII detected');
            if (moderation.aiQualityScore && moderation.aiQualityScore < 60) issues.push('Low quality');
            if (moderation.isDuplicate) issues.push('Possible duplicate');
            
            await this.userNotificationsService.notifyAIHighRisk(
              document.id,
              document.title || document.originalName,
              overallScore,
              issues
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to send high-risk notification: ${error.message}`);
        }
      }

      // Notify admins about PII detection
      if (moderation.hasPii && moderation.piiDetails && moderation.piiDetails.length > 0) {
        try {
          const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
          if (document) {
            const piiTypes = moderation.piiDetails.map((item: any) => item.type || 'Unknown');
            await this.userNotificationsService.notifyPIIDetected(
              document.id,
              document.title || document.originalName,
              piiTypes
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to send PII notification: ${error.message}`);
        }
      }

      // Notify admins about possible copyright issues
      if (moderation.isDuplicate && moderation.duplicateSimilarityScore && moderation.duplicateSimilarityScore > 0.9) {
        try {
          const document = await this.documentRepository.findOne({ where: { id: moderation.documentId } });
          if (document) {
            await this.userNotificationsService.notifyPossibleCopyright(
              document.id,
              document.title || document.originalName,
              Math.round(moderation.duplicateSimilarityScore * 100)
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to send copyright notification: ${error.message}`);
        }
      }

      // Notify admins about new resource for review
      try {
        const document = await this.documentRepository.findOne({ 
          where: { id: moderation.documentId },
          relations: ['user']
        });
        if (document && document.user) {
          await this.userNotificationsService.notifyNewResourceUploaded(
            document.id,
            document.title || document.originalName,
            document.user.fullName
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to send new resource notification: ${error.message}`);
      }

      // AUTO-APPROVAL: If score >= 95 and no critical issues, auto-approve
      const autoApprovalScore = moderation.overallRiskScore ?? 0;
      const hasCriticalIssues = issues.some(i => i.severity === 'critical');
      const hasSafetyFlags = moderation.hasInappropriateContent || moderation.hasMalware || moderation.hasPii;

      if (autoApprovalScore >= 95 && !hasCriticalIssues && !hasSafetyFlags) {
        this.logger.log(`Document ${moderation.documentId} auto-approved with score ${autoApprovalScore}`);
        
        // Auto-approve the document
        moderation.status = 'approved';
        moderation.reviewedAt = new Date();
        moderation.adminNotes = `Auto-approved by AI with score ${autoApprovalScore}/100`;
        await this.moderationRepository.save(moderation);

        // Update document to approved status
        await this.documentRepository.update(moderation.documentId, {
          verificationStatus: 'approved',
          verifiedAt: new Date(),
          isVerified: true,
        });

        this.logger.log(`Document ${moderation.documentId} automatically published to library`);
      } else if (autoApprovalScore >= 80) {
        this.logger.log(`Document ${moderation.documentId} sent for admin review (score: ${autoApprovalScore})`);
        // Status remains 'pending' - needs admin review
      } else {
        this.logger.log(`Document ${moderation.documentId} flagged for review (score: ${autoApprovalScore})`);
        // Low score - needs admin review
      }

      this.logger.log(`AI analysis completed for moderation ${moderationId}`);
    } catch (error) {
      this.logger.error(`AI analysis failed for moderation ${moderationId}:`, error);
      
      // Update moderation with error
      await this.moderationRepository.update(moderationId, {
        processingError: error.message,
        processingCompletedAt: new Date(),
      });
    }
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(moderation: DocumentModerationEntity): number {
    let score = 100;

    // Safety penalties
    if (moderation.hasInappropriateContent) score -= 50;
    if (moderation.hasMalware) score = 0; // Auto-fail
    if (moderation.hasPii) score -= 20;
    if (moderation.hasCopyrightRisk) score -= 15;

    // Quality penalties
    const safetyScore = moderation.aiSafetyScore || 100;
    const qualityScore = moderation.aiQualityScore || 80;
    
    // Weight: 50% safety, 50% quality
    score = Math.round(safetyScore * 0.5 + qualityScore * 0.5);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(score: number): string {
    if (score >= 95) return 'low';
    if (score >= 80) return 'medium';
    if (score >= 60) return 'high';
    return 'critical';
  }

  /**
   * Generate AI recommendation
   */
  private generateRecommendation(moderation: DocumentModerationEntity): any {
    const score = moderation.overallRiskScore ?? 0;
    const issues = moderation.detectedIssues || [];

    if (score >= 95 && issues.length === 0) {
      return {
        action: 'approve',
        confidence: 0.98,
        reasoning: 'High quality educational content with no safety concerns detected',
      };
    }

    if (score >= 80) {
      return {
        action: 'review',
        confidence: 0.85,
        reasoning: 'Good quality content, manual review recommended',
        suggested_changes: issues.filter(i => i.severity !== 'low').map(i => i.description),
      };
    }

    if (score >= 60) {
      return {
        action: 'request_changes',
        confidence: 0.90,
        reasoning: 'Issues detected that should be addressed',
        required_changes: issues.filter(i => i.severity === 'high' || i.severity === 'critical').map(i => i.description),
      };
    }

    return {
      action: 'reject',
      confidence: 0.95,
      reasoning: 'Critical safety or quality issues detected',
      issues: issues.map(i => i.description),
    };
  }

  /**
   * Update document with AI-detected metadata
   */
  private async updateDocumentMetadata(
    documentId: string, 
    moderation: DocumentModerationEntity,
    extractedMetadata?: { title: string; subject: string; classLevel: string; resourceType: 'course' | 'exam'; keywords: string[]; description: string; year: number | null; bacSection: string | null; confidence: number } | null
  ): Promise<void> {
    const updates: any = {};

    // Only update if not already set
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    
    if (!document) {
      this.logger.warn(`Document ${documentId} not found for metadata update`);
      return;
    }

    // Prioritize extracted metadata, fallback to subject detection
    if (extractedMetadata) {
      this.logger.log(`Applying extracted metadata with confidence ${extractedMetadata.confidence}`);
      
      // If AI has high confidence (>0.8), override existing values
      const shouldOverride = extractedMetadata.confidence > 0.8;
      
      // Always update these if extracted (overwrite defaults or low-quality data)
      if (!document.title || document.title === document.originalName || shouldOverride) {
        updates.title = extractedMetadata.title;
      }
      
      if (!document.subject || shouldOverride) {
        updates.subject = extractedMetadata.subject;
      }
      
      if (!document.classLevel || shouldOverride) {
        updates.classLevel = extractedMetadata.classLevel;
      }
      
      if (!document.resourceType) {
        updates.resourceType = extractedMetadata.resourceType;
      } else if (document.resourceType !== extractedMetadata.resourceType) {
        // Override if AI detected a different type (e.g., default was 'course' but it's actually an 'exam')
        updates.resourceType = extractedMetadata.resourceType;
        this.logger.log(`Overriding resourceType from '${document.resourceType}' to '${extractedMetadata.resourceType}'`);
      }
      
      if (!document.keywords || document.keywords.length === 0) {
        updates.keywords = extractedMetadata.keywords;
      }
      
      if (!document.description) {
        updates.description = extractedMetadata.description;
      }
      
      if (!document.year && extractedMetadata.year) {
        updates.year = extractedMetadata.year;
      }
      
      if (!document.bacSection && extractedMetadata.bacSection) {
        updates.bacSection = extractedMetadata.bacSection;
      }
    } else {
      // Fallback to basic AI detection
      if (!document.subject && moderation.aiDetectedSubject) {
        updates.subject = moderation.aiDetectedSubject;
      }
      
      if (!document.classLevel && moderation.aiDetectedGradeLevel) {
        updates.classLevel = moderation.aiDetectedGradeLevel;
      }
      
      if (!document.bacSection && moderation.aiBacSection) {
        updates.bacSection = moderation.aiBacSection;
      }
    }

    if (Object.keys(updates).length > 0) {
      this.logger.log(`Updating document ${documentId} with metadata: ${JSON.stringify(updates)}`);
      await this.documentRepository.update(documentId, updates);
    }
  }

  /**
   * Get pending documents for moderation
   */
  async getPendingDocuments(): Promise<any[]> {
    try {
      const moderations = await this.moderationRepository
        .createQueryBuilder('mod')
        .leftJoinAndSelect('mod.document', 'doc')
        .leftJoinAndSelect('doc.user', 'user')
        .where('mod.status = :status', { status: 'pending' })
        .orderBy('mod.overall_risk_score', 'ASC', 'NULLS LAST') // High risk first, nulls last
        .addOrderBy('mod.created_at', 'ASC')
        .getMany();

      return moderations.map(mod => ({
        id: mod.id,
        document: {
          id: mod.document.id,
          title: mod.document.title,
          originalName: mod.document.originalName,
          uploadedBy: mod.document.user?.fullName || 'Unknown User',
          uploadedAt: mod.document.createdAt,
          storageUrl: mod.document.storageUrl,
        },
        aiScores: {
          safety: mod.aiSafetyScore ?? 0,
          quality: mod.aiQualityScore ?? 0,
          overall: mod.overallRiskScore ?? 0,
        },
        riskLevel: mod.riskLevel ?? 'medium',
        detectedMetadata: {
          subject: mod.aiDetectedSubject,
          category: mod.aiCategory,
          gradeLevel: mod.aiDetectedGradeLevel,
          language: mod.aiDetectedLanguage,
          bacSection: mod.aiBacSection,
          difficultyLevel: mod.aiDifficultyLevel,
          difficultyScore: mod.difficultyScore,
          difficultyReasoning: mod.difficultyReasoning,
        },
        originalMetadata: {
          filename: mod.document.originalName,
          uploadedTitle: mod.document.title,
        },
        flags: {
          inappropriateContent: mod.hasInappropriateContent,
          pii: mod.hasPii,
          malware: mod.hasMalware,
          duplicate: mod.isDuplicate,
        },
        advancedAI: {
          piiDetection: {
            found: mod.hasPii,
            score: mod.piiScore ?? 100,
            details: mod.piiDetails || [],
          },
          learningObjectives: mod.learningObjectives || [],
          bloomLevel: mod.bloomTaxonomyLevel,
        },
        issues: mod.detectedIssues || [],
        aiRecommendation: mod.aiRecommendations || { action: 'review', confidence: 0.5, reasoning: 'Pending AI analysis' },
        processingCompleted: !!mod.processingCompletedAt,
        ocrText: mod.ocrExtractedText ? mod.ocrExtractedText.substring(0, 2000) : null, // First 2000 chars for preview
        timeline: {
          uploaded: mod.document.createdAt,
          processingStarted: mod.processingStartedAt,
          ocrCompleted: mod.ocrCompletedAt,
          metadataExtracted: mod.metadataExtractionCompletedAt,
          aiAnalysisCompleted: mod.aiAnalysisCompletedAt,
          processingCompleted: mod.processingCompletedAt,
        },
        adminAction: {
          reviewedBy: mod.reviewer?.fullName,
          reviewedAt: mod.reviewedAt,
          status: mod.status,
          rejectionReason: mod.rejectionReason,
          adminNotes: mod.adminNotes,
          changesRequested: mod.changesRequested,
        },
      }));
    } catch (error) {
      this.logger.error('Failed to get pending documents:', error);
      throw error;
    }
  }

  /**
   * Get moderation record for a document
   */
  async getModerationRecordByDocumentId(documentId: string): Promise<DocumentModerationEntity | null> {
    try {
      const moderation = await this.moderationRepository.findOne({
        where: { documentId },
        order: { createdAt: 'DESC' }, // Get latest moderation
      });
      return moderation;
    } catch (error) {
      this.logger.error(`Failed to get moderation record for document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Get moderation details
   */
  async getModerationDetails(moderationId: string): Promise<any> {
    const moderation = await this.moderationRepository
      .createQueryBuilder('mod')
      .leftJoinAndSelect('mod.document', 'doc')
      .leftJoinAndSelect('doc.user', 'user')
      .leftJoinAndSelect('mod.reviewer', 'reviewer')
      .where('mod.id = :id', { id: moderationId })
      .getOne();

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    return {
      id: moderation.id,
      status: moderation.status,
      document: {
        id: moderation.document.id,
        title: moderation.document.title,
        originalName: moderation.document.originalName,
        storageUrl: moderation.document.storageUrl,
        uploadedBy: moderation.document.user?.fullName || 'Unknown User',
        uploadedAt: moderation.document.createdAt,
      },
      aiAnalysis: {
        safetyScore: moderation.aiSafetyScore,
        qualityScore: moderation.aiQualityScore,
        educationalScore: moderation.aiEducationalScore,
        overallRiskScore: moderation.overallRiskScore,
        riskLevel: moderation.riskLevel,
      },
      detectedMetadata: {
        subject: moderation.aiDetectedSubject,
        category: moderation.aiCategory,
        gradeLevel: moderation.aiDetectedGradeLevel,
        language: moderation.aiDetectedLanguage,
        bacSection: moderation.aiBacSection,
        difficultyLevel: moderation.aiDifficultyLevel,
        difficultyScore: moderation.difficultyScore,
        difficultyReasoning: moderation.difficultyReasoning,
      },
      qualityMetrics: {
        ocrQuality: moderation.ocrQualityScore,
        languageQuality: moderation.languageQualityScore,
        completeness: moderation.completenessScore,
        formatting: moderation.formattingScore,
      },
      advancedAI: {
        piiDetection: {
          found: moderation.hasPii,
          score: moderation.piiScore,
          details: moderation.piiDetails || [],
        },
        learningObjectives: moderation.learningObjectives || [],
        bloomLevel: moderation.bloomTaxonomyLevel,
        duplicateDetection: {
          isDuplicate: moderation.isDuplicate,
          similarityScore: moderation.duplicateSimilarityScore,
          duplicateOfId: moderation.duplicateOfId,
          checkCompleted: moderation.similarityCheckCompleted,
        },
      },
      flags: {
        inappropriateContent: moderation.hasInappropriateContent,
        pii: moderation.hasPii,
        malware: moderation.hasMalware,
        copyrightRisk: moderation.hasCopyrightRisk,
        promotional: moderation.hasPromotionalContent,
        externalLinks: moderation.hasExternalLinks,
        duplicate: moderation.isDuplicate,
      },
      detectedIssues: moderation.detectedIssues,
      aiRecommendation: moderation.aiRecommendations,
      adminActions: {
        reviewedBy: moderation.reviewer?.fullName,
        reviewedAt: moderation.reviewedAt,
        rejectionReason: moderation.rejectionReason,
        adminNotes: moderation.adminNotes,
        changesRequested: moderation.changesRequested,
      },
      processing: {
        startedAt: moderation.processingStartedAt,
        completedAt: moderation.processingCompletedAt,
        error: moderation.processingError,
      },
    };
  }

  /**
   * Approve document
   */
  async approveDocument(moderationId: string, userId: string, notes?: string): Promise<void> {
    const moderation = await this.moderationRepository.findOne({
      where: { id: moderationId },
      relations: ['document', 'document.user'],
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    moderation.status = 'approved';
    moderation.reviewedBy = userId;
    moderation.reviewedAt = new Date();
    if (notes) {
      moderation.adminNotes = notes;
    }

    await this.moderationRepository.save(moderation);

    // Update document verification status to approved - now public
    await this.documentRepository.update(moderation.documentId, {
      verificationStatus: 'approved',
      verifiedBy: userId,
      verifiedAt: new Date(),
      isVerified: true,
    });

    this.logger.log(`Document ${moderation.documentId} approved by ${userId}`);

    // Notify teacher that resource was approved
    try {
      if (moderation.document && moderation.document.user) {
        await this.userNotificationsService.notifyResourceApproved(
          moderation.document.user.id,
          moderation.document.id,
          moderation.document.title || moderation.document.originalName
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send approval notification: ${error.message}`);
    }
  }

  /**
   * Reject document
   */
  async rejectDocument(moderationId: string, userId: string, reason: string, notes?: string): Promise<void> {
    const moderation = await this.moderationRepository.findOne({
      where: { id: moderationId },
      relations: ['document', 'document.user'],
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    moderation.status = 'rejected';
    moderation.reviewedBy = userId;
    moderation.reviewedAt = new Date();
    moderation.rejectionReason = reason;
    if (notes) {
      moderation.adminNotes = notes;
    }

    await this.moderationRepository.save(moderation);

    // Update document verification status to rejected - not public
    await this.documentRepository.update(moderation.documentId, {
      verificationStatus: 'rejected',
      rejectionReason: reason,
      isVerified: false,
    });

    this.logger.log(`Document ${moderation.documentId} rejected by ${userId}`);

    // Notify teacher that resource was rejected
    try {
      if (moderation.document && moderation.document.user) {
        await this.userNotificationsService.notifyResourceRejected(
          moderation.document.user.id,
          moderation.document.id,
          moderation.document.title || moderation.document.originalName,
          reason
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send rejection notification: ${error.message}`);
    }
  }

  /**
   * Request changes
   */
  async requestChanges(moderationId: string, userId: string, changes: string, notes?: string): Promise<void> {
    const moderation = await this.moderationRepository.findOne({
      where: { id: moderationId },
      relations: ['document', 'document.user'],
    });

    if (!moderation) {
      throw new NotFoundException('Moderation record not found');
    }

    moderation.status = 'changes_requested';
    moderation.reviewedBy = userId;
    moderation.reviewedAt = new Date();
    moderation.changesRequested = changes;
    if (notes) {
      moderation.adminNotes = notes;
    }

    await this.moderationRepository.save(moderation);

    // Update document verification status to changes_requested - not public
    await this.documentRepository.update(moderation.documentId, {
      verificationStatus: 'changes_requested',
      rejectionReason: changes,
      isVerified: false,
    });

    this.logger.log(`Changes requested for document ${moderation.documentId} by ${userId}`);

    // Notify teacher that changes are required
    try {
      if (moderation.document && moderation.document.user) {
        await this.userNotificationsService.notifyResourceChangesRequired(
          moderation.document.user.id,
          moderation.document.id,
          moderation.document.title || moderation.document.originalName,
          changes
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send changes required notification: ${error.message}`);
    }
  }
}
