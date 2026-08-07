import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ExamTemplateEntity } from './entities/exam-template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { AiExtractorService } from './services/ai-extractor.service';
import { TemplatePrinterService } from './services/template-printer.service';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { AiModule } from '../ai/ai.module';

/**
 * TemplatesModule
 * 
 * Registers all template-related components:
 * - TypeORM entity for ExamTemplate
 * - Controller for REST endpoints (TemplateController)
 * - Services: TemplateService, AiExtractorService
 * - File upload configuration via Multer (10MB limit)
 * 
 * Imported modules:
 * - TypeOrmModule.forFeature([ExamTemplate]) - Database access for exam templates
 * - AuthModule - Authentication guards and services
 * - UploadModule - File storage services (StorageModule equivalent)
 * - AiModule - AI services for metadata extraction
 * 
 * Exports:
 * - TemplateService - For use in other modules (e.g., Exam Builder)
 * 
 * Requirements: Integration requirement (Task 5.1)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ExamTemplateEntity]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit (Requirement 2.2)
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'), false);
        }
      },
    }),
    AuthModule,      // Provides authentication guards and JWT validation
    UploadModule,    // Provides file storage services (StorageModule equivalent)
    AiModule,        // Provides AI services for metadata extraction
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService, AiExtractorService, TemplatePrinterService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
