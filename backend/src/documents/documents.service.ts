import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/document.entity';
import { Document, DocumentStatus } from './document.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  async createDocument(data: {
    userId: string;
    originalName: string;
    storageUrl: string;
    fileSize: number;
    mimeType: string;
  }): Promise<Document> {
    const document = this.documentRepository.create({
      ...data,
      status: DocumentStatus.PENDING,
    });

    const saved = await this.documentRepository.save(document);
    this.logger.log(`Document created: ${saved.id} - ${saved.originalName}`);
    
    return saved;
  }

  async findById(id: string): Promise<Document | null> {
    return this.documentRepository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingDocuments(): Promise<Document[]> {
    return this.documentRepository.find({
      where: { status: DocumentStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async getNextPendingDocument(): Promise<Document | null> {
    const pending = await this.documentRepository.findOne({
      where: { status: DocumentStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
    return pending || null;
  }

  async updateDocumentStatus(
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
  ): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.status = status;
    document.updatedAt = new Date();
    
    if (status === DocumentStatus.COMPLETED || status === DocumentStatus.FAILED) {
      document.processedAt = new Date();
    }
    
    if (errorMessage) {
      document.errorMessage = errorMessage;
    }

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} status updated to: ${status}`);
    return updated;
  }

  async updateOcrResultUrl(id: string, ocrResultUrl: string): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.ocrResultUrl = ocrResultUrl;
    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} OCR result saved: ${ocrResultUrl}`);
    return updated;
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.documentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getDocumentStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [total, pending, processing, completed, failed] = await Promise.all([
      this.documentRepository.count(),
      this.documentRepository.count({ where: { status: DocumentStatus.PENDING } }),
      this.documentRepository.count({ where: { status: DocumentStatus.PROCESSING } }),
      this.documentRepository.count({ where: { status: DocumentStatus.COMPLETED } }),
      this.documentRepository.count({ where: { status: DocumentStatus.FAILED } }),
    ]);

    return { total, pending, processing, completed, failed };
  }
}
