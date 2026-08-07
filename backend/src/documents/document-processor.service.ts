import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { UploadService } from '../upload/upload.service';
import { DocumentStatus } from './document.interface';
import { ExamPipelineService } from '../exam-pipeline/exam-pipeline.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class DocumentProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly ocrService: OCRService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
    private readonly examPipelineService: ExamPipelineService,
    @Inject(forwardRef(() => ModerationService))
    private readonly moderationService: ModerationService,
  ) {
    // Poll every 5 seconds by default
    this.pollIntervalMs = this.configService.get<number>('DOCUMENT_POLL_INTERVAL_MS', 5000);
  }

  onModuleInit() {
    this.logger.log('Document Processor Worker starting...');
    this.startProcessing();
  }

  onModuleDestroy() {
    this.logger.log('Document Processor Worker stopping...');
    this.stopProcessing();
  }

  private startProcessing() {
    this.processingInterval = setInterval(async () => {
      await this.processNextDocument();
    }, this.pollIntervalMs);

    this.logger.log(`Worker started, polling every ${this.pollIntervalMs}ms`);
  }

  private stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  async processNextDocument(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      // Step 1: Get next pending document (FIFO)
      const document = await this.documentsService.getNextPendingDocument();

      if (!document) {
        // No pending documents
        return;
      }

      this.logger.log(`Processing document: ${document.id} - ${document.originalName}`);

      // Step 2: Mark as processing
      await this.documentsService.updateDocumentStatus(
        document.id,
        DocumentStatus.PROCESSING,
      );

      try {
        // Step 3: Send to Azure OCR
        const ocrResult = await this.ocrService.processDocument(
          document.id,
          document.storageUrl,
        );

        // Step 4: Save OCR result to SeaweedFS as JSON
        const ocrJsonBuffer = Buffer.from(JSON.stringify(ocrResult, null, 2), 'utf-8');
        const ocrFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: `${document.id}_ocr_result.json`,
          encoding: '7bit',
          mimetype: 'application/json',
          buffer: ocrJsonBuffer,
          size: ocrJsonBuffer.length,
        } as Express.Multer.File;

        const uploadResult = await this.uploadService.uploadFile(ocrFile);

        // Step 5: Update document with OCR result URL
        await this.documentsService.updateOcrResultUrl(document.id, uploadResult.fileUrl);

        // Step 6: Run Exam Pipeline (Parse → Embed → Store) + Extract Metadata
        try {
          this.logger.log(`Starting exam pipeline for document: ${document.id}`);
          
          // Extract text from OCR result
          const ocrText = ocrResult.pages.map((page) => page.text).join('\n\n');
          
          // Process through pipeline (includes metadata extraction)
          const pipelineResult = await this.examPipelineService.processDocument(
            document.id,
            ocrText,
          );

          this.logger.log(
            `Pipeline completed: ${pipelineResult.questionsStored}/${pipelineResult.questionsExtracted} questions stored`,
          );

          // Save extracted metadata to document ONLY if not already set manually
          if (pipelineResult.metadata) {
            const currentDoc = await this.documentsService.findById(document.id);
            
            if (currentDoc) {
              // Only update fields that are currently null (not manually set)
              const titleToSave = currentDoc.title || pipelineResult.metadata.title;
              const levelToSave = currentDoc.level || pipelineResult.metadata.level;
              const subjectToSave = currentDoc.subject || pipelineResult.metadata.subject;
              const yearToSave = currentDoc.year || pipelineResult.metadata.year;
              
              this.logger.log('Updating document with exam metadata (preserving manual values):', {
                title: titleToSave,
                level: levelToSave,
                subject: subjectToSave,
                year: yearToSave,
              });
              
              await this.documentsService.updateMetadata(document.id, {
                title: titleToSave,
                subject: subjectToSave,
                year: yearToSave,
              });
            }
          }

          if (pipelineResult.errors.length > 0) {
            this.logger.warn(`Pipeline warnings: ${pipelineResult.errors.join(', ')}`);
          }
        } catch (pipelineError) {
          // Log pipeline error but don't fail the document
          this.logger.error(
            `Exam pipeline failed for document ${document.id}:`,
            pipelineError,
          );
          // Continue to mark document as completed even if pipeline fails
        }

        // Step 7: Mark as completed
        await this.documentsService.updateDocumentStatus(
          document.id,
          DocumentStatus.COMPLETED,
        );

        // Step 8: Trigger AI Moderation (async, non-blocking)
        this.logger.log(`Triggering AI moderation for document: ${document.id}`);
        try {
          // Extract text from OCR result for moderation
          const ocrText = ocrResult.pages.map((page) => page.text).join('\n\n');
          
          // Set document verification status to under_review
          await this.documentsService.updateVerificationStatus(document.id, 'under_review');
          
          await this.moderationService.createModerationForDocument(document.id, ocrText);
          this.logger.log(`AI moderation triggered for document ${document.id}`);
        } catch (moderationError) {
          // Log but don't fail document if moderation fails
          this.logger.error(`Failed to trigger moderation for document ${document.id}:`, moderationError);
        }

        this.logger.log(`Document ${document.id} processed successfully`);
      } catch (error) {
        // Mark as failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.documentsService.updateDocumentStatus(
          document.id,
          DocumentStatus.FAILED,
          errorMessage,
        );

        this.logger.error(`Document ${document.id} processing failed:`, error);
      }
    } catch (error) {
      this.logger.error('Error in document processing loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getProcessingStatus(): Promise<{
    isProcessing: boolean;
    stats: any;
  }> {
    const stats = await this.documentsService.getDocumentStats();
    return {
      isProcessing: this.isProcessing,
      stats,
    };
  }
}
