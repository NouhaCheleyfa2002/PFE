import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { EmbeddingService } from '../exam-pipeline/embedding.service';
import { DocumentsModule } from '../documents/documents.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ExamQuestionEntity, ResourceCollaboratorEntity]),
    forwardRef(() => DocumentsModule),
    forwardRef(() => CollaborationModule), // Import CollaborationModule to access CollaborationService
  ],
  controllers: [AiController],
  providers: [AiService, EmbeddingService],
  exports: [AiService],
})
export class AiModule {}
