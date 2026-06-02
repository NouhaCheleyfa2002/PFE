import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ExamPipelineService } from './exam-pipeline.service';
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
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  async semanticSearch(@Body() searchDto: SemanticSearchDto) {
    const { query, limit, minSimilarity, topic, difficulty } = searchDto;

    const results = await this.pipelineService.semanticSearch(
      query,
      limit,
      minSimilarity,
      { topic, difficulty },
    );

    return {
      success: true,
      query,
      total: results.length,
      results,
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
