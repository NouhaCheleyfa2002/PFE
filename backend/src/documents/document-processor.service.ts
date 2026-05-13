import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { UploadService } from '../upload/upload.service';
import { DocumentStatus } from './document.interface';

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

        // Step 6: Mark as completed
        await this.documentsService.updateDocumentStatus(
          document.id,
          DocumentStatus.COMPLETED,
        );

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
