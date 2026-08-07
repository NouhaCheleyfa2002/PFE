-- Migration 028: Add soft delete columns to resource_ratings table
-- This allows ratings to be hidden without actually deleting them from the database

ALTER TABLE resource_ratings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

-- Create index on deleted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_resource_ratings_deleted_at ON resource_ratings(deleted_at);

-- Add comment
COMMENT ON COLUMN resource_ratings.deleted_at IS 'Timestamp when the rating was soft deleted';
COMMENT ON COLUMN resource_ratings.deleted_by IS 'Admin user ID who deleted the rating';
COMMENT ON COLUMN resource_ratings.deletion_reason IS 'Reason for deleting the rating';
