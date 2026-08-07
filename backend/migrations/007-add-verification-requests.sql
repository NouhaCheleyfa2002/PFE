-- Migration: Add verification_requests table
-- This table stores educator verification requests with documents and status

CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  
  -- Teacher Information
  "fullName" VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  "teachingLevel" VARCHAR(50) NOT NULL CHECK ("teachingLevel" IN ('primary', 'secondary', 'university', 'private_tutor')),
  subjects TEXT[] NOT NULL,
  
  -- Supporting Documents (URLs from SeaweedFS)
  "documentUrls" TEXT[] NOT NULL,
  
  -- Identity Verification
  "verificationVideoUrl" VARCHAR(500),
  "verificationCode" VARCHAR(50),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_needed')),
  
  -- Admin Review
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMP,
  "reviewNotes" TEXT,
  "rejectionReason" TEXT,
  
  -- Timestamps
  "submittedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign Keys
  CONSTRAINT "FK_verification_requests_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_verification_requests_reviewer" FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS "IDX_verification_requests_userId" ON verification_requests("userId");
CREATE INDEX IF NOT EXISTS "IDX_verification_requests_status" ON verification_requests(status);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_verification_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_requests_updated_at();
