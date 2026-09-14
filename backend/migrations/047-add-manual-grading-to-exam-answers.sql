-- Migration: Add manual grading fields to exam_answers
-- Date: 2026-09-01
-- Purpose: Support manual grading for essay/open-ended questions

-- Add manual grading columns to exam_answers table
ALTER TABLE exam_answers 
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS graded_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;

-- Add comment to explain graded_by field
COMMENT ON COLUMN exam_answers.graded_by IS 'Indicates who graded the answer: "auto" for automatic grading, "teacher" for manual grading';

-- Create index for querying answers pending manual grading
CREATE INDEX IF NOT EXISTS idx_exam_answers_manual_grading 
ON exam_answers(is_correct) 
WHERE is_correct IS NULL;
