-- Migration 053: Make exam_attempts.exam_id foreign key constraint optional
-- This allows exam attempts for both AI-generated exams AND document-based exams (uploaded PDFs)

-- Drop the foreign key constraint
ALTER TABLE exam_attempts 
DROP CONSTRAINT IF EXISTS exam_attempts_exam_id_fkey;

-- The exam_id column remains, but without the foreign key constraint
-- This allows it to reference either exams.id OR documents.id
