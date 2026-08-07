import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { ExamsController } from './exams.controller';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { DocumentProcessorService } from './document-processor.service';
import { UploadModule } from '../upload/upload.module';
import { DocumentEntity } from './entities/document.entity';
import { ExamPipelineModule } from '../exam-pipeline/exam-pipeline.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    UploadModule,
    forwardRef(() => ExamPipelineModule),
    forwardRef(() => ModerationModule),
  ],
  controllers: [DocumentsController, ExamsController],
  providers: [DocumentsService, OCRService, DocumentProcessorService],
  exports: [DocumentsService],
})
export class DocumentsModule { }
