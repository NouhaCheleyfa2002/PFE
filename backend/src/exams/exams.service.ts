import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamEntity } from './entities/exam.entity';
import { ExamSubmissionEntity } from './entities/exam-submission.entity';
import { ExamQuestionSetEntity } from './entities/exam-question-set.entity';
import { ExamAttemptEntity, AttemptStatus } from './entities/exam-attempt.entity';
import { ExamAnswerEntity } from './entities/exam-answer.entity';
import { CreateExamDto, UpdateExamDto, PublishExamDto } from './dto/exam.dto';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';
import { ExamCollaboratorEntity } from '../collaboration/entities/exam-collaborator.entity';
import { MailService } from '../mail/mail.service';
import { ExamDocumentGeneratorService } from './services/exam-document-generator.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepository: Repository<ExamEntity>,
    @InjectRepository(ExamSubmissionEntity)
    private readonly submissionRepository: Repository<ExamSubmissionEntity>,
    @InjectRepository(ExamQuestionSetEntity)
    private readonly questionSetRepository: Repository<ExamQuestionSetEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly attemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(ExamAnswerEntity)
    private readonly answerRepository: Repository<ExamAnswerEntity>,
    @InjectRepository(ResourceCollaboratorEntity)
    private readonly collaboratorRepository: Repository<ResourceCollaboratorEntity>,
    @InjectRepository(ExamCollaboratorEntity)
    private readonly examCollaboratorRepository: Repository<ExamCollaboratorEntity>,
    private readonly mailService: MailService,
    private readonly documentGenerator: ExamDocumentGeneratorService,
    private readonly uploadService: UploadService,
  ) {}

  async create(userId: string, dto: CreateExamDto) {
    const exam = this.examRepository.create({
      ownerId: userId,
      title: dto.title,
      classLevel: dto.classLevel,
      subject: dto.subject,
      duration: dto.duration,
      instructions: dto.instructions,
      questions: dto.questions,
      templateId: dto.templateId,
      maxPoints: dto.maxPoints,
      sourceType: dto.sourceType || 'manual', // Default to manual if not specified
      status: 'draft',
    });

    return this.examRepository.save(exam);
  }

  async findAll(userId: string) {
    const exams = await this.examRepository.find({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });

    return {
      exams,
      total: exams.length,
    };
  }

  async findOne(id: string, userId: string) {
    const exam = await this.examRepository.findOne({ 
      where: { id },
      relations: ['owner'],
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Allow access if:
    // 1. User is the owner
    // 2. User is a collaborator
    // 3. Exam is published and approved (marketplace access)
    if (exam.ownerId === userId) {
      return exam;
    }

    // Check if exam is in marketplace (published and approved)
    if (exam.isPublished && exam.verificationStatus === 'approved') {
      return exam;
    }

    // Check collaboration access for non-published exams
    const collaborator = await this.examCollaboratorRepository.findOne({
      where: {
        examId: id,
        userId,
        status: 'accepted',
      },
    });

    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this exam');
    }

    return exam;
  }

  async update(id: string, userId: string, dto: UpdateExamDto) {
    // First check if exam exists and user has access
    const exam = await this.findOne(id, userId);

    // Update exam with provided fields
    Object.assign(exam, dto);

    return this.examRepository.save(exam);
  }

  async delete(id: string, userId: string) {
    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.ownerId !== userId) {
      throw new ForbiddenException('Only the exam owner can delete it');
    }

    await this.examRepository.remove(exam);
  }

  // Publishing methods

  async publish(id: string, userId: string, publishDto: PublishExamDto, pdfBuffer?: Buffer) {
    const exam = await this.examRepository.findOne({ where: { id }, relations: ['owner'] });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.ownerId !== userId) {
      throw new ForbiddenException('Only the exam owner can publish it');
    }

    // Validate exam has questions
    if (!exam.questions || exam.questions.length === 0) {
      throw new BadRequestException('Cannot publish exam without questions');
    }

    // Validate paid license has price
    if (publishDto.license === 'paid' && (!publishDto.price || publishDto.price <= 0)) {
      throw new BadRequestException('Paid exams must have a price greater than 0');
    }

    this.logger.log(`Publishing exam ${id}`);

    try {
      let pdfUrl: string | null = null;

      // If PDF buffer provided from frontend, use it; otherwise generate on backend
      if (pdfBuffer) {
        this.logger.log(`Using frontend-generated PDF for exam ${id}`);
        
        // Upload PDF to storage
        const pdfFile = {
          originalname: `${publishDto.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          buffer: pdfBuffer,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
        } as Express.Multer.File;

        const pdfUploadResult = await this.uploadService.uploadFile(pdfFile);
        pdfUrl = pdfUploadResult.fileUrl;
        this.logger.log(`PDF uploaded: ${pdfUrl}`);
      } else {
        // Fallback: Generate PDF on backend
        this.logger.log(`Generating PDF on backend for exam ${id}`);
        
        const examData = {
          title: publishDto.title,
          classLevel: publishDto.classLevel,
          subject: publishDto.subject,
          bacSection: publishDto.bacSection,
          duration: exam.duration,
          instructions: publishDto.description || exam.instructions,
          questions: exam.questions,
          maxPoints: exam.questions.reduce((sum, q) => sum + (q.points || 1), 0),
        };

        const generatedPdfBuffer = await this.documentGenerator.generatePDF(examData);
        
        const pdfFile = {
          originalname: `${publishDto.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
          buffer: generatedPdfBuffer,
          mimetype: 'application/pdf',
          size: generatedPdfBuffer.length,
        } as Express.Multer.File;

        const pdfUploadResult = await this.uploadService.uploadFile(pdfFile);
        pdfUrl = pdfUploadResult.fileUrl;
        this.logger.log(`Backend-generated PDF uploaded: ${pdfUrl}`);
      }

      // Update exam with publishing metadata
      exam.title = publishDto.title;
      exam.classLevel = publishDto.classLevel;
      exam.subject = publishDto.subject;
      exam.bacSection = publishDto.bacSection || null;
      exam.description = publishDto.description || null;
      exam.keywords = publishDto.keywords || [];
      exam.license = publishDto.license;
      exam.price = publishDto.license === 'paid' ? (publishDto.price || null) : null;
      exam.sourceType = 'ai_generated'; // Mark as AI generated
      exam.isPublished = true;
      exam.publishedAt = new Date();
      exam.verificationStatus = 'pending'; // Needs admin approval
      exam.status = 'published';
      
      // Store PDF URL in exam metadata
      exam.pdfUrl = pdfUrl;

      // Get all accepted collaborators to add as co-authors
      const collaborators = await this.examCollaboratorRepository.find({
        where: { examId: id, status: 'accepted' },
        relations: ['user'],
      });

      if (collaborators && collaborators.length > 0) {
        exam.coAuthors = collaborators.map(collab => ({
          userId: collab.userId,
          fullName: collab.user?.fullName || 'Unknown',
          role: collab.role,
        }));
        this.logger.log(`Added ${collaborators.length} co-author(s) to published exam`);
      } else {
        exam.coAuthors = null;
      }

      const savedExam = await this.examRepository.save(exam);

      // Create exam question set (snapshot of questions for student practice)
      await this.createExamQuestionSet(savedExam.id, savedExam.questions);

      this.logger.log(`Exam ${savedExam.id} published with ${savedExam.questions.length} questions, PDF generated`);

      // Send exam published email
      try {
        if (exam.owner) {
          await this.mailService.sendExamPublished(
            exam.owner.email,
            exam.owner.fullName,
            exam.title,
            exam.id
          );
          this.logger.log(`Exam published email sent to: ${exam.owner.email}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to send exam published email: ${error.message}`);
      }

      return {
        ...savedExam,
        files: {
          pdf: pdfUrl,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to publish exam ${id}:`, error);
      throw new BadRequestException(`Failed to publish exam: ${error.message}`);
    }
  }

  /**
   * Create exam question set (snapshot for student practice)
   * This creates a permanent copy of questions that won't change if the teacher edits their question bank
   */
  private async createExamQuestionSet(examId: string, questions: any[]) {
    // Delete existing question set if republishing
    await this.questionSetRepository.delete({ examId });

    const questionSetEntries = questions.map((question, index) => {
      return this.questionSetRepository.create({
        examId,
        questionId: question.id || `q-${index}`, // Use question ID if available
        questionText: question.text || '',
        questionType: question.type || 'mcq',
        questionData: {
          options: question.options || [],
          correctAnswer: question.correctAnswer,
          blanks: question.blanks || [],
          matchPairs: question.matchPairs || [],
          lines: question.lines,
          imageUrl: question.imageUrl,
          imageCaption: question.imageCaption,
          explanation: question.explanation,
        },
        orderIndex: index,
        points: question.points || 1,
      });
    });

    await this.questionSetRepository.save(questionSetEntries);

    this.logger.log(`Created question set for exam ${examId} with ${questionSetEntries.length} questions`);
  }

  /**
   * Get exam for student practice
   * Returns the question set without correct answers
   */
  async getExamForPractice(examId: string, studentId: string) {
    const exam = await this.examRepository.findOne({ 
      where: { id: examId, isPublished: true, verificationStatus: 'approved' },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found or not available');
    }

    // Get question set
    const questions = await this.questionSetRepository.find({
      where: { examId },
      order: { orderIndex: 'ASC' },
    });

    if (questions.length === 0) {
      throw new BadRequestException('This exam has no questions available for practice');
    }

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        duration: exam.duration,
        classLevel: exam.classLevel,
        subject: exam.subject,
        maxPoints: questions.reduce((sum, q) => sum + q.points, 0),
        totalQuestions: questions.length,
      },
      questions: questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.questionText,
        type: q.questionType,
        points: q.points,
        // Don't include correct answers
        options: q.questionData.options,
        blanks: q.questionData.blanks,
        matchPairs: q.questionData.matchPairs,
        lines: q.questionData.lines,
        imageUrl: q.questionData.imageUrl,
        imageCaption: q.questionData.imageCaption,
      })),
    };
  }

  async getAIGeneratedExams(userId: string) {
    const exams = await this.examRepository.find({
      where: { ownerId: userId, sourceType: 'ai_generated' },
      relations: ['owner'],
      order: { updatedAt: 'DESC' },
    });

    return {
      exams,
      total: exams.length,
    };
  }

  async getPendingExams() {
    const exams = await this.examRepository.find({
      where: { 
        isPublished: true, 
        verificationStatus: 'pending',
        sourceType: 'ai_generated', // Only AI-generated exams
      },
      relations: ['owner'],
      order: { publishedAt: 'DESC' },
    });

    return {
      exams,
      total: exams.length,
    };
  }

  async approveExam(id: string, adminId: string) {
    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.isPublished) {
      throw new BadRequestException('Exam is not published');
    }

    exam.verificationStatus = 'approved';
    exam.verifiedAt = new Date();
    exam.verifiedBy = adminId;
    exam.rejectionReason = null;

    return this.examRepository.save(exam);
  }

  async rejectExam(id: string, adminId: string, reason: string) {
    const exam = await this.examRepository.findOne({ where: { id } });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.isPublished) {
      throw new BadRequestException('Exam is not published');
    }

    exam.verificationStatus = 'rejected';
    exam.verifiedAt = new Date();
    exam.verifiedBy = adminId;
    exam.rejectionReason = reason;

    return this.examRepository.save(exam);
  }

  async getMarketplaceExams(filters?: {
    classLevel?: string;
    subject?: string;
    license?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    let query = this.examRepository
      .createQueryBuilder('exam')
      .leftJoinAndSelect('exam.owner', 'owner')
      .where('exam.isPublished = :isPublished', { isPublished: true })
      .andWhere('exam.verificationStatus = :status', { status: 'approved' });

    if (filters?.classLevel) {
      query = query.andWhere('exam.classLevel = :classLevel', { classLevel: filters.classLevel });
    }

    if (filters?.subject) {
      query = query.andWhere('exam.subject = :subject', { subject: filters.subject });
    }

    if (filters?.license) {
      query = query.andWhere('exam.license = :license', { license: filters.license });
    }

    const [exams, total] = await query
      .orderBy('exam.publishedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      exams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async incrementViews(id: string) {
    await this.examRepository.increment({ id }, 'views', 1);
  }

  async incrementDownloads(id: string) {
    await this.examRepository.increment({ id }, 'downloads', 1);
  }

  // Get exam owner ID without access checks (for rating system)
  async getExamOwnerId(id: string): Promise<string | null> {
    const exam = await this.examRepository.findOne({
      where: { id },
      select: ['id', 'ownerId'],
    });
    return exam?.ownerId || null;
  }

  /**
   * Create an exam from an uploaded document
   * This bridges the document upload flow with the new exam system
   */
  async createExamFromDocument(
    documentId: string,
    userId: string,
    metadata: {
      title?: string;
      classLevel?: string;
      subject?: string;
      duration?: string;
      instructions?: string;
    }
  ) {
    // This will need to be implemented by:
    // 1. Fetching the document
    // 2. Fetching extracted questions from the exam_questions table
    // 3. Creating an exam with those questions
    // 4. Marking it as ready for publishing
    
    // For now, return a placeholder response
    throw new BadRequestException(
      'Creating exams from documents requires question extraction. Please use the exam builder to create exams from extracted questions.'
    );
  }

  // Exam submission methods for students
  
  async startExam(examId: string, studentId: string) {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (!exam.isPublished || exam.verificationStatus !== 'approved') {
      throw new ForbiddenException('This exam is not available');
    }

    return {
      examId: exam.id,
      title: exam.title,
      duration: exam.duration,
      instructions: exam.instructions,
      questions: exam.questions.map(q => ({
        ...q,
        // Don't send correct answers to frontend
        correctAnswer: undefined,
        solution: undefined,
      })),
      maxPoints: exam.maxPoints,
      startedAt: new Date(),
    };
  }

  async submitExam(
    examId: string,
    studentId: string,
    answers: Record<string, any>,
    timeSpent: number,
  ) {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Calculate score
    let score = 0;
    let maxScore = 0;
    const results: any[] = [];

    exam.questions.forEach((question: any) => {
      const studentAnswer = answers[question.id];
      const points = question.points || 1;
      maxScore += points;

      let isCorrect = false;
      
      // Check answer based on question type
      if (question.type === 'multiple-choice') {
        isCorrect = studentAnswer === question.correctAnswer;
      } else if (question.type === 'true-false') {
        isCorrect = studentAnswer === question.correctAnswer;
      } else if (question.type === 'short-answer') {
        // For short answer, skip auto-grading
        isCorrect = false;
      }

      if (isCorrect) {
        score += points;
      }

      results.push({
        questionId: question.id,
        studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: isCorrect ? points : 0,
        maxPoints: points,
      });
    });

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    // Save submission to database
    const submission = this.submissionRepository.create({
      examId,
      studentId,
      answers,
      score,
      maxScore,
      percentage: parseFloat(percentage.toFixed(2)),
      timeSpent,
      status: 'submitted',
      startedAt: new Date(Date.now() - timeSpent * 1000),
      submittedAt: new Date(),
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    return {
      submissionId: savedSubmission.id,
      score,
      maxScore,
      percentage: parseFloat(percentage.toFixed(2)),
      timeSpent,
      results,
      passed: percentage >= 50, // 50% passing grade
    };
  }

  async getStudentSubmissions(examId: string, studentId: string) {
    const submissions = await this.submissionRepository.find({
      where: { examId, studentId },
      order: { submittedAt: 'DESC' },
    });

    return {
      submissions,
      total: submissions.length,
    };
  }

  async getSubmissionDetails(submissionId: string, studentId: string) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId, studentId },
      relations: ['exam'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Reconstruct results with question details
    const exam = submission.exam;
    const results = exam.questions.map((question: any) => {
      const studentAnswer = submission.answers[question.id];
      const points = question.points || 1;
      
      let isCorrect = false;
      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        isCorrect = studentAnswer === question.correctAnswer;
      }

      return {
        question: {
          id: question.id,
          text: question.text,
          type: question.type,
          options: question.options,
          imageUrl: question.imageUrl,
        },
        studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: isCorrect ? points : 0,
        maxPoints: points,
      };
    });

    return {
      ...submission,
      results,
    };
  }

  /**
   * Get analytics for an exam (teacher only)
   * Phase 7: Analytics & Insights
   */
  async getExamAnalytics(examId: string, teacherId: string) {
    // 1. Verify exam exists and teacher owns it
    const exam = await this.examRepository.findOne({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.ownerId !== teacherId) {
      throw new ForbiddenException('Only the exam owner can view analytics');
    }

    // 2. Get all attempts for this exam
    const attempts = await this.attemptRepository.find({
      where: { examId, status: 'submitted' as AttemptStatus },
      relations: ['student'],
    });

    const totalAttempts = attempts.length;
    const uniqueStudents = new Set(attempts.map(a => a.studentId)).size;

    // 3. Calculate score statistics
    const scores = attempts.map(a => {
      if (a.score !== null && a.maxScore && a.maxScore > 0) {
        return (a.score / a.maxScore) * 100;
      }
      return 0;
    });
    
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;
    
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    // 4. Get question-level analytics
    const questions = await this.questionSetRepository.find({
      where: { examId },
      order: { orderIndex: 'ASC' },
    });

    const questionAnalytics = await Promise.all(
      questions.map(async (question) => {
        // Get all answers for this question
        const answers = await this.answerRepository
          .createQueryBuilder('answer')
          .innerJoin('answer.attempt', 'attempt')
          .where('answer.examQuestionId = :questionId', { questionId: question.id })
          .andWhere('attempt.status = :status', { status: 'submitted' })
          .getMany();

        const totalAnswers = answers.length;
        const correctAnswers = answers.filter(a => a.isCorrect === true).length;
        const incorrectAnswers = answers.filter(a => a.isCorrect === false).length;
        const pendingGrading = answers.filter(a => a.isCorrect === null).length;

        const correctPercentage = totalAnswers > 0 
          ? (correctAnswers / totalAnswers) * 100 
          : 0;

        // Calculate difficulty (inverse of success rate)
        const difficulty = correctPercentage >= 80 ? 'easy'
          : correctPercentage >= 50 ? 'medium'
          : correctPercentage >= 30 ? 'hard'
          : 'very_hard';

        return {
          questionId: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          points: question.points,
          orderIndex: question.orderIndex,
          stats: {
            totalAnswers,
            correctAnswers,
            incorrectAnswers,
            pendingGrading,
            correctPercentage: Math.round(correctPercentage),
            difficulty,
          },
        };
      })
    );

    // 5. Find most missed questions (lowest correct percentage)
    const mostMissedQuestions = [...questionAnalytics]
      .filter(q => q.stats.totalAnswers > 0)
      .sort((a, b) => a.stats.correctPercentage - b.stats.correctPercentage)
      .slice(0, 5)
      .map(q => ({
        questionText: q.questionText,
        correctPercentage: q.stats.correctPercentage,
        totalAnswers: q.stats.totalAnswers,
      }));

    // 6. Calculate completion metrics
    const avgTimeSpent = attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) / attempts.length
      : 0;

    this.logger.log(`Analytics generated for exam ${examId}: ${totalAttempts} attempts, avg score ${averageScore.toFixed(1)}%`);

    return {
      examId,
      examTitle: exam.title,
      overview: {
        totalAttempts,
        uniqueStudents,
        averageScore: Math.round(averageScore * 10) / 10,
        maxScore: Math.round(maxScore * 10) / 10,
        minScore: Math.round(minScore * 10) / 10,
        averageTimeSpent: Math.round(avgTimeSpent),
        totalQuestions: questions.length,
      },
      questionAnalytics,
      mostMissedQuestions,
      recentAttempts: attempts
        .filter(a => a.submittedAt !== null)
        .sort((a, b) => (b.submittedAt!.getTime() - a.submittedAt!.getTime()))
        .slice(0, 10)
        .map(a => {
          const scorePercentage = a.score !== null && a.maxScore && a.maxScore > 0
            ? (a.score / a.maxScore) * 100
            : 0;
          
          return {
            studentName: a.student ? `${a.student.fullName || 'Unknown'}` : 'Unknown',
            score: Math.round(scorePercentage * 10) / 10,
            timeSpent: a.timeSpentSeconds || 0,
            submittedAt: a.submittedAt!,
          };
        }),
    };
  }
}
