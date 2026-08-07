import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class UploadService {
  private readonly masterUrl = process.env.SEAWEED_MASTER_URL || 'http://localhost:9333';
  private readonly filerUrl = process.env.SEAWEED_FILER_URL || 'http://localhost:8888';

  // Replace Docker internal hostnames with localhost when running outside Docker
  private normalizeUrl(url: string): string {
    return url
      .replace('seaweed-volume', 'localhost')
      .replace('seaweed-master', 'localhost')
      .replace('seaweed-filer', 'localhost');
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{
    fid: string;
    fileName: string;
    fileUrl: string;
    size: number;
  }> {
    try {
      // Upload to filer so files appear in the filer UI
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      // Create a path based on current date for organization
      const now = new Date();
      const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `/uploads/${datePath}/${fileName}`;

      const uploadResponse = await axios.post(
        `${this.filerUrl}${filePath}`,
        formData,
        {
          headers: formData.getHeaders(),
        },
      );

      // Return URL through our proxy endpoint for proper headers
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const fileUrl = `${backendUrl}/upload/proxy/${datePath}/${fileName}`;

      return {
        fid: filePath, // Use the path as the file ID
        fileName: file.originalname,
        fileUrl: fileUrl,
        size: file.size,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `File upload failed: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFile(fid: string): Promise<{ url: string }> {
    try {
      // If fid starts with /, it's a filer path
      if (fid.startsWith('/')) {
        return {
          url: `${this.filerUrl}${fid}`,
        };
      }

      // Legacy: Lookup via master for old-style fids
      const lookupResponse = await axios.get(
        `${this.masterUrl}/dir/lookup?volumeId=${fid.split(',')[0]}`,
      );

      if (!lookupResponse.data.locations || lookupResponse.data.locations.length === 0) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      const location = lookupResponse.data.locations[0];
      return {
        url: `http://${this.normalizeUrl(location.url)}/${fid}`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get file: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(fid: string): Promise<{ success: boolean }> {
    try {
      // If fid starts with /, delete via filer
      if (fid.startsWith('/')) {
        await axios.delete(`${this.filerUrl}${fid}`);
        return { success: true };
      }

      // Legacy: Delete via volume server
      const { url } = await this.getFile(fid);
      await axios.delete(url);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to delete file: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
