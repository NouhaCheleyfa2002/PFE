import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { SearchHistoryEntity } from './entities/search-history.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamPipelineService } from './exam-pipeline.service';
import { ExamParserService } from './exam-parser.service';
import { EmbeddingService } from './embedding.service';
import { VisualContentExtractorService } from './visual-content-extractor.service';
import { ImageExtractorService } from './image-extractor.service';
import { ImageEditorService } from './image-editor.service';
import { PDFImageExtractorService } from './pdf-image-extractor.service';
import { PDFDiagramExtractorService } from './pdf-diagram-extractor.service';
import { AIDiagramDetectorService } from './ai-diagram-detector.service';
import { PDFLayoutAnalyzerService } from './pdf-layout-analyzer.service';
import { ExamPipelineController } from './exam-pipeline.controller';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamQuestionEntity, SearchHistoryEntity, DocumentEntity]),
    ConfigModule,
    AiModule,
    forwardRef(() => DocumentsModule),
  ],
  controllers: [ExamPipelineController],
  providers: [
    ExamPipelineService, 
    ExamParserService, 
    EmbeddingService, 
    VisualContentExtractorService,
    ImageExtractorService,
    ImageEditorService,
    PDFImageExtractorService,
    PDFDiagramExtractorService,
    AIDiagramDetectorService,
    PDFLayoutAnalyzerService,
  ],
  exports: [
    ExamPipelineService, 
    VisualContentExtractorService,
    ImageExtractorService,
    ImageEditorService,
    PDFImageExtractorService,
    PDFDiagramExtractorService,
    AIDiagramDetectorService,
    PDFLayoutAnalyzerService,
  ],
})
export class ExamPipelineModule {}
