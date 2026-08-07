import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { AIAnalysisService } from './ai-analysis.service';
import { FileValidationService } from './file-validation.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { QuestionExtractionService } from './question-extraction.service';
import { DocumentModerationEntity } from './entities/document-moderation.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { PDFDiagramExtractorService } from '../exam-pipeline/pdf-diagram-extractor.service';
import { AIDiagramDetectorService } from '../exam-pipeline/ai-diagram-detector.service';
import { PDFLayoutAnalyzerService } from '../exam-pipeline/pdf-layout-analyzer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentModerationEntity, DocumentEntity, ExamQuestionEntity]),
    AiModule,
    forwardRef(() => DocumentsModule),
    UserNotificationsModule,
  ],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    AIAnalysisService,
    FileValidationService,
    DuplicateDetectionService,
    QuestionExtractionService,
    PDFDiagramExtractorService,
    AIDiagramDetectorService,
    PDFLayoutAnalyzerService,
  ],
  exports: [
    ModerationService,
    AIAnalysisService,
    FileValidationService,
    DuplicateDetectionService,
    QuestionExtractionService,
  ],
})
export class ModerationModule {}
