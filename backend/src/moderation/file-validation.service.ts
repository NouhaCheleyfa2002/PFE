import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    originalName: string;
    size: number;
    mimeType: string;
    extension: string;
  };
}

export interface VirusScanResult {
  clean: boolean;
  threat?: string;
  scanTime: number;
}

@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);

  // Allowed MIME types
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'image/jpeg',
    'image/jpg',
    'image/png',
    'video/mp4', // Videos for verification
    'video/quicktime', // .mov files
    'video/x-msvideo', // .avi files
  ];

  // Allowed extensions
  private readonly ALLOWED_EXTENSIONS = [
    '.pdf',
    '.docx',
    '.pptx',
    '.jpg',
    '.jpeg',
    '.png',
    '.mp4', // Video files
    '.mov',
    '.avi',
  ];

  // Size limits (in bytes)
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MIN_FILE_SIZE = 1024; // 1KB

  /**
   * Validate file before processing
   */
  async validateFile(file: Express.Multer.File): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.log(`Validating file: ${file.originalname} (${file.size} bytes)`);

    // 1. Check if file exists
    if (!file || !file.buffer) {
      errors.push('No file data provided');
      return this.createResult(false, errors, warnings, file);
    }

    // 2. Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (file.size < this.MIN_FILE_SIZE) {
      errors.push(`File size is too small (minimum ${this.MIN_FILE_SIZE} bytes)`);
    }

    // 3. Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push(`Invalid file type: ${file.mimetype}. Allowed types: PDF, DOCX, PPTX, JPG, PNG, MP4, MOV, AVI`);
    }

    // 4. Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`Invalid file extension: ${extension}`);
    }

    // 5. Check filename length
    if (file.originalname.length > 255) {
      warnings.push('Filename is very long and will be truncated');
    }

    // 6. Check for suspicious patterns in filename
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.sh$/i,
      /\.js$/i,
      /\.vbs$/i,
      /\.scr$/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        errors.push('Suspicious file extension detected');
        break;
      }
    }

    // 7. Validate file integrity based on type
    if (file.mimetype === 'application/pdf') {
      const isPdfValid = this.validatePdfStructure(file.buffer);
      if (!isPdfValid) {
        errors.push('Invalid or corrupted PDF file');
      }
    }

    const valid = errors.length === 0;

    this.logger.log(`File validation ${valid ? 'passed' : 'failed'} for ${file.originalname}`);
    if (errors.length > 0) {
      this.logger.warn(`Validation errors: ${errors.join(', ')}`);
    }

    return this.createResult(valid, errors, warnings, file);
  }

  /**
   * Scan file for viruses using ClamAV
   * NOTE: Requires ClamAV to be installed on the system
   */
  async scanForVirus(filePath: string): Promise<VirusScanResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Scanning file for viruses: ${filePath}`);

      // Check if ClamAV is available
      const isClamAvailable = await this.checkClamAvInstalled();

      if (!isClamAvailable) {
        this.logger.warn('ClamAV not installed, skipping virus scan');
        return {
          clean: true, // Assume clean if scanner not available
          scanTime: Date.now() - startTime,
        };
      }

      // Run ClamAV scan
      const { stdout, stderr } = await execAsync(`clamscan --no-summary "${filePath}"`);

      const scanTime = Date.now() - startTime;

      // Check if virus was found
      if (stdout.includes('FOUND') || stderr.includes('FOUND')) {
        const threatMatch = stdout.match(/:\s*(.+?)\s+FOUND/);
        const threat = threatMatch ? threatMatch[1] : 'Unknown threat';

        this.logger.error(`Virus detected in file ${filePath}: ${threat}`);

        return {
          clean: false,
          threat,
          scanTime,
        };
      }

      this.logger.log(`File ${filePath} is clean (scan time: ${scanTime}ms)`);

      return {
        clean: true,
        scanTime,
      };
    } catch (error) {
      // If ClamAV returns non-zero exit code (virus found), it throws an error
      if (error.stdout && error.stdout.includes('FOUND')) {
        const threatMatch = error.stdout.match(/:\s*(.+?)\s+FOUND/);
        const threat = threatMatch ? threatMatch[1] : 'Unknown threat';

        this.logger.error(`Virus detected: ${threat}`);

        return {
          clean: false,
          threat,
          scanTime: Date.now() - startTime,
        };
      }

      // Other errors (ClamAV not found, etc.)
      this.logger.warn(`Virus scan failed: ${error.message}`);

      // Return clean if scan fails (fail-open approach)
      return {
        clean: true,
        scanTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if ClamAV is installed
   */
  private async checkClamAvInstalled(): Promise<boolean> {
    try {
      await execAsync('clamscan --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate PDF file structure (basic check)
   */
  private validatePdfStructure(buffer: Buffer): boolean {
    try {
      // Check PDF header
      const header = buffer.slice(0, 5).toString('utf-8');
      if (!header.startsWith('%PDF-')) {
        return false;
      }

      // Check for EOF marker (%%EOF)
      const tail = buffer.slice(-1024).toString('utf-8');
      if (!tail.includes('%%EOF')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create validation result object
   */
  private createResult(
    valid: boolean,
    errors: string[],
    warnings: string[],
    file: Express.Multer.File,
  ): FileValidationResult {
    return {
      valid,
      errors,
      warnings,
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        extension: path.extname(file.originalname).toLowerCase(),
      },
    };
  }

  /**
   * Get human-readable file size
   */
  getHumanReadableSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Sanitize filename to prevent path traversal attacks
   */
  sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    let sanitized = filename.replace(/[\/\\]/g, '_');
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext).substring(0, 250 - ext.length);
      sanitized = name + ext;
    }
    
    return sanitized;
  }
}
