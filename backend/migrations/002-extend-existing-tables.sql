-- Migration 002: Extend Existing Tables
-- Description: Adds new columns to support enhanced features
-- Date: 2026-06-06

-- ============================================================
-- 1. EXTEND USERS TABLE
-- ============================================================

-- Add verification fields
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Update existing users to have correct verification_status based on verified field
UPDATE users 
SET verification_status = CASE 
  WHEN verified = TRUE THEN 'verified'
  ELSE 'unverified'
END
WHERE verification_status = 'unverified';

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);

-- Add check constraint for verification_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_verification_status'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT chk_verification_status 
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

-- ============================================================
-- 2. EXTEND DOCUMENTS TABLE
-- ============================================================

-- Add new columns
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'course',
  ADD COLUMN IF NOT EXISTS class_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS keywords TEXT[],
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS license VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_resource_type ON documents(resource_type);
CREATE INDEX IF NOT EXISTS idx_documents_class_level ON documents(class_level);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_documents_license ON documents(license);
CREATE INDEX IF NOT EXISTS idx_documents_verified ON documents(is_verified);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_resource_level_subject 
  ON documents(resource_type, class_level, subject) 
  WHERE status = 'completed';

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_resource_type'
  ) THEN
    ALTER TABLE documents 
    ADD CONSTRAINT chk_resource_type 
    CHECK (resource_type IN ('course', 'exam'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_license'
  ) THEN
    ALTER TABLE documents 
    ADD CONSTRAINT chk_license 
    CHECK (license IN ('free', 'paid', 'open_access'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_price_when_paid'
  ) THEN
    ALTER TABLE documents 
    ADD CONSTRAINT chk_price_when_paid 
    CHECK ((license = 'paid' AND price IS NOT NULL AND price > 0) OR (license != 'paid'));
  END IF;
END $$;

-- ============================================================
-- 3. EXTEND EXAM_QUESTIONS TABLE
-- ============================================================

-- Add new columns
ALTER TABLE exam_questions 
  ADD COLUMN IF NOT EXISTS class_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(50);

-- Create indexes for exam_questions
CREATE INDEX IF NOT EXISTS idx_exam_questions_class_level ON exam_questions(class_level);
CREATE INDEX IF NOT EXISTS idx_exam_questions_type ON exam_questions(question_type);

-- Add check constraint for question_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_question_type'
  ) THEN
    ALTER TABLE exam_questions 
    ADD CONSTRAINT chk_question_type 
    CHECK (question_type IN ('qcm', 'true_false', 'fill_blank', 'essay', 'case_study', 'short_answer'));
  END IF;
END $$;

-- ============================================================
-- 4. CREATE VERIFICATION_REQUESTS TABLE
-- ============================================================

CREATE TYPE verification_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status verification_request_status DEFAULT 'pending',
  
  -- Submitted documents
  id_document_url VARCHAR(500),
  institution_name VARCHAR(255) NOT NULL,
  institution_type VARCHAR(100) NOT NULL,
  proof_type VARCHAR(100) NOT NULL,
  additional_info TEXT,
  
  -- Admin review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_reviewed_by ON verification_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_verification_requests_created ON verification_requests(created_at DESC);

-- Add check constraints for verification_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_institution_type'
  ) THEN
    ALTER TABLE verification_requests 
    ADD CONSTRAINT chk_institution_type 
    CHECK (institution_type IN ('university', 'school', 'institute', 'training_center'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_proof_type'
  ) THEN
    ALTER TABLE verification_requests 
    ADD CONSTRAINT chk_proof_type 
    CHECK (proof_type IN ('teacher_id', 'student_id', 'diploma', 'certificate', 'employment_letter'));
  END IF;
END $$;

-- ============================================================
-- 5. CREATE EXAM_TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  class_level VARCHAR(50) NOT NULL,
  subject_code VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  difficulty VARCHAR(20),
  question_count INT DEFAULT 0,
  template_data JSONB,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for exam_templates
CREATE INDEX IF NOT EXISTS idx_exam_templates_user ON exam_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_templates_class_level ON exam_templates(class_level);
CREATE INDEX IF NOT EXISTS idx_exam_templates_subject ON exam_templates(subject_code);
CREATE INDEX IF NOT EXISTS idx_exam_templates_difficulty ON exam_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_templates_published ON exam_templates(is_published);
CREATE INDEX IF NOT EXISTS idx_exam_templates_created ON exam_templates(created_at DESC);

-- Add check constraint for difficulty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_difficulty'
  ) THEN
    ALTER TABLE exam_templates 
    ADD CONSTRAINT chk_difficulty 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- ============================================================
-- 6. UPDATE EXISTING DATA (BACKWARD COMPATIBILITY)
-- ============================================================

-- Set default resource_type for existing documents
UPDATE documents 
SET resource_type = 'course'
WHERE resource_type IS NULL;

-- Copy verified status from users to their documents
UPDATE documents d
SET is_verified = u.verified
FROM users u
WHERE d."userId" = u.id AND d.is_verified IS NULL;

-- Set default license for existing documents
UPDATE documents
SET license = 'free'
WHERE license IS NULL;

-- ============================================================
-- 7. VERIFICATION
-- ============================================================

DO $$
DECLARE
  documents_updated INT;
  users_updated INT;
BEGIN
  SELECT COUNT(*) INTO documents_updated FROM documents WHERE resource_type IS NOT NULL;
  SELECT COUNT(*) INTO users_updated FROM users WHERE verification_status IS NOT NULL;
  
  RAISE NOTICE 'Migration 002 completed successfully:';
  RAISE NOTICE '  - Documents extended: %', documents_updated;
  RAISE NOTICE '  - Users extended: %', users_updated;
  RAISE NOTICE '  - New tables created: verification_requests, exam_templates';
END $$;

