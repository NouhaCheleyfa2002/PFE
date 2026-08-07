import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserEntity } from '../auth/entities/user.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DocumentEntity,
      ExamQuestionEntity,
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
