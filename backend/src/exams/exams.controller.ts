import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExamsService } from './exams.service';
import { ExamAttemptsService } from './exam-attempts.service';
import { CreateExamDto, UpdateExamDto, PublishExamDto } from './dto/exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly examAttemptsService: ExamAttemptsService,
  ) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateExamDto) {
    return this.examsService.create(req.user.sub, dto);
  }

  /**
   * GET /exams/student/my-attempts
   * Get all student's exam attempts with progress
   */
  @Get('student/my-attempts')
  async getMyExamAttempts(@Request() req: any) {
    return this.examAttemptsService.getStudentAttempts(req.user.sub);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.examsService.findAll(req.user.sub);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.examsService.findOne(id, req.user.sub);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.examsService.delete(id, req.user.sub);
    return { message: 'Exam deleted successfully' };
  }

  // Publishing endpoints

  @Post(':id/publish')
  @UseInterceptors(FileInterceptor('pdf'))
  async publish(
    @Request() req: any,
    @Param('id') id: string,
    @Body('metadata') metadataString: string,
    @UploadedFile() pdfFile?: Express.Multer.File,
  ) {
    // Parse metadata from JSON string
    const publishDto: PublishExamDto = JSON.parse(metadataString);
    
    // Pass PDF buffer if file was uploaded
    const pdfBuffer = pdfFile ? pdfFile.buffer : undefined;
    
    return this.examsService.publish(id, req.user.sub, publishDto, pdfBuffer);
  }

  @Get('ai-generated/list')
  async getAIGeneratedExams(@Request() req: any) {
    return this.examsService.getAIGeneratedExams(req.user.sub);
  }

  @Get('pending/moderation')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getPendingExams() {
    return this.examsService.getPendingExams();
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async approveExam(@Request() req: any, @Param('id') id: string) {
    return this.examsService.approveExam(id, req.user.sub);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async rejectExam(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.examsService.rejectExam(id, req.user.sub, reason);
  }

  @Get('marketplace/list')
  async getMarketplaceExams(
    @Query('classLevel') classLevel?: string,
    @Query('subject') subject?: string,
    @Query('license') license?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.examsService.getMarketplaceExams({
      classLevel,
      subject,
      license,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post(':id/view')
  async incrementViews(@Param('id') id: string) {
    await this.examsService.incrementViews(id);
    return { message: 'View count incremented' };
  }

  @Post(':id/download')
  async incrementDownloads(@Param('id') id: string) {
    await this.examsService.incrementDownloads(id);
    return { message: 'Download count incremented' };
  }

  // Exam submission endpoints for students
  
  @Post(':id/start')
  async startExam(@Request() req: any, @Param('id') examId: string) {
    return this.examsService.startExam(examId, req.user.sub);
  }

  @Post(':id/submit')
  async submitExam(
    @Request() req: any,
    @Param('id') examId: string,
    @Body() body: { answers: Record<string, any>; timeSpent: number },
  ) {
    return this.examsService.submitExam(examId, req.user.sub, body.answers, body.timeSpent);
  }

  @Get(':id/submissions')
  async getExamSubmissions(@Request() req: any, @Param('id') examId: string) {
    return this.examsService.getStudentSubmissions(examId, req.user.sub);
  }

  @Get('submissions/:submissionId')
  async getSubmissionDetails(@Request() req: any, @Param('submissionId') submissionId: string) {
    return this.examsService.getSubmissionDetails(submissionId, req.user.sub);
  }

  // Interactive Practice Mode endpoints

  /**
   * GET /exams/:id/practice
   * Get exam for student practice (interactive mode)
   * Returns questions without correct answers
   */
  @Get(':id/practice')
  async getExamForPractice(@Request() req: any, @Param('id') examId: string) {
    return this.examsService.getExamForPractice(examId, req.user.sub);
  }

  /**
   * GET /exams/:id/attempts
   * Get all student attempts for this exam
   */
  @Get(':id/attempts')
  async getStudentAttempts(@Request() req: any, @Param('id') examId: string) {
    return this.examAttemptsService.getStudentAttemptsForExam(examId, req.user.sub);
  }

  /**
   * GET /exams/:id/analytics
   * Get exam analytics (teacher only)
   * Phase 7: Analytics & Insights
   */
  @Get(':id/analytics')
  async getExamAnalytics(@Request() req: any, @Param('id') examId: string) {
    return this.examsService.getExamAnalytics(examId, req.user.sub);
  }

  /**
   * POST /exams/from-document/:documentId
   * Create an exam from an uploaded document (PDF with extracted questions)
   * This bridges the old document upload flow with the new exam system
   */
  @Post('from-document/:documentId')
  async createExamFromDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body() body: { 
      title?: string;
      classLevel?: string;
      subject?: string;
      duration?: string;
      instructions?: string;
    }
  ) {
    return this.examsService.createExamFromDocument(documentId, req.user.sub, body);
  }
}
