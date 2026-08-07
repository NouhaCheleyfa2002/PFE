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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import type { Response } from 'express';
import axios from 'axios';
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

  @Get('proxy/:year/:month/:day/:filename')
  async proxyFile(
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('day') day: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filerUrl = process.env.SEAWEED_FILER_URL || 'http://localhost:8888';
      const fullPath = `/uploads/${year}/${month}/${day}/${filename}`;
      
      console.log('Proxying file:', fullPath);
      console.log('From:', `${filerUrl}${fullPath}`);
      
      // Fetch from SeaweedFS
      const response = await axios.get(`${filerUrl}${fullPath}`, {
        responseType: 'arraybuffer',
      });

      // Determine content type from file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      let contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Override content type for known extensions
      if (ext === 'pdf') contentType = 'application/pdf';
      if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (ext === 'pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      
      // Set headers for inline viewing
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', response.data.length.toString());
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
      
      console.log('Successfully proxied file, size:', response.data.length);
      console.log('Content-Type:', contentType);
      console.log('Content-Disposition: inline');
      
      return res.send(Buffer.from(response.data));
    } catch (error) {
      console.error('Proxy error:', error.message);
      console.error('Full error:', error);
      throw new HttpException(
        `Failed to fetch file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}