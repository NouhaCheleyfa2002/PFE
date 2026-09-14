import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamAttemptsService } from './exam-attempts.service';
import { ExamDocumentGeneratorService } from './services/exam-document-generator.service';
import { ExamsController } from './exams.controller';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamEntity } from './entities/exam.entity';
import { ExamSubmissionEntity } from './entities/exam-submission.entity';
import { ExamQuestionSetEntity } from './entities/exam-question-set.entity';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { ExamAnswerEntity } from './entities/exam-answer.entity';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';
import { ExamCollaboratorEntity } from '../collaboration/entities/exam-collaborator.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { MailModule } from '../mail/mail.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamEntity,
      ExamSubmissionEntity,
      ExamQuestionSetEntity,
      ExamAttemptEntity,
      ExamAnswerEntity,
      ResourceCollaboratorEntity,
      ExamCollaboratorEntity,
      PurchaseEntity,
    ]),
    forwardRef(() => CollaborationModule),
    forwardRef(() => UserNotificationsModule),
    MailModule,
    UploadModule,
  ],
  providers: [ExamsService, ExamAttemptsService, ExamDocumentGeneratorService],
  controllers: [ExamsController, ExamAttemptsController],
  exports: [ExamsService, ExamAttemptsService],
})
export class ExamsModule {}
