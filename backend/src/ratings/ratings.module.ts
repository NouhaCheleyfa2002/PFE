import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceRating,
      RatingVote,
      ResourceBookmark,
      ResourceDownload,
      TeacherFollow,
    ]),
    DocumentsModule,
    UserNotificationsModule,
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
