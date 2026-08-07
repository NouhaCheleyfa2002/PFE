import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { EmbeddingService } from '../exam-pipeline/embedding.service';
import { DocumentsService } from '../documents/documents.service';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ExamQuestionEntity, DocumentEntity]),
  ],
  controllers: [AiController],
  providers: [AiService, EmbeddingService, DocumentsService],
  exports: [AiService],
})
export class AiModule {}
