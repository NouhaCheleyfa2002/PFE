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
      title: data.originalName, // Use filename as default title
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
    const document = await this.documentRepository.findOne({ where: { id } });
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
    return updated as Document;
  }

  async updateOcrResultUrl(id: string, ocrResultUrl: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.ocrResultUrl = ocrResultUrl;
    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} OCR result saved: ${ocrResultUrl}`);
    return updated as Document;
  }

  async updateVerificationStatus(id: string, verificationStatus: string): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    document.verificationStatus = verificationStatus;
    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} verification status updated to: ${verificationStatus}`);
    return updated as Document;
  }

  async updateMetadata(
    id: string,
    metadata: {
      title?: string | null;
      classLevel?: string | null;
      subject?: string | null;
      year?: number | null;
      resourceType?: 'course' | 'exam';
      keywords?: string[] | null;
      description?: string | null;
      license?: 'free' | 'paid' | 'open_access';
      price?: number | null;
      bacSection?: string | null;
    },
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Update all provided fields
    if (metadata.title !== undefined) document.title = metadata.title;
    if (metadata.classLevel !== undefined) document.classLevel = metadata.classLevel;
    if (metadata.subject !== undefined) document.subject = metadata.subject;
    if (metadata.year !== undefined) document.year = metadata.year;
    if (metadata.resourceType !== undefined) document.resourceType = metadata.resourceType;
    if (metadata.keywords !== undefined) document.keywords = metadata.keywords;
    if (metadata.description !== undefined) document.description = metadata.description;
    if (metadata.license !== undefined) document.license = metadata.license;
    if (metadata.price !== undefined) document.price = metadata.price;
    if (metadata.bacSection !== undefined) document.bacSection = metadata.bacSection;

    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${id} metadata updated manually`);
    return updated as Document;
  }

  /**
   * Find documents with enhanced filtering
   */
  async findDocumentsWithFilters(filters: {
    userId?: string;
    resourceType?: 'course' | 'exam';
    classLevel?: string;
    subject?: string;
    keywords?: string[];
    verified?: boolean;
    license?: string;
    status?: DocumentStatus;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      resourceType,
      classLevel,
      subject,
      keywords,
      verified,
      license,
      status = DocumentStatus.COMPLETED,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    let query = this.documentRepository
      .createQueryBuilder('doc')
      .leftJoin('users', 'user', 'doc.userId = user.id')
      .addSelect(['user.fullName', 'user.verified'])
      .where('doc.status = :status', { status });

    if (userId) {
      query = query.andWhere('doc.userId = :userId', { userId });
    }

    if (resourceType) {
      query = query.andWhere('doc.resourceType = :resourceType', { resourceType });
    }

    if (classLevel) {
      query = query.andWhere('doc.classLevel = :classLevel', { classLevel });
    }

    if (subject) {
      query = query.andWhere('LOWER(doc.subject) = LOWER(:subject)', { subject });
    }

    if (keywords && keywords.length > 0) {
      // Search for documents that have ANY of the provided keywords
      query = query.andWhere('doc.keywords && ARRAY[:...keywords]::text[]', { keywords });
    }

    if (verified !== undefined) {
      query = query.andWhere('doc.isVerified = :verified', { verified });
    }

    if (license) {
      query = query.andWhere('doc.license = :license', { license });
    }

    // Get total count
    const total = await query.getCount();

    // Get paginated results
    const documents = await query
      .orderBy('doc.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  /**
   * Get pending documents for verification (Admin/Verified Teachers)
   */
  async getPendingVerification(limit: number = 50): Promise<Document[]> {
    return this.documentRepository.find({
      where: {
        status: DocumentStatus.COMPLETED,
        verificationStatus: 'pending',
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Verify document (Approve/Reject)
   */
  async verifyDocument(
    documentId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    document.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    document.verifiedBy = reviewerId;
    document.verifiedAt = new Date();
    document.isVerified = action === 'approve';
    
    if (action === 'reject' && rejectionReason) {
      document.rejectionReason = rejectionReason;
    }

    document.updatedAt = new Date();

    const updated = await this.documentRepository.save(document);
    this.logger.log(`Document ${documentId} ${action}ed by reviewer ${reviewerId}`);
    return updated as Document;
  }

  /**
   * Bulk approve documents
   */
  async bulkApproveDocuments(documentIds: string[], reviewerId: string): Promise<number> {
    const result = await this.documentRepository
      .createQueryBuilder()
      .update(DocumentEntity)
      .set({
        verificationStatus: 'approved',
        verifiedBy: reviewerId,
        verifiedAt: new Date(),
        isVerified: true,
        updatedAt: new Date(),
      })
      .where('id IN (:...ids)', { ids: documentIds })
      .andWhere('status = :status', { status: DocumentStatus.COMPLETED })
      .execute();

    this.logger.log(`Bulk approved ${result.affected} documents by reviewer ${reviewerId}`);
    return result.affected || 0;
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const [pending, approved, rejected] = await Promise.all([
      this.documentRepository.count({
        where: {
          status: DocumentStatus.COMPLETED,
          verificationStatus: 'pending',
        },
      }),
      this.documentRepository.count({
        where: { verificationStatus: 'approved' },
      }),
      this.documentRepository.count({
        where: { verificationStatus: 'rejected' },
      }),
    ]);

    return { pending, approved, rejected };
  }

  /**
   * Get library documents - all published resources visible to all users
   */
  async getLibraryDocuments(): Promise<any[]> {
    // Use raw query since TypeORM query builder has issues with custom joins
    // IMPORTANT: PostgreSQL lowercases aliases, so we must quote them
    const documents = await this.documentRepository.query(`
      SELECT 
        doc.id as "doc_id",
        doc.title as "doc_title",
        doc."originalFileName" as "doc_originalFileName",
        doc.resource_type as "doc_resource_type",
        doc.subject as "doc_subject",
        doc.class_level as "doc_class_level",
        doc.level as "doc_level",
        doc."storageUrl" as "doc_storageUrl",
        doc."mimeType" as "doc_mimeType",
        doc."createdAt" as "doc_createdAt",
        doc.views as "doc_views",
        doc.downloads as "doc_downloads",
        doc.average_rating as "doc_average_rating",
        doc.total_ratings as "doc_total_ratings",
        doc.license as "doc_license",
        doc.price as "doc_price",
        doc.verification_status as "doc_verification_status",
        u.id as "user_id",
        u."fullName" as "user_fullName",
        u.verified as "user_verified"
      FROM documents doc
      LEFT JOIN users u ON doc."userId" = u.id
      WHERE doc.status = $1 AND doc.verification_status = $2
      ORDER BY doc."createdAt" DESC
    `, [DocumentStatus.COMPLETED, 'approved']);

    console.log('[DocumentsService] Found', documents.length, 'library documents');
    if (documents.length > 0) {
      console.log('[DocumentsService] Sample document:', JSON.stringify(documents[0], null, 2));
    }

    // Transform the raw results into the expected format
    return documents.map((row) => {
      // Parse fullName into firstName and lastName
      const fullName = row.user_fullName || 'Unknown User';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Determine type based on mimeType
      let type = 'Document';
      if (row.doc_mimeType === 'application/pdf') {
        type = 'PDF';
      } else if (row.doc_mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        type = 'DOCX';
      } else if (row.doc_mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        type = 'PPTX';
      }

      // Parse ratings - ensure they're numbers
      const averageRating = row.doc_average_rating ? parseFloat(row.doc_average_rating) : 0;
      const totalRatings = row.doc_total_ratings ? parseInt(row.doc_total_ratings, 10) : 0;

      console.log(`[DocumentsService] Document ${row.doc_id}: rating=${averageRating}, count=${totalRatings}, resourceType=${row.doc_resource_type}`);

      return {
        id: row.doc_id,
        title: row.doc_title || row.doc_originalFileName || 'Untitled',
        originalName: row.doc_originalFileName,
        author: {
          id: row.user_id,
          firstName,
          lastName,
          verified: row.user_verified || false,
        },
        type,
        resourceType: row.doc_resource_type || 'Course Material',
        subject: row.doc_subject || 'General',
        classLevel: row.doc_class_level || row.doc_level || 'Unknown',
        averageRating,
        totalRatings,
        downloads: row.doc_downloads || 0,
        views: row.doc_views || 0,
        storageUrl: row.doc_storageUrl,
        createdAt: row.doc_createdAt,
        license: row.doc_license || 'free',
        price: row.doc_price ? parseFloat(row.doc_price) : null,
      };
    });
  }

  /**
   * Increment document views
   */
  async incrementViews(documentId: string): Promise<void> {
    await this.documentRepository.increment({ id: documentId }, 'views', 1);
  }

  /**
   * Increment document downloads
   */
  async incrementDownloads(documentId: string): Promise<void> {
    await this.documentRepository.increment({ id: documentId }, 'downloads', 1);
  }

  /**
   * Get teacher analytics (views, downloads, ratings, bookmarks for their documents)
   */
  async getTeacherAnalytics(userId: string) {
    // Get all documents by this teacher
    const documents = await this.documentRepository
      .createQueryBuilder('doc')
      .where('doc."userId" = :userId', { userId })
      .andWhere('doc.status = :status', { status: DocumentStatus.COMPLETED })
      .getMany();

    if (documents.length === 0) {
      return {
        totalResources: 0,
        totalViews: 0,
        totalDownloads: 0,
        totalBookmarks: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        topResources: [],
      };
    }

    // Aggregate stats
    const totalViews = documents.reduce((sum, doc) => sum + (doc.views || 0), 0);
    const totalDownloads = documents.reduce((sum, doc) => sum + (doc.downloads || 0), 0);
    const totalBookmarks = documents.reduce((sum, doc) => sum + (doc.bookmarkCount || 0), 0);

    // Get rating stats
    const ratingsSum = documents.reduce((sum, doc) => sum + ((doc.averageRating || 0) * (doc.totalRatings || 0)), 0);
    const ratingsCount = documents.reduce((sum, doc) => sum + (doc.totalRatings || 0), 0);
    const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;
    
    // Get rating distribution (simplified - aggregated from documents)
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    documents.forEach(doc => {
      if (doc.averageRating && doc.totalRatings) {
        const rounded = Math.round(doc.averageRating);
        if (rounded >= 1 && rounded <= 5) {
          ratingDistribution[rounded as 1|2|3|4|5] += doc.totalRatings;
        }
      }
    });
    
    // Sort resources by different metrics for "top resources"
    const topByViews = [...documents]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(doc => ({
        id: doc.id,
        title: doc.title,
        subject: doc.subject || 'General',
        classLevel: doc.classLevel || 'Unknown',
        views: doc.views || 0,
        downloads: doc.downloads || 0,
        rating: doc.averageRating || 0,
        totalRatings: doc.totalRatings || 0,
        bookmarks: doc.bookmarkCount || 0,
      }));

    return {
      totalResources: documents.length,
      totalViews,
      totalDownloads,
      totalBookmarks,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      topResources: topByViews,
    };
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    await this.documentRepository.remove(document);
    this.logger.log(`Document ${documentId} deleted successfully`);
  }
}
