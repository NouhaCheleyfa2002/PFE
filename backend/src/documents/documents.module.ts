import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { DocumentProcessorService } from './document-processor.service';
import { UploadModule } from '../upload/upload.module';
import { DocumentEntity } from './entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    UploadModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, OCRService, DocumentProcessorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
