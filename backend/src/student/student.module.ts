import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamAttemptEntity } from '../exams/entities/exam-attempt.entity';
import { BookmarkEntity } from '../bookmarks/entities/bookmark.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseEntity,
      DocumentEntity,
      ExamAttemptEntity,
      BookmarkEntity,
    ]),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
