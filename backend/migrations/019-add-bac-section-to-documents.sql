-- Migration: Add bac_section column to documents table
-- Stores the student's orientation/section for 3rd Secondary and Bac levels
-- Values: 'svt', 'math', 'technique', 'info', 'lettres', 'sport'

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS bac_section VARCHAR(20) NULL;

COMMENT ON COLUMN documents.bac_section IS 'Student orientation for 3rd Secondary and Bac: svt, math, technique, info, lettres, sport';

-- Index for filtering by bac section
CREATE INDEX IF NOT EXISTS idx_documents_bac_section ON documents(bac_section);
