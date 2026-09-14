import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamAttemptsService } from './exam-attempts.service';

@Controller('exam-attempts')
@UseGuards(JwtAuthGuard)
export class ExamAttemptsController {
  constructor(private readonly examAttemptsService: ExamAttemptsService) {}

  /**
   * POST /exam-attempts/save-document-attempt
   * Save an exam attempt for document-based exams (uploaded PDFs)
   */
  @Post('save-document-attempt')
  @HttpCode(HttpStatus.OK)
  async saveDocumentAttempt(
    @Req() req: any,
    @Body() body: {
      examId: string;
      totalQuestions: number;
      answeredQuestions: number;
      correctAnswers: number;
      score: number;
      maxScore: number;
      answers: any[];
    },
  ) {
    const studentId = req.user.sub;
    return this.examAttemptsService.saveDocumentAttempt(
      body.examId,
      studentId,
      body.totalQuestions,
      body.answeredQuestions,
      body.correctAnswers,
      body.score,
      body.maxScore,
      body.answers,
    );
  }

  /**
   * POST /exam-attempts/start
   * Start a new exam attempt
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startAttempt(
    @Req() req: any,
    @Body() body: { examId: string },
  ) {
    const studentId = req.user.sub;
    return this.examAttemptsService.startAttempt(body.examId, studentId);
  }

  /**
   * POST /exam-attempts/:id/answer
   * Submit an answer for a specific question
   */
  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(
    @Req() req: any,
    @Param('id') attemptId: string,
    @Body()
    body: {
      examQuestionId: string;
      answerData: any;
      timeSpentSeconds?: number;
    },
  ) {
    const studentId = req.user.sub;
    return this.examAttemptsService.submitAnswer(
      attemptId,
      studentId,
      body.examQuestionId,
      body.answerData,
      body.timeSpentSeconds || 0,
    );
  }

  /**
   * POST /exam-attempts/:id/submit
   * Submit the entire attempt for final grading
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submitAttempt(
    @Req() req: any,
    @Param('id') attemptId: string,
    @Body() body: { totalTimeSpent: number },
  ) {
    const studentId = req.user.sub;
    return this.examAttemptsService.submitAttempt(
      attemptId,
      studentId,
      body.totalTimeSpent,
    );
  }

  /**
   * GET /exam-attempts/:id/results
   * Get graded results for an attempt
   */
  @Get(':id/results')
  async getResults(@Req() req: any, @Param('id') attemptId: string) {
    const studentId = req.user.sub;
    return this.examAttemptsService.getAttemptResults(attemptId, studentId);
  }

  /**
   * POST /exam-attempts/:attemptId/answers/:answerId/grade
   * Manually grade an essay/open-ended answer (teacher only)
   */
  @Post(':attemptId/answers/:answerId/grade')
  @HttpCode(HttpStatus.OK)
  async manuallyGradeAnswer(
    @Req() req: any,
    @Param('attemptId') attemptId: string,
    @Param('answerId') answerId: string,
    @Body() body: { pointsEarned: number; feedback?: string },
  ) {
    const teacherId = req.user.sub;
    return this.examAttemptsService.manuallyGradeAnswer(
      attemptId,
      answerId,
      teacherId,
      body.pointsEarned,
      body.feedback,
    );
  }
}
