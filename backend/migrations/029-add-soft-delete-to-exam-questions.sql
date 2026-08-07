-- Add soft delete to exam questions
-- This allows questions to be marked as deleted without permanently removing them

ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Create index for efficient queries that exclude deleted questions
CREATE INDEX IF NOT EXISTS idx_exam_questions_deleted_at ON exam_questions(deleted_at);

-- Add comment
COMMENT ON COLUMN exam_questions.deleted_at IS 'Timestamp when the question was soft deleted, NULL if not deleted';
