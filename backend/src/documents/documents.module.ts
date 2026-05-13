import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { DocumentProcessorService } from './document-processor.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, OCRService, DocumentProcessorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
