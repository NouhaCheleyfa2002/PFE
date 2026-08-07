import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { QuestionsModule } from './questions/questions.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { ExamPipelineModule } from './exam-pipeline/exam-pipeline.module';
import { EducationSystemModule } from './education-system/education-system.module';
import { ProfileModule } from './profile/profile.module';
import { VerificationModule } from './verification/verification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UserNotificationsModule } from './user-notifications/user-notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ModerationModule } from './moderation/moderation.module';
import { TemplatesModule } from './templates/templates.module';
import { getTypeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    UploadModule,
    AuthModule,
    NotificationModule,
    AdminModule,
    QuestionsModule,
    DocumentsModule,
    AiModule,
    ExamPipelineModule,
    EducationSystemModule,
    ProfileModule,
    VerificationModule,
    AnalyticsModule,
    UserNotificationsModule,
    RatingsModule,
    BookmarksModule,
    PurchasesModule,
    ModerationModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
