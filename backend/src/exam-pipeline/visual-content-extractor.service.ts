import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

export interface PageContent {
  pageNumber: number;
  text: string;
  images?: Array<{
    url?: string;
    base64?: string;
    coordinates?: { x: number; y: number; width: number; height: number };
  }>;
}

export interface ExtractedVisualContent {
  questionId: string;
  content: string; // Text/context around the question
  imageData?: string; // Base64 or URL
  pageNumber: number;
  coordinates?: any;
}

@Injectable()
export class VisualContentExtractorService {
  private readonly logger = new Logger(VisualContentExtractorService.name);

  constructor(
    @InjectRepository(ExamQuestionEntity)
    private readonly questionRepository: Repository<ExamQuestionEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  /**
   * Extract visual content for questions that reference visuals
   * This fetches the actual content from the OCR result
   */
  async extractVisualContentForQuestion(
    questionId: string,
  ): Promise<ExtractedVisualContent | null> {
    try {
      // Get question with document
      const question = await this.questionRepository.findOne({
        where: { id: questionId },
        relations: ['document'],
      });

      if (!question || !question.hasVisualContent) {
        return null;
      }

      const document = question.document;
      if (!document.ocrResultUrl) {
        this.logger.warn(`Document ${document.id} has no OCR result`);
        return null;
      }

      // Fetch OCR result
      const ocrResponse = await fetch(document.ocrResultUrl);
      if (!ocrResponse.ok) {
        this.logger.error('Failed to fetch OCR result');
        return null;
      }

      const ocrData = await ocrResponse.json();

      // Get the page content
      const pageNumber = question.pageNumber || 1;
      const pageContent = this.extractPageContent(ocrData, pageNumber);

      if (!pageContent) {
        this.logger.warn(`No content found for page ${pageNumber}`);
        return null;
      }

      // Extract context around the question
      const context = this.extractContextAroundQuestion(
        pageContent,
        question.questionText,
      );

      return {
        questionId: question.id,
        content: context,
        imageData: pageContent.images?.[0]?.base64 || pageContent.images?.[0]?.url,
        pageNumber: pageNumber,
        coordinates: pageContent.images?.[0]?.coordinates,
      };
    } catch (error) {
      this.logger.error(`Failed to extract visual content for question ${questionId}:`, error);
      return null;
    }
  }

  /**
   * Extract full page content including text and images
   */
  private extractPageContent(ocrData: any, pageNumber: number): PageContent | null {
    try {
      if (!ocrData.pages || !Array.isArray(ocrData.pages)) {
        return null;
      }

      const page = ocrData.pages.find((p: any) => p.pageNumber === pageNumber);
      if (!page) {
        // Try index-based access (0-indexed)
        const pageByIndex = ocrData.pages[pageNumber - 1];
        if (!pageByIndex) {
          return null;
        }
        return this.normalizePage(pageByIndex, pageNumber);
      }

      return this.normalizePage(page, pageNumber);
    } catch (error) {
      this.logger.error('Failed to extract page content:', error);
      return null;
    }
  }

  /**
   * Normalize page structure from different OCR formats
   */
  private normalizePage(page: any, pageNumber: number): PageContent {
    return {
      pageNumber,
      text: page.text || page.content || '',
      images: page.images || page.figures || [],
    };
  }

  /**
   * Extract context around a question (text before and after)
   * This includes paragraphs, tables, or any text that provides context
   */
  private extractContextAroundQuestion(
    pageContent: PageContent,
    questionText: string,
    contextRange: number = 500, // characters before and after
  ): string {
    const fullText = pageContent.text;
    
    // Try to find the question in the page text
    const questionIndex = fullText.indexOf(questionText.substring(0, 50));
    
    if (questionIndex === -1) {
      // Question not found, return section from beginning
      this.logger.warn('Question text not found in page, returning page excerpt');
      return fullText.substring(0, contextRange * 2);
    }

    // Extract context before and after the question
    const start = Math.max(0, questionIndex - contextRange);
    const end = Math.min(fullText.length, questionIndex + questionText.length + contextRange);

    let context = fullText.substring(start, end);

    // Try to expand to complete sentences/paragraphs
    context = this.expandToCompleteSections(fullText, start, end);

    return context;
  }

  /**
   * Expand text range to complete sentences or paragraphs
   */
  private expandToCompleteSections(
    fullText: string,
    start: number,
    end: number,
  ): string {
    // Find previous paragraph break or start
    while (start > 0 && fullText[start] !== '\n' && fullText[start - 1] !== '\n') {
      start--;
    }

    // Find next paragraph break or end
    while (end < fullText.length && fullText[end] !== '\n') {
      end++;
    }

    return fullText.substring(start, end).trim();
  }

  /**
   * Extract visual content for all questions in a document
   */
  async extractVisualContentForDocument(documentId: string): Promise<number> {
    try {
      this.logger.log(`Extracting visual content for document ${documentId}`);

      // Get all questions with visual content
      const questions = await this.questionRepository.find({
        where: {
          documentId,
          hasVisualContent: true,
        },
      });

      if (questions.length === 0) {
        this.logger.log('No questions with visual content found');
        return 0;
      }

      this.logger.log(`Found ${questions.length} questions with visual content`);

      // Get document with OCR result
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (!document || !document.ocrResultUrl) {
        this.logger.warn('Document has no OCR result');
        return 0;
      }

      // Fetch OCR data once
      const ocrResponse = await fetch(document.ocrResultUrl);
      if (!ocrResponse.ok) {
        this.logger.error('Failed to fetch OCR result');
        return 0;
      }

      const ocrData = await ocrResponse.json();

      let updatedCount = 0;

      // Process each question
      for (const question of questions) {
        try {
          const pageNumber = question.pageNumber || 1;
          const pageContent = this.extractPageContent(ocrData, pageNumber);

          if (!pageContent) {
            continue;
          }

          // Extract context
          const context = this.extractContextAroundQuestion(
            pageContent,
            question.questionText,
          );

          // Store context as visual content reference
          question.visualContentRef = JSON.stringify({
            pageNumber,
            context,
            hasImages: pageContent.images && pageContent.images.length > 0,
            imageCount: pageContent.images?.length || 0,
          });

          await this.questionRepository.save(question);
          updatedCount++;
        } catch (error) {
          this.logger.error(`Failed to extract content for question ${question.id}:`, error);
        }
      }

      this.logger.log(`Updated ${updatedCount} questions with visual content`);
      return updatedCount;
    } catch (error) {
      this.logger.error('Failed to extract visual content for document:', error);
      return 0;
    }
  }
}
