import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { ExamAnswerEntity } from './entities/exam-answer.entity';
import { ExamQuestionSetEntity } from './entities/exam-question-set.entity';
import { ExamEntity } from './entities/exam.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';

@Injectable()
export class ExamAttemptsService {
  private readonly logger = new Logger(ExamAttemptsService.name);

  constructor(
    @InjectRepository(ExamAttemptEntity)
    private attemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(ExamAnswerEntity)
    private answerRepository: Repository<ExamAnswerEntity>,
    @InjectRepository(ExamQuestionSetEntity)
    private questionSetRepository: Repository<ExamQuestionSetEntity>,
    @InjectRepository(ExamEntity)
    private examRepository: Repository<ExamEntity>,
    @InjectRepository(PurchaseEntity)
    private purchaseRepository: Repository<PurchaseEntity>,
  ) {}

  /**
   * Start a new exam attempt
   * Creates an attempt record and returns the exam questions
   */
  async startAttempt(examId: string, studentId: string) {
    // 1. Check if exam exists and is published
    const exam = await this.examRepository.findOne({
      where: { id: examId, isPublished: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found or not published');
    }

    // 2. Check if student has access (purchased, free, or owner)
    if (exam.license === 'paid' && exam.ownerId !== studentId) {
      // Owners can always access their own exams, others need to purchase
      const purchase = await this.purchaseRepository.findOne({
        where: {
          documentId: examId,
          userId: studentId,
          status: 'completed',
        },
      });

      if (!purchase) {
        throw new ForbiddenException('You must purchase this exam to access it');
      }
    }

    // 3. Get exam question set
    const questions = await this.questionSetRepository.find({
      where: { examId },
      order: { orderIndex: 'ASC' },
    });

    if (questions.length === 0) {
      throw new BadRequestException('This exam has no questions available for practice');
    }

    // 4. Create attempt
    const attempt = this.attemptRepository.create({
      examId,
      studentId,
      status: 'in_progress',
      totalQuestions: questions.length,
      answeredQuestions: 0,
      correctAnswers: 0,
      score: null,
      maxScore: questions.reduce((sum, q) => sum + q.points, 0),
      timeSpentSeconds: 0,
      startedAt: new Date(),
    });

    const savedAttempt = await this.attemptRepository.save(attempt);

    this.logger.log(`Student ${studentId} started attempt ${savedAttempt.id} for exam ${examId}`);

    return {
      attemptId: savedAttempt.id,
      exam: {
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions,
        duration: exam.duration,
        maxPoints: savedAttempt.maxScore,
        totalQuestions: questions.length,
      },
      questions: questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.questionText,
        type: q.questionType,
        points: q.points,
        data: q.questionData, // options, blanks, etc.
      })),
      startedAt: savedAttempt.startedAt,
    };
  }

  /**
   * Submit an answer for a specific question
   */
  async submitAnswer(
    attemptId: string,
    studentId: string,
    examQuestionId: string,
    answerData: any,
    timeSpentSeconds: number = 0,
  ) {
    // 1. Verify attempt belongs to student and is in progress
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId, status: 'in_progress' },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found or already submitted');
    }

    // 2. Get question details
    const question = await this.questionSetRepository.findOne({
      where: { id: examQuestionId, examId: attempt.examId },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this exam');
    }

    // 3. Check if answer already exists (update if yes, create if no)
    let answer = await this.answerRepository.findOne({
      where: { attemptId, examQuestionId },
    });

    // 4. Auto-grade if possible
    const { isCorrect, pointsEarned } = this.gradeAnswer(
      question.questionType,
      question.questionData,
      answerData,
      question.points,
    );

    if (answer) {
      // Update existing answer
      answer.answerData = answerData;
      answer.isCorrect = isCorrect;
      answer.pointsEarned = pointsEarned;
      answer.timeSpentSeconds = timeSpentSeconds;
      answer.answeredAt = new Date();
    } else {
      // Create new answer
      answer = this.answerRepository.create({
        attemptId,
        examQuestionId,
        answerData,
        isCorrect,
        pointsEarned,
        timeSpentSeconds,
        answeredAt: new Date(),
      });
    }

    await this.answerRepository.save(answer);

    // 5. Update attempt statistics
    await this.updateAttemptStats(attemptId);

    return {
      success: true,
      answerId: answer.id,
      isCorrect,
      pointsEarned,
    };
  }

  /**
   * Submit the entire attempt for final grading
   */
  async submitAttempt(attemptId: string, studentId: string, totalTimeSpent: number) {
    // 1. Get attempt
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId, status: 'in_progress' },
      relations: ['answers'],
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found or already submitted');
    }

    // 2. Update final statistics
    await this.updateAttemptStats(attemptId);

    // 3. Mark as submitted
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.timeSpentSeconds = totalTimeSpent;

    await this.attemptRepository.save(attempt);

    this.logger.log(`Student ${studentId} submitted attempt ${attemptId}`);

    // 4. Return results
    return this.getAttemptResults(attemptId, studentId);
  }

  /**
   * Get graded results for an attempt
   */
  async getAttemptResults(attemptId: string, studentId: string) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam', 'answers', 'answers.examQuestion'],
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    // Get all questions for this exam
    const allQuestions = await this.questionSetRepository.find({
      where: { examId: attempt.examId },
      order: { orderIndex: 'ASC' },
    });

    // Map answers to questions
    const questionResults = allQuestions.map((question) => {
      const answer = attempt.answers.find((a) => a.examQuestionId === question.id);

      return {
        questionId: question.id,
        orderIndex: question.orderIndex,
        text: question.questionText,
        type: question.questionType,
        points: question.points,
        answered: !!answer,
        studentAnswer: answer?.answerData || null,
        isCorrect: answer?.isCorrect || null,
        pointsEarned: answer?.pointsEarned || 0,
        correctAnswer: question.questionData.correctAnswer || null,
        explanation: question.questionData.explanation || null,
      };
    });

    return {
      attemptId: attempt.id,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
      },
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      summary: {
        totalQuestions: attempt.totalQuestions,
        answeredQuestions: attempt.answeredQuestions,
        correctAnswers: attempt.correctAnswers,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: (attempt.maxScore && attempt.maxScore > 0) ? (Number(attempt.score) / attempt.maxScore) * 100 : 0,
        timeSpentSeconds: attempt.timeSpentSeconds,
      },
      questions: questionResults,
    };
  }

  /**
   * Get all attempts for a specific exam by a student
   */
  async getStudentAttemptsForExam(examId: string, studentId: string) {
    const attempts = await this.attemptRepository.find({
      where: { examId, studentId },
      order: { startedAt: 'DESC' },
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: (attempt.maxScore && attempt.maxScore > 0) ? (Number(attempt.score) / attempt.maxScore) * 100 : 0,
      answeredQuestions: attempt.answeredQuestions,
      totalQuestions: attempt.totalQuestions,
      timeSpentSeconds: attempt.timeSpentSeconds,
    }));
  }

  /**
   * Get all exam attempts for a student (across all exams)
   */
  async getStudentAttempts(studentId: string) {
    const attempts = await this.attemptRepository.find({
      where: { studentId },
      relations: ['exam'],
      order: { startedAt: 'DESC' },
    });

    return {
      attempts: attempts.map((attempt) => {
        const percentage = (attempt.maxScore && attempt.maxScore > 0) 
          ? (Number(attempt.score) / attempt.maxScore) * 100 
          : 0;
        
        const progress = attempt.totalQuestions > 0
          ? (attempt.answeredQuestions / attempt.totalQuestions) * 100
          : 0;

        return {
          id: attempt.id,
          examId: attempt.examId,
          examTitle: attempt.exam?.title || 'Unknown Exam',
          examSubject: attempt.exam?.subject || 'General',
          examClassLevel: attempt.exam?.classLevel || '',
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: Math.round(percentage * 10) / 10,
          progress: Math.round(progress),
          answeredQuestions: attempt.answeredQuestions,
          totalQuestions: attempt.totalQuestions,
          timeSpentSeconds: attempt.timeSpentSeconds,
        };
      }),
      total: attempts.length,
    };
  }

  /**
   * Save a document-based exam attempt
   * Used when students practice with uploaded PDFs that don't go through the normal attempt flow
   */
  async saveDocumentAttempt(
    examId: string,
    studentId: string,
    totalQuestions: number,
    answeredQuestions: number,
    correctAnswers: number,
    score: number,
    maxScore: number,
    answers: any[],
  ) {
    try {
      this.logger.log(`[saveDocumentAttempt] Saving attempt for exam ${examId}, student ${studentId}`);
      this.logger.log(`[saveDocumentAttempt] Stats: ${correctAnswers}/${totalQuestions} correct, score: ${score}/${maxScore}`);

      // Create the attempt record
      const attempt = this.attemptRepository.create({
        examId,
        studentId,
        status: 'submitted',
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        score,
        maxScore,
        startedAt: new Date(),
        submittedAt: new Date(),
        timeSpentSeconds: 0, // We don't track time for document exams
      });

      const savedAttempt = await this.attemptRepository.save(attempt);
      
      this.logger.log(`[saveDocumentAttempt] Attempt saved successfully with ID: ${savedAttempt.id}`);

      return {
        success: true,
        attemptId: savedAttempt.id,
        message: 'Document exam attempt saved successfully',
      };
    } catch (error) {
      this.logger.error(`[saveDocumentAttempt] Error saving attempt:`, error);
      throw error;
    }
  }

  /**
   * Update attempt statistics by recalculating from answers
   */
  private async updateAttemptStats(attemptId: string) {
    const answers = await this.answerRepository.find({
      where: { attemptId },
    });

    const answeredQuestions = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect === true).length;
    const totalScore = answers.reduce((sum, a) => sum + (Number(a.pointsEarned) || 0), 0);

    await this.attemptRepository.update(attemptId, {
      answeredQuestions,
      correctAnswers,
      score: totalScore,
    });
  }

  /**
   * Auto-grade an answer based on question type
   * 
   * Phase 6: Enhanced Auto-Grading Logic
   * - MCQ: Exact match
   * - True/False: Exact match
   * - Fill-in-blank: Fuzzy matching with Levenshtein distance
   * - Open-ended/Essay: Manual grading (teacher reviews later)
   */
  private gradeAnswer(
    questionType: string,
    questionData: any,
    answerData: any,
    maxPoints: number,
  ): { isCorrect: boolean | null; pointsEarned: number | null } {
    switch (questionType) {
      case 'mcq':
      case 'multiple_choice':
        // Multiple choice: exact match
        // answerData can be: string (direct answer) or { selectedOption: string }
        const selectedOption = typeof answerData === 'object' && answerData.selectedOption 
          ? answerData.selectedOption 
          : answerData;
        const isCorrectMcq = selectedOption === questionData.correctAnswer;
        return {
          isCorrect: isCorrectMcq,
          pointsEarned: isCorrectMcq ? maxPoints : 0,
        };

      case 'true_false':
        // True/False: exact match (case-insensitive)
        // answerData can be: string (direct answer) or { answer: string }
        const rawAnswerTF = typeof answerData === 'object' && answerData.answer 
          ? answerData.answer 
          : answerData;
        const studentAnswerTF = (rawAnswerTF || '').toString().toLowerCase().trim();
        const correctAnswerTF = (questionData.correctAnswer || '').toString().toLowerCase().trim();
        const isCorrectTF = studentAnswerTF === correctAnswerTF;
        return {
          isCorrect: isCorrectTF,
          pointsEarned: isCorrectTF ? maxPoints : 0,
        };

      case 'fill_blank':
      case 'fill_in_blank':
        // Fill in the blank: fuzzy matching with Levenshtein distance
        // answerData can be: string (direct answer) or { answer: string }
        const rawAnswer = typeof answerData === 'object' && answerData.answer 
          ? answerData.answer 
          : answerData;

        const correctAnswers = Array.isArray(questionData.correctAnswers) 
          ? questionData.correctAnswers 
          : [questionData.correctAnswer];
        
        const studentAnswer = (rawAnswer || '').toString().trim().toLowerCase();
        
        if (!studentAnswer) {
          return { isCorrect: false, pointsEarned: 0 };
        }

        // Check for exact matches first
        const exactMatch = correctAnswers.some(
          (ca: string) => ca.toString().trim().toLowerCase() === studentAnswer,
        );

        if (exactMatch) {
          return { isCorrect: true, pointsEarned: maxPoints };
        }

        // Fuzzy matching: allow small typos using Levenshtein distance
        // Consider correct if similarity > 80%
        let bestSimilarity = 0;
        for (const correctAnswer of correctAnswers) {
          const similarity = this.calculateSimilarity(
            studentAnswer,
            correctAnswer.toString().trim().toLowerCase()
          );
          bestSimilarity = Math.max(bestSimilarity, similarity);
        }

        const isCorrectFB = bestSimilarity >= 0.8; // 80% similarity threshold
        const partialPoints = isCorrectFB ? maxPoints : 0;

        this.logger.log(`Fill-in-blank grading: student="${studentAnswer}", correct="${correctAnswers[0]}", similarity=${bestSimilarity}, isCorrect=${isCorrectFB}`);

        return {
          isCorrect: isCorrectFB,
          pointsEarned: partialPoints,
        };

      case 'essay':
      case 'short_answer':
      case 'open':
        // Open-ended/Essay: requires manual grading by teacher
        this.logger.log(`Essay/Open question - manual grading required for question type: ${questionType}`);
        return {
          isCorrect: null, // null indicates pending manual grading
          pointsEarned: null,
        };

      default:
        this.logger.warn(`Unknown question type for grading: ${questionType}`);
        return {
          isCorrect: null,
          pointsEarned: null,
        };
    }
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Returns the minimum number of single-character edits required to change one string into the other
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Manually grade an essay/open-ended answer
   * This allows teachers to review and grade answers that require manual evaluation
   */
  async manuallyGradeAnswer(
    attemptId: string,
    answerId: string,
    teacherId: string,
    pointsEarned: number,
    feedback?: string,
  ) {
    // 1. Get the answer and verify it exists
    const answer = await this.answerRepository.findOne({
      where: { id: answerId, attemptId },
      relations: ['attempt', 'attempt.exam', 'attempt.exam.owner'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // 2. Verify the teacher owns the exam
    if (answer.attempt.exam.ownerId !== teacherId) {
      throw new ForbiddenException('Only the exam owner can manually grade answers');
    }

    // 3. Get the question to verify max points
    const question = await this.questionSetRepository.findOne({
      where: { id: answer.examQuestionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // 4. Validate points don't exceed maximum
    if (pointsEarned > question.points) {
      throw new BadRequestException(
        `Points earned (${pointsEarned}) cannot exceed maximum points (${question.points})`,
      );
    }

    if (pointsEarned < 0) {
      throw new BadRequestException('Points earned cannot be negative');
    }

    // 5. Update the answer with manual grading
    answer.pointsEarned = pointsEarned;
    answer.isCorrect = pointsEarned === question.points; // Full points = correct
    answer.feedback = feedback || null;
    answer.gradedBy = 'teacher';
    answer.gradedAt = new Date();

    await this.answerRepository.save(answer);

    // 6. Recalculate attempt statistics
    await this.updateAttemptStats(attemptId);

    this.logger.log(
      `Answer ${answerId} manually graded by teacher ${teacherId}: ${pointsEarned}/${question.points} points`,
    );

    return {
      success: true,
      answer: {
        id: answer.id,
        pointsEarned: answer.pointsEarned,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
      },
    };
  }
}
