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
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto, SummarizeDto, TranslateDto, GenerateEmailDto } from './dto/chat.dto';
import { GenerateQuestionsDto, GenerateQuestionsResponse } from './dto/generate-questions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from '../documents/documents.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { EmbeddingService } from '../exam-pipeline/embedding.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly documentsService: DocumentsService,
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(ExamQuestionEntity)
    private readonly examQuestionRepo: Repository<ExamQuestionEntity>,
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
