import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController, ExamRatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { 
  ResourceRating, 
  RatingVote, 
  ResourceBookmark, 
  ResourceDownload,
  TeacherFollow 
} from './entities/rating.entity';
import { DocumentsModule } from '../documents/documents.module';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { ExamEntity } from '../exams/entities/exam.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceRating,
      RatingVote,
      ResourceBookmark,
      ResourceDownload,
      TeacherFollow,
      ExamEntity,
    ]),
    DocumentsModule,
    UserNotificationsModule,
  ],
  controllers: [RatingsController, ExamRatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
