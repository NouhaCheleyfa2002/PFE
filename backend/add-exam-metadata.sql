-- Migration: Add Exam Metadata Fields to Documents Table
-- This adds title, level, subject, and year fields to support exam-level metadata

-- Add new columns
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS title VARCHAR(500),
  ADD COLUMN IF NOT EXISTS level VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100),
  ADD COLUMN IF NOT EXISTS year INTEGER;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_documents_level ON documents(level);
CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents(subject);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(year);

-- Add comment for documentation
COMMENT ON COLUMN documents.title IS 'Exam title extracted from document (e.g., "Bac Informatique Algorithmique 2024")';
COMMENT ON COLUMN documents.level IS 'Educational level (e.g., "Bac Info", "2ème Économie", "Licence 1")';
COMMENT ON COLUMN documents.subject IS 'Subject/course name (e.g., "Algorithmique", "Mathématiques")';
COMMENT ON COLUMN documents.year IS 'Exam year (e.g., 2024, 2023)';

-- Display results
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name IN ('title', 'level', 'subject', 'year')
ORDER BY ordinal_position;

\echo 'Migration complete! Exam metadata fields added to documents table.'
