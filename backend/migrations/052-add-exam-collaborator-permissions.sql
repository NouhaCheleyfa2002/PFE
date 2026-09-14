-- Add permissions column to exam_collaborators table
-- Migration 052: Add Permissions for Exam Collaborators (revenue share, etc.)

-- Add permissions column (JSONB for flexibility)
ALTER TABLE exam_collaborators ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"edit": true, "analytics": true, "revenue": 0}'::jsonb;

-- Add comment
COMMENT ON COLUMN exam_collaborators.permissions IS 'Collaborator permissions: {edit: boolean, analytics: boolean, revenue: number}';

-- Create index for querying by permissions
CREATE INDEX IF NOT EXISTS idx_exam_collaborators_permissions ON exam_collaborators USING GIN (permissions);
