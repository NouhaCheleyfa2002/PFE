-- Migration 003: Add Content Verification Fields
-- Date: 2026-06-09

-- Add verification fields to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON documents(verification_status);

-- Update existing documents to 'approved' status (backward compatibility)
UPDATE documents 
SET verification_status = 'approved', 
    is_verified = true 
WHERE status = 'completed' 
  AND verification_status = 'pending';

-- Add verification fields to verification_requests table (if missing)
ALTER TABLE verification_requests
ADD COLUMN IF NOT EXISTS verification_video_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(50);

COMMIT;
