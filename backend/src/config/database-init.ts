import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseInit');

/**
 * Initialize pgvector extension in PostgreSQL
 * This should be run once when the application starts
 */
export async function initializePgVector(dataSource: DataSource): Promise<void> {
  try {
    logger.log('Checking pgvector extension...');
    
    // Create pgvector extension if it doesn't exist
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    logger.log('✅ pgvector extension is ready');
  } catch (error) {
    logger.error('Failed to initialize pgvector extension:', error);
    throw error;
  }
}
