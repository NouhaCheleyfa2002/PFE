import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { ExamPipelineService } from './exam-pipeline.service';
import { ExamParserService } from './exam-parser.service';
import { EmbeddingService } from './embedding.service';
import { ExamPipelineController } from './exam-pipeline.controller';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamQuestionEntity]),
    ConfigModule,
    AiModule,
    forwardRef(() => DocumentsModule),
  ],
  controllers: [ExamPipelineController],
  providers: [ExamPipelineService, ExamParserService, EmbeddingService],
  exports: [ExamPipelineService],
})
export class ExamPipelineModule {}
