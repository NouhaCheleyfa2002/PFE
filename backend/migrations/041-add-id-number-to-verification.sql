-- Migration 041: Add ID Number to Verification Requests
-- This adds a column to store the user-provided national ID or passport number
-- for duplicate detection purposes

-- Add id_number column
ALTER TABLE verification_requests
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);

-- Create index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_verification_requests_id_number 
ON verification_requests(id_number) 
WHERE id_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN verification_requests.id_number IS 'National ID or passport number provided by user during verification';
