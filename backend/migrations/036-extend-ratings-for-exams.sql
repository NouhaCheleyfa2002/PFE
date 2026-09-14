-- Migration 036: Extend Rating System for AI-Generated Exams
-- This extends the existing rating system to support both documents and exams

-- Add resource_type column to distinguish between documents and exams
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'document' CHECK (resource_type IN ('document', 'exam'));

-- Add resource_type column to downloads tracking
ALTER TABLE resource_downloads ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'document' CHECK (resource_type IN ('document', 'exam'));

-- Add resource_type column to bookmarks
ALTER TABLE resource_bookmarks ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'document' CHECK (resource_type IN ('document', 'exam'));

-- Update existing records to be 'document' type (already default, but explicit is better)
UPDATE resource_ratings SET resource_type = 'document' WHERE resource_type IS NULL;
UPDATE resource_downloads SET resource_type = 'document' WHERE resource_type IS NULL;
UPDATE resource_bookmarks SET resource_type = 'document' WHERE resource_type IS NULL;

-- Update unique constraint on resource_ratings to include resource_type
ALTER TABLE resource_ratings DROP CONSTRAINT IF EXISTS resource_ratings_resource_id_teacher_id_key;
ALTER TABLE resource_ratings ADD CONSTRAINT resource_ratings_unique_per_type UNIQUE(resource_id, teacher_id, resource_type);

-- Update unique constraint on resource_downloads to include resource_type
ALTER TABLE resource_downloads DROP CONSTRAINT IF EXISTS resource_downloads_resource_id_user_id_key;
ALTER TABLE resource_downloads ADD CONSTRAINT resource_downloads_unique_per_type UNIQUE(resource_id, user_id, resource_type);

-- Update unique constraint on resource_bookmarks to include resource_type
ALTER TABLE resource_bookmarks DROP CONSTRAINT IF EXISTS resource_bookmarks_resource_id_user_id_key;
ALTER TABLE resource_bookmarks ADD CONSTRAINT resource_bookmarks_unique_per_type UNIQUE(resource_id, user_id, resource_type);

-- Add indexes for performance with resource_type
CREATE INDEX IF NOT EXISTS idx_resource_ratings_type ON resource_ratings(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_type ON resource_downloads(resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_type ON resource_bookmarks(resource_type);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource_type ON resource_ratings(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource_type ON resource_downloads(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_resource_type ON resource_bookmarks(resource_id, resource_type);

COMMENT ON COLUMN resource_ratings.resource_type IS 'Type of resource: document or exam';
COMMENT ON COLUMN resource_downloads.resource_type IS 'Type of resource: document or exam';
COMMENT ON COLUMN resource_bookmarks.resource_type IS 'Type of resource: document or exam';
