-- Migration 035: Add Exam Publishing Support
-- Description: Extends exams table to support publishing AI-generated exams to marketplace
-- Date: 2026-08-26

-- ============================================================
-- 1. EXTEND EXAMS TABLE WITH PUBLISHING METADATA
-- ============================================================

-- Add publishing-related columns to exams table
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS bac_section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS keywords TEXT[],
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS license VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS views INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0;

-- Create indexes for exams
CREATE INDEX IF NOT EXISTS idx_exams_published ON exams(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_exams_verification_status ON exams(verification_status);
CREATE INDEX IF NOT EXISTS idx_exams_source_type ON exams(source_type);
CREATE INDEX IF NOT EXISTS idx_exams_class_level ON exams("classLevel");
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_license ON exams(license);
CREATE INDEX IF NOT EXISTS idx_exams_keywords ON exams USING GIN(keywords);

-- Composite index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_exams_marketplace 
  ON exams(verification_status, is_published, "classLevel", subject) 
  WHERE is_published = TRUE AND verification_status = 'approved';

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_exam_license'
  ) THEN
    ALTER TABLE exams 
    ADD CONSTRAINT chk_exam_license 
    CHECK (license IN ('free', 'paid'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_exam_price_when_paid'
  ) THEN
    ALTER TABLE exams 
    ADD CONSTRAINT chk_exam_price_when_paid 
    CHECK ((license = 'paid' AND price IS NOT NULL AND price > 0) OR (license = 'free'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_exam_source_type'
  ) THEN
    ALTER TABLE exams 
    ADD CONSTRAINT chk_exam_source_type 
    CHECK (source_type IN ('manual', 'ai_generated'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_exam_verification_status'
  ) THEN
    ALTER TABLE exams 
    ADD CONSTRAINT chk_exam_verification_status 
    CHECK (verification_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ============================================================
-- 2. UPDATE STATUS ENUM TO INCLUDE PUBLISHED
-- ============================================================

-- Update existing exams with default values
UPDATE exams 
SET source_type = 'manual'
WHERE source_type IS NULL;

UPDATE exams 
SET verification_status = 'pending'
WHERE verification_status IS NULL;

UPDATE exams 
SET license = 'free'
WHERE license IS NULL;

UPDATE exams 
SET is_published = FALSE
WHERE is_published IS NULL;

-- ============================================================
-- 3. CREATE EXAM PURCHASES TABLE (FOR PAID EXAMS)
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  purchased_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_exam_purchase UNIQUE(exam_id, user_id)
);

-- Create indexes for exam_purchases
CREATE INDEX IF NOT EXISTS idx_exam_purchases_exam ON exam_purchases(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_purchases_user ON exam_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_purchases_date ON exam_purchases(purchased_at DESC);

-- ============================================================
-- 4. VERIFICATION
-- ============================================================

DO $$
DECLARE
  exams_updated INT;
BEGIN
  SELECT COUNT(*) INTO exams_updated FROM exams WHERE source_type IS NOT NULL;
  
  RAISE NOTICE 'Migration 035 completed successfully:';
  RAISE NOTICE '  - Exams updated with publishing metadata: %', exams_updated;
  RAISE NOTICE '  - exam_purchases table created';
  RAISE NOTICE '  - Publishing indexes created';
END $$;
