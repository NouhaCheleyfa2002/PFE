import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Request,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto, SummarizeDto, TranslateDto, GenerateEmailDto } from './dto/chat.dto';
import { GenerateQuestionsDto, GenerateQuestionsResponse } from './dto/generate-questions.dto';
import { GenerateExamDto, GenerateExamResponse } from './dto/generate-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { EmbeddingService } from '../exam-pipeline/embedding.service';
import { ResourceCollaboratorEntity } from '../collaboration/entities/resource-collaborator.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly documentsService: DocumentsService,
    private readonly embeddingService: EmbeddingService,
    @Inject(forwardRef(() => CollaborationService))
    private readonly collaborationService: CollaborationService,
    @InjectRepository(ExamQuestionEntity)
    private readonly examQuestionRepo: Repository<ExamQuestionEntity>,
    @InjectRepository(ResourceCollaboratorEntity)
    private readonly collaboratorRepo: Repository<ResourceCollaboratorEntity>,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() chatDto: ChatDto) {
    const response = await this.aiService.chat(chatDto.prompt, chatDto.context);
    return {
      success: true,
      response,
    };
  }

  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  async summarize(@Body() summarizeDto: SummarizeDto) {
    const response = await this.aiService.summarize(summarizeDto.text);
    return {
      success: true,
      summary: response,
    };
  }

  @Post('translate')
  @HttpCode(HttpStatus.OK)
  async translate(@Body() translateDto: TranslateDto) {
    const response = await this.aiService.translate(
      translateDto.text,
      translateDto.targetLanguage,
    );
    return {
      success: true,
      translation: response,
      targetLanguage: translateDto.targetLanguage,
    };
  }

  @Post('generate-email')
  @HttpCode(HttpStatus.OK)
  async generateEmail(@Body() generateEmailDto: GenerateEmailDto) {
    const response = await this.aiService.generateEmail(
      generateEmailDto.purpose,
      generateEmailDto.tone || 'professional',
    );
    return {
      success: true,
      email: response,
      tone: generateEmailDto.tone || 'professional',
    };
  }

  @Get('status')
  async getStatus() {
    const status = await this.aiService.getServiceStatus();
    return {
      success: true,
      ...status,
    };
  }

  @Post('generate-questions')
  @HttpCode(HttpStatus.OK)
  async generateQuestions(
    @Body() dto: GenerateQuestionsDto,
    @Request() req: any,
  ): Promise<GenerateQuestionsResponse> {
    // Fetch document
    const document = await this.documentsService.findById(dto.documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check ownership (user can only generate from their own documents or if admin)
    if (document.userId !== req.user.sub && req.user.role !== 'admin') {
      throw new NotFoundException('Document not found');
    }

    // Fetch OCR text from document
    if (!document.ocrResultUrl) {
      throw new HttpException(
        'Document has not been processed yet',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Fetch OCR result from storage
    const ocrText = await this.fetchOcrText(document.ocrResultUrl);

    // Generate questions using AI
    const generatedQuestions = await this.aiService.generateQuestions(
      ocrText,
      dto.questionCount,
      dto.difficulty,
      dto.topics,
      dto.customInstructions,
    );

    // Save questions to database with embeddings
    const savedQuestions = await Promise.all(
      generatedQuestions.map(async (q) => {
        // Generate embedding for the question
        const embeddingArray = await this.embeddingService.generateEmbedding(q.text);
        const embeddingString = `[${embeddingArray.join(',')}]`;

        const question = this.examQuestionRepo.create({
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          topic: q.topic,
          difficulty: q.difficulty,
          explanation: q.explanation,
          embedding: embeddingString,
          documentId: document.id,
        });

        return this.examQuestionRepo.save(question);
      }),
    );

    return {
      questions: generatedQuestions,
      documentId: document.id,
      documentTitle: document.title || document.originalName,
      generatedAt: new Date(),
      count: savedQuestions.length,
    };
  }

  @Post('generate-variations')
  @HttpCode(HttpStatus.OK)
  async generateVariations(
    @Body() dto: any, // Will use proper DTO
    @Request() req: any,
  ) {
    // Fetch original question
    const question = await this.examQuestionRepo.findOne({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const variationTypes = dto.variationType === 'all'
      ? ['easier', 'harder', 'scenario_based', 'mcq', 'true_false', 'short_answer']
      : [dto.variationType];

    const variations = await this.aiService.generateQuestionVariations(
      question,
      variationTypes,
      dto.customInstructions,
    );

    // Optionally save variations to database
    const savedVariations = await Promise.all(
      variations.map(async (v: any) => {
        const embeddingArray = await this.embeddingService.generateEmbedding(v.text);
        const embeddingString = `[${embeddingArray.join(',')}]`;

        const variationQuestion = this.examQuestionRepo.create({
          questionText: v.text,
          questionType: v.type,
          options: v.options,
          correctAnswer: v.correctAnswer,
          difficulty: v.difficulty,
          explanation: v.explanation,
          topic: question.topic,
          embedding: embeddingString,
          documentId: question.documentId,
        });

        return this.examQuestionRepo.save(variationQuestion);
      }),
    );

    return {
      success: true,
      variations: savedVariations,
      originalQuestion: {
        id: question.id,
        text: question.questionText,
        type: question.questionType,
      },
    };
  }

  @Post('improve-question')
  @HttpCode(HttpStatus.OK)
  async improveQuestion(
    @Body() dto: any, // Will use proper DTO
    @Request() req: any,
  ) {
    // Fetch question
    const question = await this.examQuestionRepo.findOne({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const improvement = await this.aiService.improveQuestion(
      question,
      dto.improvementTypes,
      dto.customInstructions,
    );

    return {
      success: true,
      questionId: question.id,
      originalQuestion: {
        text: question.questionText,
        type: question.questionType,
        options: question.options,
      },
      improvedQuestion: {
        text: improvement.improvedText,
        options: improvement.improvedOptions,
      },
      improvements: improvement.improvements,
      summary: improvement.summary,
    };
  }

  @Post('generate-rubric')
  @HttpCode(HttpStatus.OK)
  async generateRubric(
    @Body() dto: any, // Will use proper DTO
    @Request() req: any,
  ) {
    // Fetch question
    const question = await this.examQuestionRepo.findOne({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const rubric = await this.aiService.generateRubric(
      question,
      dto.totalPoints || 10,
      dto.criteria,
      dto.customInstructions,
    );

    return {
      success: true,
      questionId: question.id,
      questionText: question.text,
      totalPoints: dto.totalPoints || 10,
      criteria: rubric.criteria,
      generatedAt: new Date(),
    };
  }

  @Post('chat-with-document')
  @HttpCode(HttpStatus.OK)
  async chatWithDocument(
    @Body() dto: any, // Will use proper DTO
    @Request() req: any,
  ) {
    // Fetch document
    const document = await this.documentsService.findById(dto.documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check ownership or collaboration access
    // Allow if: user is owner, user is admin, or user is a collaborator
    const isOwner = document.userId === req.user.sub;
    const isAdmin = req.user.role === 'admin';
    
    // Check if user is a collaborator with accepted status
    let isCollaborator = false;
    if (!isOwner && !isAdmin) {
      const collaborator = await this.collaboratorRepo.findOne({
        where: { 
          resourceId: dto.documentId, 
          userId: req.user.sub,
          status: 'accepted' // Only accepted collaborators have access
        },
      });
      isCollaborator = !!collaborator;
    }
    
    if (!isOwner && !isAdmin && !isCollaborator) {
      throw new NotFoundException('Document not found');
    }

    // Fetch OCR text
    if (!document.ocrResultUrl) {
      throw new HttpException(
        'Document has not been processed yet',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ocrText = await this.fetchOcrText(document.ocrResultUrl);

    const chatResponse = await this.aiService.chatWithDocument(
      ocrText,
      dto.message,
      dto.conversationHistory,
    );
    return {
      success: true,
      response: chatResponse.response,
      suggestedFollowUps: chatResponse.suggestedFollowUps,
      documentId: document.id,
      documentTitle: document.title || document.originalName,
      timestamp: new Date(),
    };
  }

  @Post('generate-exam')
  @HttpCode(HttpStatus.OK)
  async generateExam(
    @Body() dto: GenerateExamDto,
    @Request() req: any,
  ) {
    return await this.aiService.generateCompleteExam(dto, req.user.sub);
  }

  private async fetchOcrText(ocrResultUrl: string): Promise<string> {
    try {
      const axios = require('axios');
      const response = await axios.get(ocrResultUrl);
      
      // OCR result is JSON with pages array
      if (response.data.pages && Array.isArray(response.data.pages)) {
        return response.data.pages.map((page: any) => page.text).join('\n\n');
      }

      throw new Error('Invalid OCR result format');
    } catch (error) {
      throw new HttpException(
        'Failed to fetch OCR result',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
