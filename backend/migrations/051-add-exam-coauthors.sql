-- Add co-authors field to exams table
-- Migration 051: Add Co-Authors Support for Collaborative Exams

-- Add co_authors column for storing collaborators who helped create the exam
ALTER TABLE exams ADD COLUMN IF NOT EXISTS co_authors JSONB;

-- Add comment
COMMENT ON COLUMN exams.co_authors IS 'Array of co-authors (collaborators) who helped create this exam: [{ userId, fullName, role }]';

-- Create index for querying exams by co-author
CREATE INDEX IF NOT EXISTS idx_exams_co_authors ON exams USING GIN (co_authors);

