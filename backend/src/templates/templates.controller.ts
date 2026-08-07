import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PremiumGuard } from '../auth/guards/premium.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { AiExtractorService } from './services/ai-extractor.service';
import { UploadService } from '../upload/upload.service';
import { ExamDataDto } from './dto/exam-data.dto';

/**
 * Template Controller
 * Handles REST endpoints for template management
 * Requirements: 17.1, 17.2 - Premium access control applied via guards
 * 
 * Note: GET endpoints allow all authenticated users (to view default template)
 * POST, PUT, DELETE require premium access (teacher or admin)
 */
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(
    private readonly templateService: TemplatesService,
    private readonly aiExtractorService: AiExtractorService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Create a new template
   * POST /templates
   * Requirements: 9.1-9.7, 17.1, 17.2 - Premium required
   */
  @Post()
  @UseGuards(PremiumGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req,
    @Body() dto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const userId = req.user.sub;
    const template = await this.templateService.createTemplate(userId, dto);
    
    return this.mapToResponseDto(template);
  }

  /**
   * Extract metadata from uploaded header document
   * POST /templates/extract
   * Requirements: 2.1-2.5, 3.1-3.8, 17.1, 17.2 - Premium required
   */
  @Post('extract')
  @UseGuards(PremiumGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async extractMetadata(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file format (PDF, PNG, JPG)
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only PDF, PNG, and JPG files are allowed.',
      );
    }

    // Validate file size (<10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(
        'File size exceeds the maximum limit of 10MB.',
      );
    }

    // Upload file to storage and get URL
    const uploadResult = await this.uploadService.uploadFile(file);

    const headerDocumentUrl = uploadResult.fileUrl;

    // Call AI extractor service to extract metadata
    const extractedMetadata = await this.aiExtractorService.extractWithRetry(
      headerDocumentUrl,
    );

    // Return extracted metadata
    return {
      institutionName: extractedMetadata.institutionName,
      institutionAddress: extractedMetadata.institutionAddress,
      contactPhone: extractedMetadata.contactPhone,
      contactEmail: extractedMetadata.contactEmail,
      academicYear: extractedMetadata.academicYear,
      logoBase64: extractedMetadata.logoBase64,
      logoPosition: extractedMetadata.logoPosition,
      detectedPlaceholders: extractedMetadata.detectedPlaceholders,
      headerDocumentUrl: headerDocumentUrl,
    };
  }

  /**
   * Extract template from document (for import feature)
   * POST /templates/extract-from-document
   * Requirements: Template import with AI extraction
   * Note: Available to all authenticated users
   */
  @Post('extract-from-document')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async extractFromDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file format (PDF, PNG, JPG, Word)
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only PDF, PNG, JPG, and Word files are allowed.',
      );
    }

    // Validate file size (<10MB)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      throw new BadRequestException(
        'File size exceeds the maximum limit of 10MB.',
      );
    }

    // Upload file to storage and get URL
    const uploadResult = await this.uploadService.uploadFile(file);
    const documentUrl = uploadResult.fileUrl;

    // Call AI extractor service to extract metadata
    const extractedMetadata = await this.aiExtractorService.extractWithRetry(
      documentUrl,
    );

    // Return extracted metadata with logo URL
    return {
      institutionName: extractedMetadata.institutionName,
      institutionAddress: extractedMetadata.institutionAddress,
      contactPhone: extractedMetadata.contactPhone,
      contactEmail: extractedMetadata.contactEmail,
      academicYear: extractedMetadata.academicYear,
      logoUrl: extractedMetadata.logoBase64 ? documentUrl : null, // Use document URL if logo detected
      logoPosition: extractedMetadata.logoPosition,
      detectedPlaceholders: extractedMetadata.detectedPlaceholders,
    };
  }

  /**
   * Get the default system template
   * GET /templates/default
   * Requirements: 1.2, 17.3
   * Note: Available to all authenticated users
   * IMPORTANT: This route must be defined BEFORE the :id route
   */
  @Get('default')
  @HttpCode(HttpStatus.OK)
  async getDefault(): Promise<TemplateResponseDto | null> {
    const template = await this.templateService.getDefaultTemplate();
    
    if (!template) {
      return null;
    }
    
    return this.mapToResponseDto(template);
  }

  /**
   * Get all templates for authenticated user
   * GET /templates
   * Requirements: 10.1-10.6
   * Note: Available to all authenticated users (to view default template)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req): Promise<TemplateResponseDto[]> {
    const userId = req.user.sub;
    const templates = await this.templateService.findAllByUser(userId);
    
    return templates.map((template) => this.mapToResponseDto(template));
  }

  /**
   * Get template by ID
   * GET /templates/:id
   * Requirements: 10.4
   * Note: Available to all authenticated users (to view default template)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TemplateResponseDto> {
    const userId = req.user.sub;
    const template = await this.templateService.findById(id, userId);
    
    return this.mapToResponseDto(template);
  }

  /**
   * Update template by ID
   * PUT /templates/:id
   * Requirements: 11.1-11.5, 17.1, 17.2 - Premium required
   */
  @Put(':id')
  @UseGuards(PremiumGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    const userId = req.user.sub;
    const template = await this.templateService.updateTemplate(id, userId, dto);
    
    return this.mapToResponseDto(template);
  }

  /**
   * Delete template by ID
   * DELETE /templates/:id
   * Requirements: 12.1-12.5, 17.1, 17.2 - Premium required
   */
  @Delete(':id')
  @UseGuards(PremiumGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.sub;
    await this.templateService.deleteTemplate(id, userId);
  }

  /**
   * Apply template to exam and return PDF
   * POST /templates/:id/apply
   * Requirements: 13.1-13.5
   * Note: Available to all authenticated users (to use default template)
   */
  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  async applyToExam(
    @Request() req,
    @Param('id') id: string,
    @Body() examDataDto: ExamDataDto,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user.sub;

    // Call service to apply template and generate PDF
    const pdfBuffer = await this.templateService.applyTemplateToExam(
      id,
      userId,
      examDataDto,
    );

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exam-${id}-${Date.now()}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Send PDF buffer
    res.send(pdfBuffer);
  }

  /**
   * Map template entity to response DTO
   * @param template Template entity
   * @returns TemplateResponseDto
   */
  private mapToResponseDto(template: any): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      userId: template.userId,
      institutionName: template.institutionName,
      institutionAddress: template.institutionAddress,
      contactPhone: template.contactPhone,
      contactEmail: template.contactEmail,
      academicYear: template.academicYear,
      logoUrl: template.logoUrl,
      logoPosition: template.logoPosition,
      footerText: template.footerText,
      watermarkText: template.watermarkText,
      watermarkOpacity: template.watermarkOpacity,
      pageMargins: template.pageMargins,
      pageOrientation: template.pageOrientation,
      fontFamily: template.fontFamily,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      placeholders: template.placeholders,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isDefault: template.isDefault,
      headerDocumentUrl: template.headerDocumentUrl,
    };
  }
}
