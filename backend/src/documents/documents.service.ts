import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Document, DocumentStatus } from './document.interface';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  // In-memory document store (replace with database in production)
  private documents: Document[] = [];

  async createDocument(data: {
    userId: string;
    originalName: string;
    storageUrl: string;
    fileSize: number;
    mimeType: string;
  }): Promise<Document> {
    const document: Document = {
      id: randomUUID(),
      userId: data.userId,
      originalName: data.originalName,
      storageUrl: data.storageUrl,
      status: DocumentStatus.PENDING,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.documents.push(document);
    this.logger.log(`Document created: ${document.id} - ${document.originalName}`);
    
    return document;
  }

  async findById(id: string): Promise<Document | null> {
    const document = this.documents.find((doc) => doc.id === id);
    return document || null;
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return this.documents.filter((doc) => doc.userId === userId);
  }

  async findPendingDocuments(): Promise<Document[]> {
    return this.documents
      .filter((doc) => doc.status === DocumentStatus.PENDING)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getNextPendingDocument(): Promise<Document | null> {
    const pending = await this.findPendingDocuments();
    return pending.length > 0 ? pending[0] : null;
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

    this.logger.log(`Document ${id} status updated to: ${status}`);
    return document;
  }

  async updateOcrResultUrl(id: string, ocrResultUrl: string): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.ocrResultUrl = ocrResultUrl;
    document.updatedAt = new Date();

    this.logger.log(`Document ${id} OCR result saved: ${ocrResultUrl}`);
    return document;
  }

  async getAllDocuments(): Promise<Document[]> {
    return this.documents;
  }

  async getDocumentStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    return {
      total: this.documents.length,
      pending: this.documents.filter((d) => d.status === DocumentStatus.PENDING).length,
      processing: this.documents.filter((d) => d.status === DocumentStatus.PROCESSING).length,
      completed: this.documents.filter((d) => d.status === DocumentStatus.COMPLETED).length,
      failed: this.documents.filter((d) => d.status === DocumentStatus.FAILED).length,
    };
  }
}
