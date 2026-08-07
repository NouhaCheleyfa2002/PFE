import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../documents/entities/document.entity';
import axios from 'axios';

export interface SimilarDocument {
  documentId: string;
  similarityScore: number;
  title: string;
  subject: string;
  classLevel: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarDocuments: SimilarDocument[];
  highestSimilarity: number;
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);
  private readonly embeddingsServerUrl = 'http://localhost:8000';

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log('Generating embedding vector...');
      
      // Truncate text to avoid exceeding token limits (first 10000 chars)
      const truncatedText = text.substring(0, 10000);

      const response = await axios.post(
        `${this.embeddingsServerUrl}/embed`,
        {
          inputs: truncatedText,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Invalid response from embeddings server');
      }

      const embedding = response.data[0];
      this.logger.log(`Embedding generated successfully (${embedding.length} dimensions)`);
      
      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error.message);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Find similar documents using cosine similarity
   */
  async findSimilarDocuments(
    embedding: number[],
    similarityThreshold: number = 0.85,
    maxResults: number = 10
  ): Promise<SimilarDocument[]> {
    try {
      this.logger.log(`Searching for similar documents (threshold: ${similarityThreshold})`);

      // Convert array to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;

      // Use raw query to call the similarity function
      const result = await this.documentRepository.query(
        `SELECT * FROM find_similar_documents($1::vector, $2, $3)`,
        [vectorString, similarityThreshold, maxResults]
      );

      this.logger.log(`Found ${result.length} similar documents`);

      return result.map((row: any) => ({
        documentId: row.document_id,
        similarityScore: parseFloat(row.similarity_score),
        title: row.title,
        subject: row.subject || 'Unknown',
        classLevel: row.class_level || 'Unknown',
      }));
    } catch (error) {
      this.logger.error('Failed to find similar documents:', error);
      return [];
    }
  }

  /**
   * Check for duplicates and update document
   */
  async checkForDuplicates(
    documentId: string,
    text: string
  ): Promise<DuplicateCheckResult> {
    try {
      this.logger.log(`Checking for duplicates: ${documentId}`);

      // Generate embedding
      const embedding = await this.generateEmbedding(text);

      // Convert array to PostgreSQL vector string format: [1,2,3,...]
      const vectorString = `[${embedding.join(',')}]`;

      // Store embedding in document using raw query
      await this.documentRepository.query(
        'UPDATE documents SET embedding_vector = $1::vector, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        [vectorString, documentId]
      );

      // Find similar documents (>85% similarity = likely duplicate)
      const similarDocuments = await this.findSimilarDocuments(embedding, 0.85, 10);

      // Filter out the document itself
      const filteredSimilar = similarDocuments.filter(
        doc => doc.documentId !== documentId
      );

      const highestSimilarity = filteredSimilar.length > 0
        ? Math.max(...filteredSimilar.map(doc => doc.similarityScore))
        : 0;

      // Consider duplicate if similarity > 95%
      const isDuplicate = highestSimilarity > 0.95;

      this.logger.log(
        `Duplicate check complete: ${isDuplicate ? 'DUPLICATE FOUND' : 'Unique'} (highest similarity: ${(highestSimilarity * 100).toFixed(1)}%)`
      );

      return {
        isDuplicate,
        similarDocuments: filteredSimilar,
        highestSimilarity,
      };
    } catch (error) {
      this.logger.error(`Duplicate check failed for ${documentId}:`, error);
      return {
        isDuplicate: false,
        similarDocuments: [],
        highestSimilarity: 0,
      };
    }
  }

  /**
   * Batch generate embeddings for existing documents without embeddings
   */
  async generateMissingEmbeddings(limit: number = 50): Promise<number> {
    try {
      this.logger.log(`Generating embeddings for documents without vectors (limit: ${limit})`);

      const documents = await this.documentRepository.find({
        where: {
          embeddingVector: null as any, // TypeORM syntax for IS NULL
          verificationStatus: 'approved',
        },
        take: limit,
      });

      let successCount = 0;

      for (const doc of documents) {
        try {
          // Generate embedding from title + description + subject
          const textToEmbed = [
            doc.title,
            doc.description || '',
            doc.subject || '',
            doc.classLevel || '',
          ].filter(Boolean).join(' ');

          const embedding = await this.generateEmbedding(textToEmbed);
          
          // Convert to PostgreSQL vector format
          const vectorString = `[${embedding.join(',')}]`;
          
          await this.documentRepository.query(
            'UPDATE documents SET embedding_vector = $1::vector, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
            [vectorString, doc.id]
          );

          successCount++;
          this.logger.log(`Generated embedding for document ${doc.id} (${successCount}/${documents.length})`);
        } catch (error) {
          this.logger.error(`Failed to generate embedding for document ${doc.id}:`, error.message);
        }
      }

      this.logger.log(`Batch embedding generation complete: ${successCount}/${documents.length} successful`);
      return successCount;
    } catch (error) {
      this.logger.error('Batch embedding generation failed:', error);
      return 0;
    }
  }
}
