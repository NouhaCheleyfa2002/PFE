import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamEntity } from './entities/exam.entity';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamEntity, ResourceCollaboratorEntity]),
    forwardRef(() => CollaborationModule),
    forwardRef(() => UserNotificationsModule),
  ],
  providers: [ExamsService],
  controllers: [ExamsController],
  exports: [ExamsService],
})
export class ExamsModule {}
