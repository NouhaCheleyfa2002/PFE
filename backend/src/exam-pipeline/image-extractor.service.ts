import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import sharp from 'sharp';
import { AiService } from '../ai/ai.service';
import { PDFImageExtractorService, ExtractedPDFImage } from './pdf-image-extractor.service';
import { PDFDiagramExtractorService, ExtractedDiagram } from './pdf-diagram-extractor.service';

export interface ExtractedImage {
  imageData: string; // base64
  mimeType: string;
  width: number;
  height: number;
  pageNumber: number;
  position?: { x: number; y: number };
}

export interface VisualContentWithImages {
  questionId: string;
  contextText: string;
  images: ExtractedImage[];
  pageNumber: number;
  aiSummary?: string;
  aiDescription?: string;
  documentUrl?: string; // Add document URL
}

@Injectable()
export class ImageExtractorService {
  private readonly logger = new Logger(ImageExtractorService.name);

  constructor(
    @InjectRepository(ExamQuestionEntity)
    private readonly questionRepository: Repository<ExamQuestionEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    private readonly aiService: AiService,
    private readonly pdfImageExtractor: PDFImageExtractorService,
    private readonly pdfDiagramExtractor: PDFDiagramExtractorService,
  ) {}

  /**
   * Extract diagrams from a specific page of a document using Puppeteer
   */
  async extractImagesFromPage(
    documentId: string,
    pageNumber: number,
  ): Promise<ExtractedImage[]> {
    try {
      this.logger.log(`Extracting diagrams from page ${pageNumber} of document ${documentId}`);

      // Use the new diagram extractor service with Puppeteer
      const diagrams = await this.pdfDiagramExtractor.extractDiagramsFromDocument(
        documentId,
        pageNumber,
      );

      // Convert to ExtractedImage format
      const images: ExtractedImage[] = diagrams.map((diagram) => ({
        imageData: diagram.imageData,
        mimeType: diagram.mimeType,
        width: diagram.width,
        height: diagram.height,
        pageNumber: diagram.pageNumber,
      }));

      this.logger.log(`Extracted ${images.length} diagrams from page ${pageNumber}`);
      return images;
    } catch (error) {
      this.logger.error(`Failed to extract images from page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Fetch image from URL and convert to base64
   */
  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error('Failed to fetch image:', error);
      return '';
    }
  }

  /**
   * Get complete visual content with images and AI summary
   */
  async getCompleteVisualContent(
    questionId: string,
  ): Promise<VisualContentWithImages | null> {
    try {
      const question = await this.questionRepository.findOne({
        where: { id: questionId },
        relations: ['document'],
      });

      if (!question || !question.hasVisualContent) {
        return null;
      }

      const pageNumber = question.pageNumber || 1;
      const document = question.document;

      // Get context text
      let contextText = '';
      if (question.visualContentRef) {
        try {
          const ref = JSON.parse(question.visualContentRef);
          contextText = ref.context || '';
        } catch (e) {
          this.logger.error('Failed to parse visual content ref:', e);
        }
      }

      // Extract images from the page
      const images = await this.extractImagesFromPage(document.id, pageNumber);

      // Generate AI summary if we have context or images
      let aiSummary: string | undefined;
      let aiDescription: string | undefined;

      if (contextText || images.length > 0) {
        aiSummary = await this.generateAISummary(
          question.questionText,
          contextText,
          images.length,
          question.visualContentType || 'content',
        );

        if (images.length > 0) {
          aiDescription = await this.generateImageDescription(
            question.questionText,
            question.visualContentType || 'image',
          );
        }
      }

      return {
        questionId: question.id,
        contextText,
        images,
        pageNumber,
        aiSummary,
        aiDescription,
        documentUrl: document.storageUrl, // Add document storage URL
      };
    } catch (error) {
      this.logger.error('Failed to get complete visual content:', error);
      return null;
    }
  }

  /**
   * Generate AI summary of visual content for a question
   */
  private async generateAISummary(
    questionText: string,
    contextText: string,
    imageCount: number,
    visualType: string,
  ): Promise<string | undefined> {
    try {
      const systemPrompt = 'You are an educational content expert. Provide clear, concise summaries for students.';

      const userPrompt = `Summarize the following content that accompanies an exam question.

Question: "${questionText}"

Visual Type: ${visualType}
Number of Images: ${imageCount}

Context Text:
"""
${contextText.substring(0, 2000)}
"""

Provide a 2-3 sentence summary that:
1. Identifies what visual content is being referenced (graph, table, document, etc.)
2. Describes the key information needed to answer the question
3. Highlights any important data points or patterns

Keep it under 150 words and focus on what's relevant to answering the question.`;

      const summary = await this.aiService.chat(systemPrompt, userPrompt);
      return summary.trim();
    } catch (error) {
      this.logger.error('Failed to generate AI summary:', error);
      return undefined;
    }
  }

  /**
   * Generate AI description of what the image should contain
   */
  private async generateImageDescription(
    questionText: string,
    visualType: string,
  ): Promise<string | undefined> {
    try {
      const systemPrompt = 'You are an expert at describing visual content for accessibility.';

      const userPrompt = `Based on this question, describe what the ${visualType} should show:

Question: "${questionText}"

Provide a brief description (1-2 sentences) of what visual content (graph, chart, table, diagram) this question is referencing and what it likely contains. Focus on the type of data or information that would be shown.

Example:
Question: "Based on the graph below, what is the trend from 2000 to 2010?"
Description: "A line graph showing data points over time from 2000 to 2010, likely displaying a trend that can be analyzed for increase, decrease, or stability."`;

      const description = await this.aiService.chat(systemPrompt, userPrompt);
      return description.trim();
    } catch (error) {
      this.logger.error('Failed to generate image description:', error);
      return undefined;
    }
  }

  /**
   * Optimize image for web display
   */
  async optimizeImage(base64Data: string, maxWidth: number = 800): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      const optimized = await sharp(buffer)
        .resize(maxWidth, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return optimized.toString('base64');
    } catch (error) {
      this.logger.error('Failed to optimize image:', error);
      return base64Data; // Return original if optimization fails
    }
  }

  /**
   * Generate thumbnail for an image
   */
  async generateThumbnail(base64Data: string, size: number = 200): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      const thumbnail = await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return thumbnail.toString('base64');
    } catch (error) {
      this.logger.error('Failed to generate thumbnail:', error);
      return base64Data;
    }
  }

  /**
   * Analyze image to detect if it contains graphs, charts, or tables
   */
  async analyzeImageContent(base64Data: string): Promise<{
    type: 'graph' | 'chart' | 'table' | 'diagram' | 'text' | 'unknown';
    confidence: number;
    description: string;
  }> {
    try {
      // This would use image analysis AI or OCR
      // For now, return a basic analysis
      const buffer = Buffer.from(base64Data, 'base64');
      const metadata = await sharp(buffer).metadata();

      // Simple heuristic: if image is wide and short, likely a chart
      // If square-ish, could be diagram
      const aspectRatio = metadata.width! / metadata.height!;

      let type: 'graph' | 'chart' | 'table' | 'diagram' | 'text' | 'unknown' = 'unknown';
      let confidence = 0.5;

      if (aspectRatio > 1.5) {
        type = 'chart';
        confidence = 0.6;
      } else if (aspectRatio > 0.8 && aspectRatio < 1.2) {
        type = 'diagram';
        confidence = 0.6;
      }

      return {
        type,
        confidence,
        description: `Image appears to be a ${type} (${metadata.width}x${metadata.height})`,
      };
    } catch (error) {
      this.logger.error('Failed to analyze image:', error);
      return {
        type: 'unknown',
        confidence: 0,
        description: 'Unable to analyze image',
      };
    }
  }
}
