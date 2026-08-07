-- Migration: Add Phase 4 Advanced AI Features
-- Created: 2026-07-27
-- Description: Add PII detection, difficulty scoring, and learning objectives columns

-- Add Phase 4 AI analysis columns to document_moderation table
ALTER TABLE document_moderation 
ADD COLUMN IF NOT EXISTS pii_score INTEGER CHECK (pii_score >= 0 AND pii_score <= 100),
ADD COLUMN IF NOT EXISTS pii_details JSONB DEFAULT '[]',
/*
Example pii_details:
[
  {
    "type": "email|phone|name|id|address",
    "value": "partially redacted value",
    "location": "page 3",
    "confidence": 0.95
  }
]
*/

ADD COLUMN IF NOT EXISTS difficulty_score INTEGER CHECK (difficulty_score >= 1 AND difficulty_score <= 10),
ADD COLUMN IF NOT EXISTS difficulty_reasoning TEXT,
/*
difficulty_score: 1-10 scale (1=very easy, 10=very difficult)
difficulty_level: beginner|intermediate|advanced (already exists)
difficulty_reasoning: AI explanation of why this difficulty was assigned
*/

ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS bloom_taxonomy_level VARCHAR(50);
/*
Example learning_objectives:
[
  "Students will be able to solve linear equations",
  "Students will understand the concept of slope",
  "Students will apply the quadratic formula"
]

bloom_taxonomy_level: remember|understand|apply|analyze|evaluate|create
*/

-- Create index for PII-flagged documents
CREATE INDEX IF NOT EXISTS idx_doc_mod_has_pii ON document_moderation(has_pii) WHERE has_pii = TRUE;

-- Create index for difficulty queries
CREATE INDEX IF NOT EXISTS idx_doc_mod_difficulty_score ON document_moderation(difficulty_score);

-- Add comments
COMMENT ON COLUMN document_moderation.pii_score IS 'PII safety score 0-100, higher means less PII found';
COMMENT ON COLUMN document_moderation.pii_details IS 'JSON array of detected PII items with type, location, confidence';
COMMENT ON COLUMN document_moderation.difficulty_score IS 'Content difficulty on 1-10 scale (1=very easy, 10=very difficult)';
COMMENT ON COLUMN document_moderation.difficulty_reasoning IS 'AI explanation of difficulty assessment';
COMMENT ON COLUMN document_moderation.learning_objectives IS 'JSON array of AI-generated learning objectives';
COMMENT ON COLUMN document_moderation.bloom_taxonomy_level IS 'Highest Bloom taxonomy level in content';
