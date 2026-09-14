-- Migration 049: Fix exam_question_set foreign key for manually created exams
-- Problem: Manually created exams have inline questions (q-0, q-1) that don't exist in exam_questions table
-- Solution: Make question_id nullable and drop the foreign key constraint

-- Drop the foreign key constraint
ALTER TABLE exam_question_set 
DROP CONSTRAINT IF EXISTS exam_question_set_question_id_fkey;

-- Make question_id nullable (for manually created exams)
ALTER TABLE exam_question_set 
ALTER COLUMN question_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN exam_question_set.question_id IS 'Optional reference to exam_questions table. NULL for manually created exams with inline questions.';

-- Keep the index for performance (even though FK is dropped)
-- Index already exists: idx_exam_question_set_question
