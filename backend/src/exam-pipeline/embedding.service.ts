import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly embeddingsUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.embeddingsUrl = this.configService.get<string>(
      'EMBEDDINGS_SERVER_URL',
      'http://localhost:8000',
    );
    this.model = this.configService.get<string>(
      'EMBEDDINGS_MODEL',
      'BAAI/bge-m3',
    );

    this.axiosInstance = axios.create({
      baseURL: this.embeddingsUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(
      `Embedding service initialized with URL: ${this.embeddingsUrl}`,
    );
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      throw new HttpException(
        'Text cannot be empty for embedding generation',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Generating embedding for text (length: ${text.length})`);

    try {
      const requestData: EmbeddingRequest = {
        input: text,
        model: this.model,
      };

      const response = await this.axiosInstance.post<EmbeddingResponse>(
        '/v1/embeddings',
        requestData,
      );

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('No embedding returned from server');
      }

      const embedding = response.data.data[0].embedding;
      
      // Verify embedding dimension (BAAI/bge-small-en-v1.5 produces 384-dimensional vectors)
      const expectedDimension = 384; // bge-small-en-v1.5
      if (embedding.length !== expectedDimension) {
        this.logger.warn(
          `Unexpected embedding dimension: ${embedding.length} (expected ${expectedDimension})`,
        );
      }
      
      this.logger.log(
        `Embedding generated successfully (dimension: ${embedding.length})`,
      );

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Embeddings server is not available. Please ensure the embeddings container is running on port 8000.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        if (error.response?.status === 404) {
          throw new HttpException(
            'Embeddings endpoint not found. Verify the server is using OpenAI-compatible API format.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      throw new HttpException(
        `Failed to generate embedding: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new HttpException(
        'Texts array cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Generating embeddings for ${texts.length} texts`);

    try {
      const requestData: EmbeddingRequest = {
        input: texts,
        model: this.model,
      };

      const response = await this.axiosInstance.post<EmbeddingResponse>(
        '/v1/embeddings',
        requestData,
      );

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('No embeddings returned from server');
      }

      // Sort by index to ensure correct order
      const sortedData = response.data.data.sort((a, b) => a.index - b.index);
      const embeddings = sortedData.map((item) => item.embedding);

      this.logger.log(
        `Batch embeddings generated successfully (${embeddings.length} embeddings)`,
      );

      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate batch embeddings:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new HttpException(
            'Embeddings server is not available',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }

      throw new HttpException(
        'Failed to generate batch embeddings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Prepare text for embedding by combining question components
   */
  prepareQuestionText(
    text: string,
    topic?: string,
    difficulty?: string,
  ): string {
    const parts = [text];

    if (topic) {
      parts.push(`Topic: ${topic}`);
    }

    if (difficulty) {
      parts.push(`Difficulty: ${difficulty}`);
    }

    return parts.join(' | ');
  }

  /**
   * Check if embeddings server is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Embeddings server health check failed');
      return false;
    }
  }
}
