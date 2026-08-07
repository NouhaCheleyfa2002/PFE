import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ExamPipelineService } from './exam-pipeline.service';
import { VisualContentExtractorService } from './visual-content-extractor.service';
import { ImageExtractorService } from './image-extractor.service';
import { ImageEditorService, CropOptions, RotateOptions, AdjustOptions } from './image-editor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SemanticSearchDto,
  PaginationDto,
  ReprocessDocumentDto,
} from './dto/exam-pipeline.dto';
import { DocumentsService } from '../documents/documents.service';

@Controller('exam-questions')
@UseGuards(JwtAuthGuard)
export class ExamPipelineController {
  constructor(
    private readonly pipelineService: ExamPipelineService,
    private readonly documentsService: DocumentsService,
    private readonly visualContentExtractor: VisualContentExtractorService,
    private readonly imageExtractor: ImageExtractorService,
    private readonly imageEditor: ImageEditorService,
  ) {}

  /**
   * Get all questions with pagination and filters
   */
  @Get()
  async getAllQuestions(@Query() paginationDto: PaginationDto) {
    const { page, limit, topic, difficulty } = paginationDto;

    const result = await this.pipelineService.findAll(page, limit, {
      topic,
      difficulty,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get a single question by ID
   */
  @Get(':id')
  async getQuestion(@Param('id') id: string) {
    const question = await this.pipelineService.findById(id);

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return {
      success: true,
      question,
    };
  }

  /**
   * Get all questions from a specific document
   */
  @Get('document/:documentId')
  async getQuestionsByDocument(@Param('documentId') documentId: string) {
    const questions = await this.pipelineService.findByDocumentId(documentId);

    return {
      success: true,
      documentId,
      total: questions.length,
      questions,
    };
  }

  /**
   * Semantic search for questions using vector similarity
   * Enhanced with filters and verified content boost
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async semanticSearch(@Body() searchDto: SemanticSearchDto) {
    const { 
      query, 
      userId,
      limit, 
      minSimilarity, 
      topic, 
      difficulty,
      classLevel,
      subject,
      verifiedOnly,
    } = searchDto;

    const results = await this.pipelineService.semanticSearch(
      query,
      userId,
      limit,
      minSimilarity,
      { topic, difficulty, classLevel, subject, verifiedOnly },
    );

    return {
      success: true,
      query,
      total: results.length,
      results,
    };
  }

  /**
   * Get related questions based on similarity
   */
  @Get(':id/related')
  async getRelatedQuestions(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    const relatedQuestions = await this.pipelineService.getRelatedQuestions(
      id,
      limit || 5,
    );

    return {
      success: true,
      questionId: id,
      total: relatedQuestions.length,
      results: relatedQuestions,
    };
  }

  /**
   * Get user's search history
   */
  @Get('search-history/:userId')
  async getSearchHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const history = await this.pipelineService.getSearchHistory(
      userId,
      limit || 20,
    );

    return {
      success: true,
      userId,
      total: history.length,
      history,
    };
  }

  /**
   * Get popular searches across all users
   */
  @Get('meta/popular-searches')
  async getPopularSearches(@Query('limit') limit?: number) {
    const popularSearches = await this.pipelineService.getPopularSearches(
      limit || 10,
    );

    return {
      success: true,
      total: popularSearches.length,
      searches: popularSearches,
    };
  }

  /**
   * Get all unique topics
   */
  @Get('meta/topics')
  async getTopics() {
    const topics = await this.pipelineService.getTopics();

    return {
      success: true,
      topics,
    };
  }

  /**
   * Get statistics about questions
   */
  @Get('meta/stats')
  async getStats() {
    const stats = await this.pipelineService.getStats();

    return {
      success: true,
      stats,
    };
  }

  /**
   * Get visual content for a question
   */
  @Get(':id/visual-content')
  async getVisualContent(@Param('id') id: string) {
    const visualContent = await this.visualContentExtractor.extractVisualContentForQuestion(id);

    if (!visualContent) {
      return {
        success: false,
        message: 'No visual content available for this question',
      };
    }

    return {
      success: true,
      visualContent,
    };
  }

  /**
   * Get complete visual content with images and AI summary
   */
  @Get(':id/visual-content-complete')
  async getCompleteVisualContent(@Param('id') id: string) {
    const completeContent = await this.imageExtractor.getCompleteVisualContent(id);

    if (!completeContent) {
      return {
        success: false,
        message: 'No visual content available for this question',
      };
    }

    return {
      success: true,
      visualContent: completeContent,
    };
  }

  /**
   * Get images from a specific page
   */
  @Get('document/:documentId/page/:pageNumber/images')
  async getPageImages(
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    const images = await this.imageExtractor.extractImagesFromPage(
      documentId,
      parseInt(pageNumber),
    );

    return {
      success: true,
      imageCount: images.length,
      images,
    };
  }

  /**
   * Optimize an image for web display
   */
  @Post('image/optimize')
  @HttpCode(HttpStatus.OK)
  async optimizeImage(@Body() body: { imageData: string; maxWidth?: number }) {
    const optimized = await this.imageExtractor.optimizeImage(
      body.imageData,
      body.maxWidth,
    );

    return {
      success: true,
      imageData: optimized,
    };
  }

  /**
   * Generate thumbnail for an image
   */
  @Post('image/thumbnail')
  @HttpCode(HttpStatus.OK)
  async generateThumbnail(@Body() body: { imageData: string; size?: number }) {
    const thumbnail = await this.imageExtractor.generateThumbnail(
      body.imageData,
      body.size,
    );

    return {
      success: true,
      imageData: thumbnail,
    };
  }

  /**
   * Analyze image content
   */
  @Post('image/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeImage(@Body() body: { imageData: string }) {
    const analysis = await this.imageExtractor.analyzeImageContent(body.imageData);

    return {
      success: true,
      analysis,
    };
  }

  /**
   * Crop an image
   */
  @Post('image/crop')
  @HttpCode(HttpStatus.OK)
  async cropImage(@Body() body: { imageData: string; crop: CropOptions }) {
    const cropped = await this.imageEditor.crop(body.imageData, body.crop);

    return {
      success: true,
      imageData: cropped,
    };
  }

  /**
   * Rotate an image
   */
  @Post('image/rotate')
  @HttpCode(HttpStatus.OK)
  async rotateImage(@Body() body: { imageData: string; angle: number }) {
    const rotated = await this.imageEditor.rotate(body.imageData, { angle: body.angle });

    return {
      success: true,
      imageData: rotated,
    };
  }

  /**
   * Adjust image (brightness, contrast, saturation)
   */
  @Post('image/adjust')
  @HttpCode(HttpStatus.OK)
  async adjustImage(@Body() body: { imageData: string; adjustments: AdjustOptions }) {
    const adjusted = await this.imageEditor.adjust(body.imageData, body.adjustments);

    return {
      success: true,
      imageData: adjusted,
    };
  }

  /**
   * Enhance image quality
   */
  @Post('image/enhance')
  @HttpCode(HttpStatus.OK)
  async enhanceImage(@Body() body: { imageData: string }) {
    const enhanced = await this.imageEditor.enhance(body.imageData);

    return {
      success: true,
      imageData: enhanced,
    };
  }

  /**
   * Convert image to grayscale
   */
  @Post('image/grayscale')
  @HttpCode(HttpStatus.OK)
  async grayscaleImage(@Body() body: { imageData: string }) {
    const gray = await this.imageEditor.grayscale(body.imageData);

    return {
      success: true,
      imageData: gray,
    };
  }

  /**
   * Add border to image
   */
  @Post('image/border')
  @HttpCode(HttpStatus.OK)
  async addBorderToImage(
    @Body() body: { imageData: string; width?: number; color?: string },
  ) {
    const bordered = await this.imageEditor.addBorder(
      body.imageData,
      body.width,
      body.color,
    );

    return {
      success: true,
      imageData: bordered,
    };
  }

  /**
   * Resize image
   */
  @Post('image/resize')
  @HttpCode(HttpStatus.OK)
  async resizeImage(
    @Body() body: { imageData: string; width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' },
  ) {
    const resized = await this.imageEditor.resize(
      body.imageData,
      body.width,
      body.height,
      body.fit,
    );

    return {
      success: true,
      imageData: resized,
    };
  }

  /**
   * Flip image
   */
  @Post('image/flip')
  @HttpCode(HttpStatus.OK)
  async flipImage(@Body() body: { imageData: string; direction: 'horizontal' | 'vertical' }) {
    const flipped = await this.imageEditor.flip(body.imageData, body.direction);

    return {
      success: true,
      imageData: flipped,
    };
  }

  /**
   * Get image metadata
   */
  @Post('image/metadata')
  @HttpCode(HttpStatus.OK)
  async getImageMetadata(@Body() body: { imageData: string }) {
    const metadata = await this.imageEditor.getMetadata(body.imageData);

    return {
      success: true,
      metadata,
    };
  }

  /**
   * Extract visual content for all questions in a document
   */
  @Post('document/:documentId/extract-visual-content')
  @HttpCode(HttpStatus.OK)
  async extractVisualContentForDocument(@Param('documentId') documentId: string) {
    const count = await this.visualContentExtractor.extractVisualContentForDocument(documentId);

    return {
      success: true,
      message: `Extracted visual content for ${count} questions`,
      questionsUpdated: count,
    };
  }

  /**
   * Update a question with comprehensive fields
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateQuestion(
    @Param('id') id: string,
    @Body() updateDto: {
      questionText?: string;
      questionType?: string;
      options?: string[] | null;
      correctAnswer?: string | null;
      difficulty?: string;
      topic?: string;
    },
  ) {
    // Validation
    if (updateDto.questionText !== undefined && updateDto.questionText.trim() === '') {
      throw new NotFoundException('Question text cannot be empty');
    }

    const updatedQuestion = await this.pipelineService.updateQuestion(id, updateDto);

    return {
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion,
    };
  }

  /**
   * Soft delete a question
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') id: string) {
    await this.pipelineService.softDeleteQuestion(id);

    return {
      success: true,
      message: 'Question deleted successfully',
    };
  }

  /**
   * Manually trigger diagram extraction for existing questions
   */
  @Post('extract-diagrams/:documentId')
  @HttpCode(HttpStatus.OK)
  async extractDiagramsForDocument(@Param('documentId') documentId: string) {
    const questions = await this.pipelineService.findByDocumentId(documentId);
    const visualQuestions = questions.filter(q => q.hasVisualContent && q.pageNumber);

    if (visualQuestions.length === 0) {
      return {
        success: false,
        message: 'No questions with visual content found for this document',
      };
    }

    return {
      success: true,
      message: `Found ${visualQuestions.length} questions with visual content. Diagram extraction will happen automatically on next document reprocess.`,
      questionsCount: visualQuestions.length,
    };
  }

  /**
   * Manually upload a cropped diagram for a question
   * This allows teachers to select/crop diagrams from PDF when AI extraction fails
   */
  @Post(':id/manual-diagram')
  @HttpCode(HttpStatus.OK)
  async uploadManualDiagram(
    @Param('id') questionId: string,
    @Body() body: {
      imageData: string; // base64
      mimeType: string;
      width: number;
      height: number;
      pageNumber: number;
      cropRegion?: { x: number; y: number; width: number; height: number };
    },
  ) {
    const question = await this.pipelineService.findById(questionId);

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // Parse existing visual content or create new
    let visualContent: any = {};
    if (question.visualContentRef) {
      try {
        visualContent = JSON.parse(question.visualContentRef);
      } catch {
        visualContent = {};
      }
    }

    // Store the manual diagram
    visualContent.diagrams = [{
      imageData: body.imageData,
      mimeType: body.mimeType,
      width: body.width,
      height: body.height,
      type: 'diagram',
    }];
    visualContent.diagramCount = 1;
    visualContent.diagramsExtractedAt = new Date().toISOString();
    visualContent.extractionMethod = 'manual-upload';
    visualContent.sourceType = 'USER_SELECTION';
    visualContent.pageNumber = body.pageNumber;
    visualContent.context = visualContent.context || '';
    if (body.cropRegion) {
      visualContent.cropRegion = body.cropRegion;
    }

    // Update question with visual content AND mark hasVisualContent as true
    const updated = await this.pipelineService.updateQuestion(questionId, {
      visualContentRef: JSON.stringify(visualContent),
      hasVisualContent: true,
      visualContentType: 'diagram',
    } as any);

    return {
      success: true,
      message: 'Manual diagram uploaded successfully',
      question: updated,
    };
  }

  /**
   * Reprocess a document through the pipeline
   * This will delete existing questions and re-extract them
   */
  @Post('reprocess/:documentId')
  @HttpCode(HttpStatus.OK)
  async reprocessDocument(
    @Param('documentId') documentId: string,
    @Body() reprocessDto: ReprocessDocumentDto,
  ) {
    // Get the document
    const document = await this.documentsService.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    if (!document.ocrResultUrl) {
      throw new NotFoundException(
        `Document ${documentId} has no OCR result available`,
      );
    }

    // Fetch OCR result
    const ocrResponse = await fetch(document.ocrResultUrl);
    if (!ocrResponse.ok) {
      throw new NotFoundException('Failed to fetch OCR result');
    }

    const ocrData = await ocrResponse.json();

    // Extract text from OCR result
    const ocrText = ocrData.pages
      .map((page: any) => page.text)
      .join('\n\n');

    // Delete existing questions
    const deletedCount = await this.pipelineService.deleteByDocumentId(
      documentId,
    );

    // Reprocess
    const result = await this.pipelineService.processDocument(
      documentId,
      ocrText,
      reprocessDto.customPrompt,
    );

    return {
      ...result,
      deletedQuestions: deletedCount,
    };
  }
}
