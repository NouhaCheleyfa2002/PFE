import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import type { Multer } from 'multer';

type MulterFile = Express.Multer.File;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Only PDF, DOCX, and PPTX files are allowed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException(
        'File too large. Maximum size is 100MB.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.uploadService.uploadFile(file);
  }

  @Get(':fid')
  async getFile(@Param('fid') fid: string) {
    return this.uploadService.getFile(fid);
  }

  @Delete(':fid')
  async deleteFile(@Param('fid') fid: string) {
    return this.uploadService.deleteFile(fid);
  }
}