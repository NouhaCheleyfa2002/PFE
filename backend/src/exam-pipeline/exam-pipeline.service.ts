import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ExamQuestionEntity } from './entities/exam-question.entity';
import { SearchHistoryEntity } from './entities/search-history.entity';
import { ExamParserService } from './exam-parser.service';
import { EmbeddingService } from './embedding.service';
import {
  ParsedQuestion,
  PipelineResult,
  SemanticSearchResult,
} from './interfaces/exam-pipeline.interface';

@Injectable()
export class ExamPipelineService {
  private readonly logger = new Logger(ExamPipelineService.name);

  constructor(
    @InjectRepository(ExamQuestionEntity)
    private readonly questionRepository: Repository<ExamQuestionEntity>,
    @InjectRepository(SearchHistoryEntity)
    private readonly searchHistoryRepo: Repository<SearchHistoryEntity>,
    private readonly examParserService: ExamParserService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Process a document through the complete pipeline:
   * OCR text → Extract Metadata → Parse → Generate Embeddings → Store
   * Returns both pipeline result and extracted metadata
   */
  async processDocument(
    documentId: string,
    ocrText: string,
    customPrompt?: string,
  ): Promise<PipelineResult & { metadata?: { title: string | null; level: string | null; subject: string | null; year: number | null } }> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.logger.log(`Starting pipeline for document: ${documentId}`);

    try {
      // Step 0: Extract exam metadata (title, level, subject, year)
      this.logger.log('Step 0: Extracting exam metadata...');
      const metadata = await this.examParserService.extractExamMetadata(ocrText);
      this.logger.log('Extracted metadata:', metadata);

      // Step 1: Parse exam text with DeepSeek
      this.logger.log('Step 1: Parsing exam text with DeepSeek...');
      const parsedQuestions = await this.examParserService.parseExamText(
        ocrText,
        customPrompt,
      );

      if (parsedQuestions.length === 0) {
        this.logger.warn('No questions extracted from document');
        return {
          success: true,
          documentId,
          questionsExtracted: 0,
          questionsStored: 0,
          errors: ['No questions found in document'],
          processingTimeMs: Date.now() - startTime,
          metadata,
        };
      }

      this.logger.log(`Extracted ${parsedQuestions.length} questions`);

      // Step 2: Generate embeddings for all questions
      this.logger.log('Step 2: Generating embeddings...');
      const questionsWithEmbeddings = await this.generateEmbeddingsForQuestions(
        parsedQuestions,
        errors,
      );

      // Step 3: Store questions in database
      this.logger.log('Step 3: Storing questions in database...');
      const storedCount = await this.storeQuestions(
        documentId,
        questionsWithEmbeddings,
        errors,
      );

      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Pipeline completed: ${storedCount}/${parsedQuestions.length} questions stored in ${processingTimeMs}ms`,
      );

      return {
        success: storedCount > 0,
        documentId,
        questionsExtracted: parsedQuestions.length,
        questionsStored: storedCount,
        errors,
        processingTimeMs,
        metadata,
      };
    } catch (error) {
      this.logger.error('Pipeline failed:', error);
      errors.push(error.message);

      return {
        success: false,
        documentId,
        questionsExtracted: 0,
        questionsStored: 0,
        errors,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate embeddings for all questions
   */
  private async generateEmbeddingsForQuestions(
    questions: ParsedQuestion[],
    errors: string[],
  ): Promise<Array<ParsedQuestion & { embedding: number[] | null }>> {
    const questionsWithEmbeddings: Array<
      ParsedQuestion & { embedding: number[] | null }
    > = [];

    // Prepare texts for batch embedding
    const texts = questions.map((q) =>
      this.embeddingService.prepareQuestionText(q.text, q.topic, q.difficulty),
    );

    try {
      // Generate embeddings in batch
      const embeddings = await this.embeddingService.generateBatchEmbeddings(
        texts,
      );

      // Combine questions with embeddings
      for (let i = 0; i < questions.length; i++) {
        questionsWithEmbeddings.push({
          ...questions[i],
          embedding: embeddings[i] || null,
        });
      }
    } catch (error) {
      this.logger.error('Batch embedding failed, falling back to individual:', error);
      errors.push(`Batch embedding failed: ${error.message}`);

      // Fallback: generate embeddings one by one
      for (const question of questions) {
        try {
          const text = this.embeddingService.prepareQuestionText(
            question.text,
            question.topic,
            question.difficulty,
          );
          const embedding = await this.embeddingService.generateEmbedding(text);
          questionsWithEmbeddings.push({ ...question, embedding });
        } catch (err) {
          this.logger.error(`Failed to generate embedding for question: ${question.id}`, err);
          errors.push(`Embedding failed for question ${question.id}`);
          questionsWithEmbeddings.push({ ...question, embedding: null });
        }
      }
    }

    return questionsWithEmbeddings;
  }

  /**
   * Store questions in database
   */
  private async storeQuestions(
    documentId: string,
    questions: Array<ParsedQuestion & { embedding: number[] | null }>,
    errors: string[],
  ): Promise<number> {
    let storedCount = 0;

    // Use transaction for atomic operation
    const queryRunner = this.questionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const question of questions) {
        try {
          // Validate question text exists
          if (!question.text || question.text.trim() === '') {
            this.logger.warn(`Skipping question ${question.id} with empty text`);
            errors.push(`Failed to store question: Question text is empty`);
            continue;
          }

          const entity = this.questionRepository.create({
            id: question.id,
            questionText: question.text, // Use questionText directly instead of text alias
            questionType: 'open', // Default type
            options: question.options,
            correctAnswer: question.correctAnswer,
            topic: question.topic,
            difficulty: question.difficulty,
            explanation: question.explanation,
            embedding: question.embedding
              ? `[${question.embedding.join(',')}]`
              : null,
            documentId,
            status: 'pending',
            extractionConfidence: 0.8, // Default confidence for old pipeline
            extractedAt: new Date(),
          });

          await queryRunner.manager.save(entity);
          storedCount++;
        } catch (err) {
          this.logger.error(`Failed to store question ${question.id}:`, err);
          errors.push(`Failed to store question: ${err.message}`);
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully stored ${storedCount} questions`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Transaction failed, rolling back:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }

    return storedCount;
  }

  /**
   * Enhanced semantic search with verified content boost and filtering
   */
  async semanticSearch(
    query: string,
    userId?: string,
    limit: number = 10,
    minSimilarity: number = 0.5,
    filters?: { 
      topic?: string; 
      difficulty?: string;
      classLevel?: string;
      subject?: string;
      verifiedOnly?: boolean;
    },
  ): Promise<SemanticSearchResult[]> {
    this.logger.log(`Semantic search: "${query}" (limit: ${limit})`);

    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Build SQL query with vector similarity
    let sqlQuery = this.questionRepository
      .createQueryBuilder('q')
      .leftJoin('documents', 'd', 'd.id = q.documentId')
      .select([
        'q.id',
        'q.text',
        'q.options',
        'q.correctAnswer',
        'q.topic',
        'q.difficulty',
        'q.explanation',
        'q.documentId',
      ])
      .addSelect('d.title', 'documentTitle')
      .addSelect('d.is_verified', 'isVerified')
      .addSelect(
        `1 - (q.embedding <=> '[${queryEmbedding.join(',')}]')`,
        'similarity',
      )
      .where('q.embedding IS NOT NULL')
      .andWhere('q.deletedAt IS NULL') // Exclude soft-deleted
      .andWhere(`1 - (q.embedding <=> '[${queryEmbedding.join(',')}]') >= :minSimilarity`, {
        minSimilarity,
      });

    // Apply filters
    if (filters?.topic) {
      sqlQuery = sqlQuery.andWhere('q.topic = :topic', { topic: filters.topic });
    }
    if (filters?.difficulty) {
      sqlQuery = sqlQuery.andWhere('q.difficulty = :difficulty', {
        difficulty: filters.difficulty,
      });
    }
    if (filters?.classLevel) {
      sqlQuery = sqlQuery.andWhere('d.class_level = :classLevel', {
        classLevel: filters.classLevel,
      });
    }
    if (filters?.subject) {
      sqlQuery = sqlQuery.andWhere('LOWER(d.subject) = LOWER(:subject)', {
        subject: filters.subject,
      });
    }
    if (filters?.verifiedOnly) {
      sqlQuery = sqlQuery.andWhere('d.is_verified = true');
    }

    // Boost verified content in ranking
    const results = await sqlQuery
      .orderBy('CASE WHEN d.is_verified = true THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('similarity', 'DESC')
      .limit(limit)
      .getRawMany();

    // Save search history if userId provided
    if (userId) {
      await this.saveSearchHistory(userId, query, results.length, filters);
    }

    return results.map((r) => ({
      question: {
        id: r.q_id,
        text: r.q_text,
        options: r.q_options,
        correctAnswer: r.q_correctAnswer,
        topic: r.q_topic,
        difficulty: r.q_difficulty,
        explanation: r.q_explanation,
        documentId: r.q_documentId,
      },
      similarity: parseFloat(r.similarity),
      documentTitle: r.documentTitle,
      isVerified: r.isVerified,
    }));
  }

  /**
   * Get related questions based on similarity to a question
   */
  async getRelatedQuestions(
    questionId: string,
    limit: number = 5,
  ): Promise<SemanticSearchResult[]> {
    // Get the source question
    const sourceQuestion = await this.findById(questionId);
    if (!sourceQuestion || !sourceQuestion.embedding) {
      return [];
    }

    // Find similar questions using vector similarity
    const results = await this.questionRepository
      .createQueryBuilder('q')
      .leftJoin('documents', 'd', 'd.id = q.documentId')
      .select([
        'q.id',
        'q.text',
        'q.options',
        'q.correctAnswer',
        'q.topic',
        'q.difficulty',
        'q.explanation',
        'q.documentId',
      ])
      .addSelect('d.title', 'documentTitle')
      .addSelect('d.is_verified', 'isVerified')
      .addSelect(
        `1 - (q.embedding <=> '${sourceQuestion.embedding}')`,
        'similarity',
      )
      .where('q.id != :questionId', { questionId })
      .andWhere('q.embedding IS NOT NULL')
      .andWhere('q.deletedAt IS NULL') // Exclude soft-deleted
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      question: {
        id: r.q_id,
        text: r.q_text,
        options: r.q_options,
        correctAnswer: r.q_correctAnswer,
        topic: r.q_topic,
        difficulty: r.q_difficulty,
        explanation: r.q_explanation,
        documentId: r.q_documentId,
      },
      similarity: parseFloat(r.similarity),
      documentTitle: r.documentTitle,
      isVerified: r.isVerified,
    }));
  }

  /**
   * Save search history
   */
  private async saveSearchHistory(
    userId: string,
    query: string,
    resultsCount: number,
    filters?: any,
  ): Promise<void> {
    try {
      const history = this.searchHistoryRepo.create({
        userId,
        query,
        resultsCount,
        filters: filters || null,
      });
      await this.searchHistoryRepo.save(history);
    } catch (error) {
      this.logger.error('Failed to save search history:', error);
      // Don't throw - search history is not critical
    }
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(userId: string, limit: number = 20): Promise<SearchHistoryEntity[]> {
    return this.searchHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get popular searches (across all users)
   */
  async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    const results = await this.searchHistoryRepo
      .createQueryBuilder('sh')
      .select('sh.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .groupBy('sh.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((r) => ({
      query: r.query,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get all questions with pagination (excludes soft-deleted)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: { topic?: string; difficulty?: string },
  ) {
    const skip = (page - 1) * limit;

    let query = this.questionRepository.createQueryBuilder('q')
      .leftJoinAndSelect('q.document', 'document')
      .where('q.deletedAt IS NULL'); // Exclude soft-deleted questions

    if (filters?.topic) {
      query = query.andWhere('q.topic = :topic', { topic: filters.topic });
    }
    if (filters?.difficulty) {
      query = query.andWhere('q.difficulty = :difficulty', {
        difficulty: filters.difficulty,
      });
    }

    const [questions, total] = await query
      .orderBy('q.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      questions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update question with comprehensive fields
   */
  async updateQuestion(
    id: string, 
    updateData: {
      questionText?: string;
      questionType?: string;
      options?: string[] | null;
      correctAnswer?: string | null;
      difficulty?: string;
      topic?: string;
      visualContentRef?: string;
      hasVisualContent?: boolean;
      visualContentType?: string;
    }
  ): Promise<ExamQuestionEntity> {
    const question = await this.questionRepository.findOne({ 
      where: { id, deletedAt: IsNull() } 
    });
    
    if (!question) {
      throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
    }

    // Update fields if provided
    if (updateData.questionText !== undefined) {
      question.questionText = updateData.questionText;
    }
    if (updateData.questionType !== undefined) {
      question.questionType = updateData.questionType;
    }
    if (updateData.options !== undefined) {
      question.options = updateData.options;
    }
    if (updateData.correctAnswer !== undefined) {
      question.correctAnswer = updateData.correctAnswer;
    }
    if (updateData.difficulty !== undefined) {
      question.difficulty = updateData.difficulty;
    }
    if (updateData.topic !== undefined) {
      question.topic = updateData.topic;
    }
    if (updateData.visualContentRef !== undefined) {
      question.visualContentRef = updateData.visualContentRef;
    }
    if (updateData.hasVisualContent !== undefined) {
      question.hasVisualContent = updateData.hasVisualContent;
    }
    if (updateData.visualContentType !== undefined) {
      question.visualContentType = updateData.visualContentType;
    }

    question.updatedAt = new Date();

    return await this.questionRepository.save(question);
  }

  /**
   * Soft delete a question
   */
  async softDeleteQuestion(id: string): Promise<void> {
    const question = await this.questionRepository.findOne({ 
      where: { id, deletedAt: IsNull() } 
    });
    
    if (!question) {
      throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
    }

    question.deletedAt = new Date();
    await this.questionRepository.save(question);
    
    this.logger.log(`Question ${id} soft deleted`);
  }

  /**
   * Get question by ID (excludes soft-deleted)
   */
  async findById(id: string): Promise<ExamQuestionEntity | null> {
    return this.questionRepository.findOne({ 
      where: { id, deletedAt: IsNull() } 
    });
  }

  /**
   * Get all questions from a specific document (excludes soft-deleted)
   */
  async findByDocumentId(documentId: string): Promise<ExamQuestionEntity[]> {
    return this.questionRepository.find({
      where: { documentId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get all unique topics (excludes soft-deleted)
   */
  async getTopics(): Promise<string[]> {
    const results = await this.questionRepository
      .createQueryBuilder('q')
      .select('DISTINCT q.topic', 'topic')
      .where('q.topic IS NOT NULL')
      .andWhere('q.deletedAt IS NULL')
      .orderBy('q.topic', 'ASC')
      .getRawMany();

    return results.map((r) => r.topic);
  }

  /**
   * Get statistics (excludes soft-deleted)
   */
  async getStats() {
    const total = await this.questionRepository.count({ 
      where: { deletedAt: IsNull() } 
    });
    
    const byTopic = await this.questionRepository
      .createQueryBuilder('q')
      .select('q.topic', 'topic')
      .addSelect('COUNT(*)', 'count')
      .where('q.topic IS NOT NULL')
      .andWhere('q.deletedAt IS NULL')
      .groupBy('q.topic')
      .getRawMany();

    const byDifficulty = await this.questionRepository
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where('q.difficulty IS NOT NULL')
      .andWhere('q.deletedAt IS NULL')
      .groupBy('q.difficulty')
      .getRawMany();

    return {
      total,
      byTopic,
      byDifficulty,
    };
  }

  /**
   * Delete all questions from a document
   */
  async deleteByDocumentId(documentId: string): Promise<number> {
    const result = await this.questionRepository.delete({ documentId });
    return result.affected || 0;
  }
}
