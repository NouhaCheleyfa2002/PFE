import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { UploadService } from '../upload/upload.service';
import { DocumentProcessorService } from './document-processor.service';

const ALLOWED_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILES = 10; // Maximum files per upload

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly uploadService: UploadService,
    private readonly processorService: DocumentProcessorService,
  ) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES))
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.sub;
    const uploadedDocuments = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new HttpException(
          `Invalid file type for ${file.originalname}. Only PDF files are allowed.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new HttpException(
          `File ${file.originalname} is too large. Maximum size is 100MB.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        // Step 1: Upload to SeaweedFS
        const uploadResult = await this.uploadService.uploadFile(file);

        // Step 2: Save metadata to DB
        const document = await this.documentsService.createDocument({
          userId,
          originalName: file.originalname,
          storageUrl: uploadResult.fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
        });

        uploadedDocuments.push({
          id: document.id,
          originalName: document.originalName,
          status: document.status,
          createdAt: document.createdAt,
        });
      } catch (error) {
        throw new HttpException(
          `Failed to upload ${file.originalname}: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return {
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
      documents: uploadedDocuments,
    };
  }

  @Get()
  async getMyDocuments(@Request() req: any) {
    const userId = req.user.sub;
    const documents = await this.documentsService.findByUserId(userId);
    
    return {
      total: documents.length,
      documents: documents.map((doc) => ({
        id: doc.id,
        originalName: doc.originalName,
        status: doc.status,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt,
        processedAt: doc.processedAt,
        ocrResultUrl: doc.ocrResultUrl,
        errorMessage: doc.errorMessage,
      })),
    };
  }

  @Get('stats')
  async getStats() {
    return this.documentsService.getDocumentStats();
  }

  @Get('processing-status')
  async getProcessingStatus() {
    return this.processorService.getProcessingStatus();
  }

  @Get(':id')
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

  @Get(':id/ocr-result')
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
}
