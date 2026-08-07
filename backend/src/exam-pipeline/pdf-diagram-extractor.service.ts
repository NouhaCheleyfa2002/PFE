import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
import sharp from 'sharp';

export interface ExtractedDiagram {
  imageData: string; // base64
  mimeType: string;
  width: number;
  height: number;
  pageNumber: number;
  type: 'diagram' | 'chart' | 'table' | 'image';
}

// PDF.js configuration for Node.js environment

@Injectable()
export class PDFDiagramExtractorService {
  private readonly logger = new Logger(PDFDiagramExtractorService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  /**
   * Render a PDF page as a high-resolution image using PDF.js
   * This is a working implementation that properly converts PDF to image
   */
  async renderPDFPageAsImage(
    pdfUrl: string,
    pageNumber: number,
  ): Promise<string | null> {
    try {
      this.logger.log(`Rendering PDF page ${pageNumber} from: ${pdfUrl}`);

      // Download the PDF file
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        this.logger.error(`Failed to download PDF: ${response.status}`);
        return null;
      }

      const pdfBuffer = await response.arrayBuffer();
      const pdfData = new Uint8Array(pdfBuffer);

      this.logger.log(`PDF downloaded, size: ${pdfData.length} bytes`);

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;

      this.logger.log(`PDF loaded, total pages: ${pdfDocument.numPages}`);

      if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
        this.logger.error(`Invalid page number ${pageNumber}, PDF has ${pdfDocument.numPages} pages`);
        return null;
      }

      // Get the specific page
      const page = await pdfDocument.getPage(pageNumber);

      // Set scale for high resolution (2x for better quality)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      // Create canvas for rendering
      const canvas = this.createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      if (!context) {
        this.logger.error('Failed to get canvas context');
        return null;
      }

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      this.logger.log(`Page ${pageNumber} rendered: ${viewport.width}x${viewport.height}px`);

      // Convert canvas to PNG buffer
      const imageBuffer = canvas.toBuffer('image/png');
      const base64 = imageBuffer.toString('base64');

      // Clean up
      await pdfDocument.destroy();

      return base64;
    } catch (error) {
      this.logger.error(`Failed to render PDF page ${pageNumber}:`, error);
      return null;
    }
  }

  /**
   * Create a canvas for PDF rendering
   * Uses node-canvas in Node.js environment
   */
  private createCanvas(width: number, height: number): any {
    try {
      // Try to use node-canvas
      const { createCanvas } = require('canvas');
      return createCanvas(width, height);
    } catch (error) {
      this.logger.error('node-canvas not available, cannot render PDF');
      throw new Error('Canvas library required for PDF rendering. Install with: npm install canvas');
    }
  }

  /**
   * Extract diagrams from a PDF page (legacy method for compatibility)
   * Returns full page as diagram since we now do this in question-extraction service
   */
  async extractDiagramsFromDocument(
    documentId: string,
    pageNumber: number,
  ): Promise<ExtractedDiagram[]> {
    try {
      this.logger.log(`Extracting diagrams from page ${pageNumber} of document ${documentId}`);

      // Get document
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (!document || !document.storageUrl) {
        this.logger.warn('Document or storage URL not found');
        return [];
      }

      // Render the PDF page as an image
      const pageImage = await this.renderPDFPageAsImage(
        document.storageUrl,
        pageNumber,
      );

      if (!pageImage) {
        this.logger.warn('Failed to render PDF page');
        return [];
      }

      // Return full page as a single diagram
      // Note: Specific diagram cropping is now done in question-extraction service
      const imageBuffer = Buffer.from(pageImage, 'base64');
      const metadata = await sharp(imageBuffer).metadata();

      return [
        {
          imageData: pageImage,
          mimeType: 'image/png',
          width: metadata.width || 1200,
          height: metadata.height || 1600,
          pageNumber,
          type: 'diagram',
        },
      ];
    } catch (error) {
      this.logger.error('Failed to extract diagrams:', error);
      return [];
    }
  }
}
