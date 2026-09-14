import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';
import {
  ResourceCollaboratorEntity,
  ExamCollaboratorEntity,
  ExamSessionEntity,
  QuestionLockEntity,
  CollaborationCommentEntity,
  CollaborationVersionEntity,
  CollaborationActivityEntity,
} from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamEntity } from '../exams/entities/exam.entity';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceCollaboratorEntity,
      ExamCollaboratorEntity,
      ExamSessionEntity,
      QuestionLockEntity,
      CollaborationCommentEntity,
      CollaborationVersionEntity,
      CollaborationActivityEntity,
      UserEntity,
      DocumentEntity,
      ExamEntity,
    ]),
    forwardRef(() => UserNotificationsModule),
    MailModule,
  ],
  providers: [CollaborationService],
  controllers: [CollaborationController],
  exports: [CollaborationService],
})
export class CollaborationModule {}
