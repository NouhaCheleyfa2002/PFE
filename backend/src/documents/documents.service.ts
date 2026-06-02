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

  async updateExamMetadata(
    id: string,
    title: string | null,
    level: string | null,
    subject: string | null,
    year: number | null,
  ): Promise<Document> {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.title = title || undefined;
    document.level = level || undefined;
    document.subject = subject || undefined;
    document.year = year || undefined;
    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} metadata updated: ${title} (${level}, ${subject}, ${year})`);
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

  /**
   * Find exams (completed documents) with optional filters
   */
  async findExams(filters: {
    level?: string;
    subject?: string;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const { level, subject, year, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    let query = this.documentRepository
      .createQueryBuilder('doc')
      .where('doc.status = :status', { status: DocumentStatus.COMPLETED });

    if (level) {
      query = query.andWhere('LOWER(doc.level) = LOWER(:level)', { level });
    }

    if (subject) {
      query = query.andWhere('LOWER(doc.subject) = LOWER(:subject)', { subject });
    }

    if (year) {
      query = query.andWhere('doc.year = :year', { year });
    }

    // Get total count
    const total = await query.getCount();

    // Get paginated results with question count
    const exams = await query
      .leftJoinAndSelect('doc.questions', 'questions')
      .orderBy('doc.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Format response
    const formattedExams = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      level: exam.level,
      subject: exam.subject,
      year: exam.year,
      originalName: exam.originalName,
      questionsCount: exam.questions?.length || 0,
      status: exam.status,
      createdAt: exam.createdAt,
      processedAt: exam.processedAt,
      userId: exam.userId,
    }));

    return {
      exams: formattedExams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get exam statistics
   */
  async getExamStats() {
    const totalExams = await this.documentRepository.count({
      where: { status: DocumentStatus.COMPLETED },
    });

    // Get by level
    const byLevel = await this.documentRepository
      .createQueryBuilder('doc')
      .select('doc.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .andWhere('doc.level IS NOT NULL')
      .groupBy('doc.level')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Get by subject
    const bySubject = await this.documentRepository
      .createQueryBuilder('doc')
      .select('doc.subject', 'subject')
      .addSelect('COUNT(*)', 'count')
      .where('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .andWhere('doc.subject IS NOT NULL')
      .groupBy('doc.subject')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Get by year
    const byYear = await this.documentRepository
      .createQueryBuilder('doc')
      .select('doc.year', 'year')
      .addSelect('COUNT(*)', 'count')
      .where('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .andWhere('doc.year IS NOT NULL')
      .groupBy('doc.year')
      .orderBy('doc.year', 'DESC')
      .getRawMany();

    return {
      totalExams,
      byLevel: byLevel.map((r) => ({ level: r.level, count: parseInt(r.count, 10) })),
      bySubject: bySubject.map((r) => ({ subject: r.subject, count: parseInt(r.count, 10) })),
      byYear: byYear.map((r) => ({ year: r.year, count: parseInt(r.count, 10) })),
    };
  }

  /**
   * Get all unique levels
   */
  async getAllLevels(): Promise<string[]> {
    const results = await this.documentRepository
      .createQueryBuilder('doc')
      .select('DISTINCT doc.level', 'level')
      .where('doc.level IS NOT NULL')
      .andWhere('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .orderBy('doc.level', 'ASC')
      .getRawMany();

    return results.map((r) => r.level).filter(Boolean);
  }

  /**
   * Get all unique subjects
   */
  async getAllSubjects(): Promise<string[]> {
    const results = await this.documentRepository
      .createQueryBuilder('doc')
      .select('DISTINCT doc.subject', 'subject')
      .where('doc.subject IS NOT NULL')
      .andWhere('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .orderBy('doc.subject', 'ASC')
      .getRawMany();

    return results.map((r) => r.subject).filter(Boolean);
  }

  /**
   * Get all unique years
   */
  async getAllYears(): Promise<number[]> {
    const results = await this.documentRepository
      .createQueryBuilder('doc')
      .select('DISTINCT doc.year', 'year')
      .where('doc.year IS NOT NULL')
      .andWhere('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .orderBy('doc.year', 'DESC')
      .getRawMany();

    return results.map((r) => r.year).filter(Boolean);
  }
}
