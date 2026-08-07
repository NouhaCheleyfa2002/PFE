-- Migration: Fix find_similar_documents function type mismatch
-- The function was returning TEXT types but documents table uses VARCHAR
-- This fixes: "Returned type character varying(500) does not match expected type text"

DROP FUNCTION IF EXISTS find_similar_documents(vector, FLOAT, INT);

CREATE OR REPLACE FUNCTION find_similar_documents(
  query_vector vector(384),
  similarity_threshold FLOAT DEFAULT 0.85,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  document_id UUID,
  similarity_score FLOAT,
  title VARCHAR(500),
  subject VARCHAR(100),
  class_level VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS document_id,
    1 - (d.embedding_vector <=> query_vector) AS similarity_score,
    d.title::VARCHAR(500),
    d.subject::VARCHAR(100),
    d.class_level::VARCHAR(50)
  FROM documents d
  WHERE 
    d.embedding_vector IS NOT NULL
    AND d.verification_status = 'approved'
    AND (1 - (d.embedding_vector <=> query_vector)) >= similarity_threshold
  ORDER BY d.embedding_vector <=> query_vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_similar_documents IS 'Find documents similar to query vector using cosine similarity - returns VARCHAR types matching documents table schema';
