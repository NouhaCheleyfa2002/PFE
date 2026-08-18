-- Migration 033: Add element_id to collaboration_comments for anchored comments
-- This allows comments to be tied to specific exam elements (questions, sections)
-- instead of just screen coordinates

-- Add element_id column
ALTER TABLE collaboration_comments 
ADD COLUMN element_id VARCHAR(255);

-- Add element_type column
ALTER TABLE collaboration_comments 
ADD COLUMN element_type VARCHAR(50);

-- Add index for efficient querying
CREATE INDEX idx_comments_element 
ON collaboration_comments(resource_id, element_id);

-- Add index for filtering by type
CREATE INDEX idx_comments_element_type 
ON collaboration_comments(resource_id, element_type);

COMMENT ON COLUMN collaboration_comments.element_id IS 'Stable ID of the exam element (e.g., question-42, header, instructions)';
COMMENT ON COLUMN collaboration_comments.element_type IS 'Type of element (question, section, header, instructions, etc.)';
