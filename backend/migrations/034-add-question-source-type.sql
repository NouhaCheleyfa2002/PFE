-- Migration: Add source_type to distinguish AI-generated vs manually created questions

-- Add source_type column to exam_questions
ALTER TABLE exam_questions 
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'ai_extracted';

-- Update comment
COMMENT ON COLUMN exam_questions.source_type IS 'Source: ai_extracted (from documents), ai_generated (AI variations/improvements), ai_improved (improved by AI), manual (teacher created), imported (from external source)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_exam_questions_source_type ON exam_questions(source_type);

-- Update existing questions based on whether they have a documentId
-- Questions with documentId are from extraction, others are unknown (set to ai_extracted for now)
UPDATE exam_questions 
SET source_type = CASE 
  WHEN document_id IS NOT NULL THEN 'ai_extracted'
  ELSE 'ai_extracted'  -- Default to ai_extracted for existing questions
END
WHERE source_type IS NULL OR source_type = 'ai_extracted';

-- Add composite index for common queries (user + source_type)
CREATE INDEX IF NOT EXISTS idx_exam_questions_source_status 
  ON exam_questions(source_type, status, deleted_at);
