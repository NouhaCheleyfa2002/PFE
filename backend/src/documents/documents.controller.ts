import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentsService } from './documents.service';
import { UploadService } from '../upload/upload.service';
import { DocumentProcessorService } from './document-processor.service';
import { FileValidationService } from '../moderation/file-validation.service';
import { ModerationService } from '../moderation/moderation.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10; // Maximum files per upload

@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly uploadService: UploadService,
    private readonly processorService: DocumentProcessorService,
    private readonly fileValidationService: FileValidationService,
    @Inject(forwardRef(() => ModerationService))
    private readonly moderationService: ModerationService,
  ) {}

  // Public endpoint - no authentication required
  @Get('public')
  async getPublicDocuments() {
    try {
      const documents = await this.documentsService.getLibraryDocuments();
      return documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        subject: doc.subject,
        classLevel: doc.classLevel,
        resourceType: doc.resourceType,
        downloads: doc.downloads || 0,
        rating: doc.averageRating || 0,
        price: doc.price || 0,
        license: doc.license || 'free',
        createdAt: doc.createdAt,
      }));
    } catch (error) {
      console.error('[DocumentsController] Public documents error:', error);
      throw error;
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', MAX_FILES))
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.sub;
    
    // Extract manual metadata from form
    const manualMetadata = {
      title: body.title || null,
      classLevel: body.classLevel || body.level || null, // Accept both classLevel and level
      subject: body.subject || null,
      year: body.year ? parseInt(body.year, 10) : null,
      resourceType: body.resourceType || 'Course Material',
      keywords: body.keywords ? body.keywords.split(',').map((k: string) => k.trim()) : null,
      description: body.description || null,
      license: body.license || 'free',
      price: body.price ? parseFloat(body.price) : null,
    };

    console.log('[DocumentsController] Upload metadata:', manualMetadata);

    const uploadedDocuments: Array<{
      id: string;
      originalName: string;
      status: string;
      createdAt: Date;
      storageUrl?: string;
    }> = [];

    const validationErrors: string[] = [];

    for (const file of files) {
      try {
        // PHASE 2: Comprehensive File Validation
        this.logger.log(`Validating file: ${file.originalname}`);
        
        const validationResult = await this.fileValidationService.validateFile(file);
        
        if (!validationResult.valid) {
          this.logger.warn(`File validation failed for ${file.originalname}: ${validationResult.errors.join(', ')}`);
          validationErrors.push(`${file.originalname}: ${validationResult.errors.join(', ')}`);
          continue; // Skip this file
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          this.logger.warn(`Validation warnings for ${file.originalname}: ${validationResult.warnings.join(', ')}`);
        }

        this.logger.log(`File validation passed for ${file.originalname} (${this.fileValidationService.getHumanReadableSize(file.size)})`);

        // Step 1: Upload to SeaweedFS
        const uploadResult = await this.uploadService.uploadFile(file);

        // Step 2: Save metadata to DB (only for PDFs - they need OCR processing)
        if (file.mimetype === 'application/pdf') {
          const document = await this.documentsService.createDocument({
            userId,
            originalName: file.originalname,
            storageUrl: uploadResult.fileUrl,
            fileSize: file.size,
            mimeType: file.mimetype,
          });

          // Step 3: If manual metadata provided, save it immediately
          if (manualMetadata.title || manualMetadata.classLevel || manualMetadata.subject || manualMetadata.year) {
            try {
              await this.documentsService.updateMetadata(document.id, {
                title: manualMetadata.title,
                classLevel: manualMetadata.classLevel,
                subject: manualMetadata.subject,
                year: manualMetadata.year,
                resourceType: manualMetadata.resourceType,
                keywords: manualMetadata.keywords,
                description: manualMetadata.description,
                license: manualMetadata.license,
                price: manualMetadata.price,
              });
            } catch (metadataError) {
              // Log but don't fail upload if metadata update fails
              console.error('Failed to update metadata:', metadataError);
            }
          }

          uploadedDocuments.push({
            id: document.id,
            originalName: document.originalName,
            status: document.status,
            createdAt: document.createdAt,
            storageUrl: document.storageUrl,
          });
        } else {
          // For non-PDF files, also create document entry (without OCR processing)
          const document = await this.documentsService.createDocument({
            userId,
            originalName: file.originalname,
            storageUrl: uploadResult.fileUrl,
            fileSize: file.size,
            mimeType: file.mimetype,
          });

          // Update status to completed immediately since no OCR needed
          await this.documentsService.updateDocumentStatus(document.id, 'completed' as any);

          // If manual metadata provided, save it
          if (manualMetadata.title || manualMetadata.classLevel || manualMetadata.subject || manualMetadata.year) {
            try {
              await this.documentsService.updateMetadata(document.id, {
                title: manualMetadata.title,
                classLevel: manualMetadata.classLevel,
                subject: manualMetadata.subject,
                year: manualMetadata.year,
                resourceType: manualMetadata.resourceType,
                keywords: manualMetadata.keywords,
                description: manualMetadata.description,
                license: manualMetadata.license,
                price: manualMetadata.price,
              });
            } catch (metadataError) {
              console.error('Failed to update metadata for non-PDF:', metadataError);
            }
          }

          uploadedDocuments.push({
            id: document.id,
            originalName: document.originalName,
            status: 'completed',
            createdAt: document.createdAt,
            storageUrl: document.storageUrl,
          });
        }
      } catch (error) {
        console.error('Upload error for file:', file.originalname, error);
        validationErrors.push(`${file.originalname}: ${error.message}`);
      }
    }

    // Return results with validation errors if any
    const response: any = {
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
      documents: uploadedDocuments,
    };

    if (validationErrors.length > 0) {
      response.errors = validationErrors;
      response.message = `Uploaded ${uploadedDocuments.length} document(s), ${validationErrors.length} failed validation`;
    }

    return response;
  }

  /**
   * Manually trigger question extraction for a document
   * POST /documents/:id/extract-questions
   */
  @Post(':id/extract-questions')
  @UseGuards(JwtAuthGuard)
  async manuallyExtractQuestions(@Param('id') id: string, @Request() req: any) {
    try {
      const document = await this.documentsService.findById(id);
      
      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      // Check if user owns the document or is admin
      const userId = req.user.sub;
      const userRole = req.user.role;
      if (document.userId !== userId && userRole !== 'admin') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      // Get OCR text from document
      if (!document.ocrResultUrl) {
        throw new HttpException('Document has not been processed yet', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Manually extracting questions for document: ${id}`);

      // Fetch OCR result
      const ocrResponse = await fetch(document.ocrResultUrl);
      if (!ocrResponse.ok) {
        throw new HttpException('Failed to fetch OCR result', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const ocrData = await ocrResponse.json();
      const ocrText = ocrData.pages?.map((p: any) => p.text).join('\n\n') || '';

      if (!ocrText || ocrText.length < 50) {
        throw new HttpException('No OCR text available', HttpStatus.BAD_REQUEST);
      }

      // Get moderation record
      const moderation = await this.moderationService.getModerationRecordByDocumentId(id);
      
      // Use the new public method
      const result = await this.moderationService.manuallyExtractQuestionsForDocument(
        document.id,
        ocrText,
        moderation?.aiDetectedSubject || document.subject || undefined,
        moderation?.aiDetectedGradeLevel || document.classLevel || undefined
      );

      if (result.success) {
        return {
          success: true,
          message: `Successfully extracted and saved ${result.questionsSaved} questions`,
          questionsFound: result.questionsFound,
          questionsSaved: result.questionsSaved,
        };
      } else {
        return {
          success: false,
          message: 'No questions found in document',
          error: result.error,
          questionsFound: 0,
        };
      }
    } catch (error) {
      this.logger.error(`Manual question extraction failed for ${id}:`, error);
      throw new HttpException(
        error.message || 'Failed to extract questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/moderation-status')
  @UseGuards(JwtAuthGuard)
  async getModerationStatus(@Param('id') id: string, @Request() req: any) {
    try {
      const document = await this.documentsService.findById(id);
      
      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      // Check if user owns the document or is admin
      const userId = req.user.sub;
      const userRole = req.user.role;
      if (document.userId !== userId && userRole !== 'admin') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      // Get moderation record
      const moderation = await this.moderationService.getModerationRecordByDocumentId(id);

      if (!moderation) {
        return {
          hasModeration: false,
          verificationStatus: document.verificationStatus,
          message: 'Moderation pending',
          // Return document's current metadata (will be auto-filled by AI after processing)
          metadata: {
            title: document.title,
            subject: document.subject,
            classLevel: document.classLevel,
            resourceType: document.resourceType,
            keywords: document.keywords,
            description: document.description,
            year: document.year,
            bacSection: document.bacSection,
          },
        };
      }

      return {
        hasModeration: true,
        verificationStatus: document.verificationStatus,
        isDuplicate: moderation.isDuplicate,
        duplicateSimilarity: moderation.duplicateSimilarityScore,
        duplicateOfId: moderation.duplicateOfId,
        overallScore: moderation.overallRiskScore,
        riskLevel: moderation.riskLevel,
        aiRecommendation: moderation.aiRecommendations,
        // Return AI-extracted metadata
        metadata: {
          title: document.title,
          subject: document.subject,
          classLevel: document.classLevel,
          resourceType: document.resourceType,
          keywords: document.keywords,
          description: document.description,
          year: document.year,
          bacSection: document.bacSection,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting moderation status for ${id}:`, error);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyDocuments(@Request() req: any) {
    const userId = req.user.sub;
    const documents = await this.documentsService.findByUserId(userId);
    
    // Debug logging
    console.log(`[DocumentsController] Fetching documents for user: ${userId}`);
    console.log(`[DocumentsController] Found ${documents.length} documents`);
    
    return {
      total: documents.length,
      userId: userId,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        originalName: doc.originalName,
        subject: doc.subject,
        classLevel: doc.classLevel,
        resourceType: doc.resourceType,
        status: doc.status,
        verificationStatus: doc.verificationStatus || 'pending',
        rejectionReason: doc.rejectionReason,
        fileSize: doc.fileSize,
        storageUrl: doc.storageUrl,
        views: doc.views || 0,
        downloads: doc.downloads || 0,
        averageRating: doc.averageRating || 0,
        totalRatings: doc.totalRatings || 0,
        license: doc.license,
        price: doc.price,
        keywords: doc.keywords || [],
        description: doc.description || null,
        createdAt: doc.createdAt,
        processedAt: doc.processedAt,
        ocrResultUrl: doc.ocrResultUrl,
        errorMessage: doc.errorMessage,
      })),
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.documentsService.getDocumentStats();
  }

  @Get('library')
  @UseGuards(JwtAuthGuard)
  async getLibrary() {
    try {
      const documents = await this.documentsService.getLibraryDocuments();
      return {
        documents,
        total: documents.length,
      };
    } catch (error) {
      console.error('[DocumentsController] Library endpoint error:', error);
      throw error;
    }
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async incrementViews(@Param('id') id: string, @Request() req: any) {
    await this.documentsService.incrementViews(id);
    return { message: 'View count incremented' };
  }

  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  async incrementDownloads(@Param('id') id: string, @Request() req: any) {
    await this.documentsService.incrementDownloads(id);
    return { message: 'Download count incremented' };
  }

  @Get('all/debug')
  @UseGuards(JwtAuthGuard)
  async getAllDocumentsDebug(@Request() req: any) {
    // Only allow admin to see all documents
    if (req.user.role !== 'admin') {
      throw new HttpException('Forbidden - Admin only', HttpStatus.FORBIDDEN);
    }
    
    const allDocuments = await this.documentsService.getAllDocuments();
    return {
      total: allDocuments.length,
      documents: allDocuments.map((doc) => ({
        id: doc.id,
        userId: doc.userId,
        originalName: doc.originalName,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
    };
  }

  @Get('processing-status')
  @UseGuards(JwtAuthGuard)
  async getProcessingStatus() {
    return this.processorService.getProcessingStatus();
  }

  @Get('teacher-analytics')
  @UseGuards(JwtAuthGuard)
  async getTeacherAnalytics(@Request() req: any) {
    const userId = req.user.sub;
    const analytics = await this.documentsService.getTeacherAnalytics(userId);

    return {
      success: true,
      analytics,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDocument(@Param('id') id: string, @Request() req: any) {
    const document = await this.documentsService.findById(id);
    
    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns the document (or is admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return document;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    const document = await this.documentsService.findById(id);
    
    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns the document (or is admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // Delete the document
    await this.documentsService.deleteDocument(id);

    return {
      message: 'Document deleted successfully',
      id,
    };
  }

  @Get(':id/ocr-result')
  @UseGuards(JwtAuthGuard)
  async getOCRResult(@Param('id') id: string, @Request() req: any) {
    const document = await this.documentsService.findById(id);
    
    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns the document (or is admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    if (!document.ocrResultUrl) {
      throw new HttpException(
        'OCR result not available yet',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      documentId: document.id,
      ocrResultUrl: document.ocrResultUrl,
      status: document.status,
    };
  }

  @Patch(':id/metadata')
  @UseGuards(JwtAuthGuard)
  async updateDocumentMetadata(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      classLevel?: string;
      subject?: string;
      year?: number;
      resourceType?: 'course' | 'exam';
      keywords?: string[];
      description?: string;
      license?: 'free' | 'paid' | 'open_access';
      price?: number;
      bacSection?: string;
    },
    @Request() req: any,
  ) {
    const document = await this.documentsService.findById(id);

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns the document (or is admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // Update metadata with all new fields
    const updated = await this.documentsService.updateMetadata(id, body);

    return {
      message: 'Metadata updated successfully',
      document: {
        id: updated.id,
        title: updated.title,
        classLevel: updated.classLevel,
        subject: updated.subject,
        year: updated.year,
        resourceType: updated.resourceType,
        keywords: updated.keywords,
        description: updated.description,
        license: updated.license,
        price: updated.price,
      },
    };
  }

  @Get('filter/search')
  @UseGuards(JwtAuthGuard)
  async searchDocuments(
    @Request() req: any,
    @Body()
    filters: {
      resourceType?: 'course' | 'exam';
      classLevel?: string;
      subject?: string;
      keywords?: string[];
      verified?: boolean;
      license?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const userId = req.user.sub;

    return this.documentsService.findDocumentsWithFilters({
      userId,
      ...filters,
    });
  }

  // Content Verification Endpoints

  @Get('pending-verification')
  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  async getPendingVerification(@Request() req: any) {
    // Only verified teachers and admins can review
    if (req.user.role === 'teacher' && !req.user.verified) {
      throw new HttpException(
        'Only verified teachers can review content',
        HttpStatus.FORBIDDEN,
      );
    }

    const documents = await this.documentsService.getPendingVerification();

    return {
      documents,
      total: documents.length,
    };
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  async verifyDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body()
    body: {
      action: 'approve' | 'reject';
      rejectionReason?: string;
    },
  ) {
    // Only verified teachers and admins can review
    if (req.user.role === 'teacher' && !req.user.verified) {
      throw new HttpException(
        'Only verified teachers can review content',
        HttpStatus.FORBIDDEN,
      );
    }

    const document = await this.documentsService.verifyDocument(
      id,
      req.user.sub,
      body.action,
      body.rejectionReason,
    );

    return {
      message: `Document ${body.action}ed successfully`,
      document: {
        id: document.id,
        verificationStatus: document.verificationStatus,
        verifiedAt: document.verifiedAt,
        isVerified: document.isVerified,
      },
    };
  }

  @Post('bulk-approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  async bulkApprove(
    @Request() req: any,
    @Body() body: { documentIds: string[] },
  ) {
    // Only verified teachers and admins can review
    if (req.user.role === 'teacher' && !req.user.verified) {
      throw new HttpException(
        'Only verified teachers can review content',
        HttpStatus.FORBIDDEN,
      );
    }

    const count = await this.documentsService.bulkApproveDocuments(
      body.documentIds,
      req.user.sub,
    );

    return {
      message: `Approved ${count} documents`,
      count,
    };
  }

  @Get('verification-stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'teacher')
  async getVerificationStats(@Request() req: any) {
    // Only verified teachers and admins can view stats
    if (req.user.role === 'teacher' && !req.user.verified) {
      throw new HttpException(
        'Only verified teachers can view statistics',
        HttpStatus.FORBIDDEN,
      );
    }

    const stats = await this.documentsService.getVerificationStats();

    return {
      success: true,
      stats,
    };
  }
}
