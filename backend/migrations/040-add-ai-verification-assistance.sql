-- Migration 040: Add AI-Assisted Teacher Verification
-- Adds AI extraction, duplicate detection, and fraud analysis capabilities

-- Add AI verification fields to verification_requests table
ALTER TABLE verification_requests 
  ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_verification_score DECIMAL(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_risk_level VARCHAR(20) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS ai_flags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duplicate_check_result JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS similarity_matches JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS professional_id VARCHAR(255) DEFAULT NULL;

-- Add index for professional_id lookups (for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_verification_professional_id 
  ON verification_requests(professional_id) 
  WHERE professional_id IS NOT NULL;

-- Add index for AI status filtering
CREATE INDEX IF NOT EXISTS idx_verification_ai_status 
  ON verification_requests(ai_status);

-- Add index for risk level filtering
CREATE INDEX IF NOT EXISTS idx_verification_risk_level 
  ON verification_requests(ai_risk_level);

-- Comments for documentation
COMMENT ON COLUMN verification_requests.ai_extracted_data IS 'OCR + AI extracted information from documents (name, ID, institution, etc.)';
COMMENT ON COLUMN verification_requests.ai_verification_score IS 'AI confidence score (0-100) for verification authenticity';
COMMENT ON COLUMN verification_requests.ai_status IS 'AI analysis status: pending, verified_match, possible_duplicate, suspicious_document, needs_review, processed';
COMMENT ON COLUMN verification_requests.ai_risk_level IS 'Risk assessment: low, medium, high, critical';
COMMENT ON COLUMN verification_requests.ai_flags IS 'Array of detected issues/warnings from AI analysis';
COMMENT ON COLUMN verification_requests.duplicate_check_result IS 'Details of duplicate account detection';
COMMENT ON COLUMN verification_requests.similarity_matches IS 'Array of similar existing verified accounts';
COMMENT ON COLUMN verification_requests.professional_id IS 'Extracted professional/teacher ID from documents';

-- Create AI verification logs table for audit trail
CREATE TABLE IF NOT EXISTS ai_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- 'ocr_extraction', 'duplicate_check', 'fraud_detection', 'similarity_analysis'
  input_data JSONB DEFAULT NULL,
  output_data JSONB DEFAULT NULL,
  confidence_score DECIMAL(5, 2) DEFAULT NULL,
  processing_time_ms INTEGER DEFAULT NULL,
  model_used VARCHAR(100) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'failed', 'partial'
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for logs
CREATE INDEX idx_ai_verification_logs_request 
  ON ai_verification_logs(verification_request_id);

CREATE INDEX idx_ai_verification_logs_type 
  ON ai_verification_logs(analysis_type);

CREATE INDEX idx_ai_verification_logs_created 
  ON ai_verification_logs(created_at DESC);

-- Create verified teacher registry for fast duplicate lookups
CREATE TABLE IF NOT EXISTS verified_teacher_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  teaching_level VARCHAR(50) NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW(),
  verification_request_id UUID REFERENCES verification_requests(id) ON DELETE SET NULL
);

-- Indexes for registry
CREATE INDEX idx_verified_registry_user 
  ON verified_teacher_registry(user_id);

CREATE INDEX idx_verified_registry_professional_id 
  ON verified_teacher_registry(professional_id);

CREATE INDEX idx_verified_registry_name 
  ON verified_teacher_registry(full_name);

CREATE INDEX idx_verified_registry_institution 
  ON verified_teacher_registry(institution);

-- Function to auto-populate verified teacher registry when verification is approved
CREATE OR REPLACE FUNCTION sync_verified_teacher_registry()
RETURNS TRIGGER AS $$
BEGIN
  -- When verification is approved, add to registry
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.professional_id IS NOT NULL THEN
    INSERT INTO verified_teacher_registry (
      user_id,
      professional_id,
      full_name,
      institution,
      teaching_level,
      verified_at,
      verification_request_id
    ) VALUES (
      NEW."userId",
      NEW.professional_id,
      NEW.full_name,
      NEW.institution,
      NEW.teaching_level::VARCHAR,
      NOW(),
      NEW.id
    )
    ON CONFLICT (professional_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_verified_teacher_registry ON verification_requests;
CREATE TRIGGER trigger_sync_verified_teacher_registry
AFTER UPDATE ON verification_requests
FOR EACH ROW
EXECUTE FUNCTION sync_verified_teacher_registry();

-- Add some example AI status values documentation
COMMENT ON TABLE ai_verification_logs IS 'Audit trail for all AI verification analyses';
COMMENT ON TABLE verified_teacher_registry IS 'Fast lookup registry of all verified teachers for duplicate detection';
