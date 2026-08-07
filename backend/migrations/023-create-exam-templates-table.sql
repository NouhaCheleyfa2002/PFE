-- Migration 023: Create exam_templates table
-- Description: Create table for storing exam templates with institutional branding
-- Feature: Exam Template Builder
-- Date: 2025-01-XX

-- ============================================================
-- CREATE EXAM_TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Institutional metadata
  institution_name VARCHAR(255),
  institution_address TEXT,
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  academic_year VARCHAR(50),
  logo_url TEXT,
  
  -- Template configuration
  logo_position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 0, "height": 0}',
  footer_text TEXT,
  watermark_text TEXT,
  watermark_opacity INTEGER DEFAULT 30 CHECK (watermark_opacity >= 0 AND watermark_opacity <= 100),
  page_margins JSONB NOT NULL DEFAULT '{"top": 20, "bottom": 20, "left": 20, "right": 20}',
  page_orientation VARCHAR(20) DEFAULT 'portrait' CHECK (page_orientation IN ('portrait', 'landscape')),
  font_family VARCHAR(100) DEFAULT 'Times New Roman',
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  
  -- Placeholders configuration
  placeholders JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_default BOOLEAN DEFAULT FALSE,
  header_document_url TEXT,
  
  -- Constraints
  CONSTRAINT unique_user_template_name UNIQUE(user_id, name)
);

-- ============================================================
-- CREATE INDEXES
-- ============================================================

-- Index for retrieving templates by user
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON exam_templates(user_id);

-- Index for sorting templates by creation date
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON exam_templates(created_at DESC);

-- Index for finding default templates efficiently
CREATE INDEX IF NOT EXISTS idx_templates_is_default ON exam_templates(is_default) WHERE is_default = TRUE;

-- Composite index for common queries (user templates sorted by update time)
CREATE INDEX IF NOT EXISTS idx_templates_user_updated ON exam_templates(user_id, updated_at DESC);

-- ============================================================
-- ADD COMMENTS
-- ============================================================

COMMENT ON TABLE exam_templates IS 'Stores exam templates with institutional branding and configuration';
COMMENT ON COLUMN exam_templates.name IS 'Template name (3-100 characters, unique per user)';
COMMENT ON COLUMN exam_templates.user_id IS 'ID of the teacher who created the template';
COMMENT ON COLUMN exam_templates.logo_position IS 'JSON object with x, y, width, height for logo positioning';
COMMENT ON COLUMN exam_templates.page_margins IS 'JSON object with top, bottom, left, right margins in mm';
COMMENT ON COLUMN exam_templates.placeholders IS 'JSON array of placeholder configurations with position and styling';
COMMENT ON COLUMN exam_templates.watermark_opacity IS 'Watermark opacity percentage (0-100)';
COMMENT ON COLUMN exam_templates.page_orientation IS 'Page orientation: portrait or landscape';
COMMENT ON COLUMN exam_templates.is_default IS 'Indicates if this is the system default template';
COMMENT ON COLUMN exam_templates.header_document_url IS 'URL of the original header document uploaded by user';

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 023 completed successfully: exam_templates table created';
END $$;
