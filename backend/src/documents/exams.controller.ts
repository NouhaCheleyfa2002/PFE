import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { ExamPipelineService } from '../exam-pipeline/exam-pipeline.service';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly examPipelineService: ExamPipelineService,
  ) {}

  /**
   * GET /exams
   * Returns all exams (completed documents with exam metadata)
   * 
   * Query params:
   * - level: filter by educational level (e.g., "Bac Info", "2ème Économie")
   * - subject: filter by subject (e.g., "Algorithmique", "Mathématiques")
   * - year: filter by year (e.g., 2024)
   * - page: page number for pagination (default: 1)
   * - limit: items per page (default: 20)
   */
  @Get()
  async getAllExams(
    @Query('level') level?: string,
    @Query('subject') subject?: string,
    @Query('year') year?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const exams = await this.documentsService.findExams({
      level,
      subject,
      year: year ? parseInt(year, 10) : undefined,
      page,
      limit,
    });

    return exams;
  }

  /**
   * GET /exams/:id
   * Returns exam details including associated questions
   * 
   * Query params:
   * - includeQuestions: whether to include questions (default: true)
   */
  @Get(':id')
  async getExamById(
    @Param('id') id: string,
    @Query('includeQuestions') includeQuestions: string = 'true',
    @Request() req: any,
  ) {
    const document = await this.documentsService.findById(id);

    if (!document) {
      throw new HttpException('Exam not found', HttpStatus.NOT_FOUND);
    }

    // Check if user owns the document (or is admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // Get question count
    const questions = await this.examPipelineService.findByDocumentId(id);
    const questionsCount = questions.length;

    const examDetails: any = {
      id: document.id,
      title: document.title,
      level: document.level,
      subject: document.subject,
      year: document.year,
      originalName: document.originalName,
      status: document.status,
      fileSize: document.fileSize,
      storageUrl: document.storageUrl,
      ocrResultUrl: document.ocrResultUrl,
      questionsCount,
      createdAt: document.createdAt,
      processedAt: document.processedAt,
      userId: document.userId,
    };

    // Optionally include questions
    if (includeQuestions === 'true') {
      examDetails.questions = questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        topic: q.topic,
        difficulty: q.difficulty,
        explanation: q.explanation,
        createdAt: q.createdAt,
      }));
    }

    return examDetails;
  }

  /**
   * GET /exams/stats
   * Returns statistics about exams
   */
  @Get('metadata/stats')
  async getExamStats() {
    const stats = await this.documentsService.getExamStats();
    return stats;
  }

  /**
   * GET /exams/levels/list
   * Returns all unique educational levels
   */
  @Get('metadata/levels')
  async getAllLevels() {
    const levels = await this.documentsService.getAllLevels();
    return { levels };
  }

  /**
   * GET /exams/subjects/list
   * Returns all unique subjects
   */
  @Get('metadata/subjects')
  async getAllSubjects() {
    const subjects = await this.documentsService.getAllSubjects();
    return { subjects };
  }

  /**
   * GET /exams/years/list
   * Returns all unique years
   */
  @Get('metadata/years')
  async getAllYears() {
    const years = await this.documentsService.getAllYears();
    return { years };
  }
}
