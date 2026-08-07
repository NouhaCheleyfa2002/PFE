-- Migration: Add verification-related columns to users table
-- These columns track the user's verification status and timeline

-- Add verification status column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "verificationStatus" VARCHAR(20) DEFAULT 'unverified';

-- Add verification timestamps
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "verificationRequestedAt" TIMESTAMP;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "verificationCompletedAt" TIMESTAMP;

-- Update existing users to have unverified status
UPDATE users 
SET "verificationStatus" = 'unverified' 
WHERE "verificationStatus" IS NULL;
