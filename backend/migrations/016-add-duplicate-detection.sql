-- Migration: Add Duplicate Detection with Embeddings
-- Created: 2026-07-27
-- Description: Add pgvector extension and embedding columns for duplicate detection

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding vector column to documents table
-- Using 384 dimensions for BAAI/bge-m3 model (actual output)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS embedding_vector vector(384);

-- Create index for fast similarity search using HNSW (Hierarchical Navigable Small World)
-- This index enables efficient nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_documents_embedding_vector_hnsw 
ON documents USING hnsw (embedding_vector vector_cosine_ops);

-- Create GIN index for faster filtering combined with vector search
CREATE INDEX IF NOT EXISTS idx_documents_embedding_not_null 
ON documents(id) WHERE embedding_vector IS NOT NULL;

-- Add embedding-related columns to document_moderation
ALTER TABLE document_moderation
ADD COLUMN IF NOT EXISTS embedding_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS similarity_check_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_check_date TIMESTAMP;

-- Create function to find similar documents
CREATE OR REPLACE FUNCTION find_similar_documents(
  query_vector vector(384),
  similarity_threshold FLOAT DEFAULT 0.85,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  document_id UUID,
  similarity_score FLOAT,
  title TEXT,
  subject TEXT,
  class_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS document_id,
    1 - (d.embedding_vector <=> query_vector) AS similarity_score,
    d.title,
    d.subject,
    d.class_level
  FROM documents d
  WHERE 
    d.embedding_vector IS NOT NULL
    AND d.verification_status = 'approved'
    AND (1 - (d.embedding_vector <=> query_vector)) >= similarity_threshold
  ORDER BY d.embedding_vector <=> query_vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN documents.embedding_vector IS 'Vector embedding for duplicate detection and similarity search (384 dimensions)';
COMMENT ON COLUMN document_moderation.embedding_generated IS 'Whether embedding has been generated for this document';
COMMENT ON COLUMN document_moderation.similarity_check_completed IS 'Whether duplicate check has been performed';
COMMENT ON FUNCTION find_similar_documents IS 'Find documents similar to query vector using cosine similarity';
