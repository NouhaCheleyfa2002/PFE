import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { BookmarkEntity } from './entities/bookmark.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookmarkEntity, DocumentEntity])],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
