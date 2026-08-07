-- Migration: Add AI Moderation System
-- Created: 2026-07-25

-- Add moderation columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS auto_metadata_filled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT,
ADD COLUMN IF NOT EXISTS ai_generated_objectives JSONB DEFAULT '[]';

-- Create document_moderation table
CREATE TABLE IF NOT EXISTS document_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, changes_requested
  
  -- AI Analysis Scores (0-100)
  ai_safety_score INTEGER CHECK (ai_safety_score >= 0 AND ai_safety_score <= 100),
  ai_quality_score INTEGER CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100),
  ai_educational_score INTEGER CHECK (ai_educational_score >= 0 AND ai_educational_score <= 100),
  
  -- Detected Metadata
  ai_category VARCHAR(100),
  ai_difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
  ai_detected_subject VARCHAR(100),
  ai_detected_grade_level VARCHAR(50),
  ai_detected_language VARCHAR(10),
  
  -- Risk Flags
  has_inappropriate_content BOOLEAN DEFAULT FALSE,
  has_pii BOOLEAN DEFAULT FALSE,
  has_malware BOOLEAN DEFAULT FALSE,
  has_copyright_risk BOOLEAN DEFAULT FALSE,
  has_promotional_content BOOLEAN DEFAULT FALSE,
  has_external_links BOOLEAN DEFAULT FALSE,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES documents(id),
  duplicate_similarity_score NUMERIC(5,2), -- 0.00 to 100.00
  
  -- Detected Issues (JSON array)
  detected_issues JSONB DEFAULT '[]',
  /*
  Example:
  [
    {
      "type": "pii",
      "severity": "high",
      "description": "Student names detected",
      "location": "page 3",
      "details": ["John Doe", "Jane Smith"]
    },
    {
      "type": "quality",
      "severity": "medium",
      "description": "Low OCR quality",
      "pages": [5, 7, 9]
    }
  ]
  */
  
  -- AI Recommendations (JSON object)
  ai_recommendations JSONB DEFAULT '{}',
  /*
  Example:
  {
    "action": "approve",
    "confidence": 0.98,
    "reasoning": "High quality educational content with no safety concerns",
    "suggested_changes": []
  }
  */
  
  -- Quality Metrics (0-100)
  ocr_quality_score INTEGER,
  language_quality_score INTEGER,
  completeness_score INTEGER,
  formatting_score INTEGER,
  
  -- Overall Risk Assessment
  overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_level VARCHAR(20), -- low, medium, high, critical
  
  -- Admin Actions
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  admin_notes TEXT,
  changes_requested TEXT,
  
  -- Processing Info
  virus_scan_status VARCHAR(50), -- pending, clean, infected, error
  virus_scan_result JSONB,
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  processing_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create extracted_questions table (auto-populate question bank)
CREATE TABLE IF NOT EXISTS extracted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Question Content
  question_text TEXT NOT NULL,
  question_type VARCHAR(50), -- mcq, true_false, open, fill_blank, match, image
  options JSONB, -- for MCQ: ["A) option1", "B) option2", ...]
  correct_answer TEXT,
  explanation TEXT,
  image_url TEXT, -- if question contains image
  
  -- Metadata
  difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
  subject VARCHAR(100),
  topic VARCHAR(100),
  grade_level VARCHAR(50),
  page_number INTEGER,
  question_number INTEGER, -- Question 1, 2, 3... in the document
  
  -- AI Confidence
  extraction_confidence NUMERIC(4,3), -- 0.000 to 1.000
  ai_notes TEXT,
  
  -- Status & Approval
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, needs_review
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Question Bank Integration
  question_bank_id UUID REFERENCES questions(id),
  added_to_bank_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create moderation_history table (audit trail)
CREATE TABLE IF NOT EXISTS moderation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  action VARCHAR(50) NOT NULL, -- created, approved, rejected, changes_requested, resubmitted
  performed_by UUID REFERENCES users(id),
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_mod_document_id ON document_moderation(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_mod_status ON document_moderation(status);
CREATE INDEX IF NOT EXISTS idx_doc_mod_risk_level ON document_moderation(risk_level);
CREATE INDEX IF NOT EXISTS idx_doc_mod_overall_score ON document_moderation(overall_risk_score);
CREATE INDEX IF NOT EXISTS idx_doc_mod_reviewed_by ON document_moderation(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_extracted_q_document_id ON extracted_questions(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_q_status ON extracted_questions(status);
CREATE INDEX IF NOT EXISTS idx_extracted_q_subject ON extracted_questions(subject);
CREATE INDEX IF NOT EXISTS idx_extracted_q_question_type ON extracted_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_extracted_q_bank_id ON extracted_questions(question_bank_id);

CREATE INDEX IF NOT EXISTS idx_mod_history_document_id ON moderation_history(document_id);
CREATE INDEX IF NOT EXISTS idx_mod_history_performed_by ON moderation_history(performed_by);

CREATE INDEX IF NOT EXISTS idx_documents_moderation_status ON documents(moderation_status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_moderation_updated_at
  BEFORE UPDATE ON document_moderation
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_updated_at();

CREATE TRIGGER trigger_update_extracted_questions_updated_at
  BEFORE UPDATE ON extracted_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_updated_at();

-- Add comments for documentation
COMMENT ON TABLE document_moderation IS 'AI-powered moderation analysis and admin review for uploaded documents';
COMMENT ON TABLE extracted_questions IS 'Questions automatically extracted from uploaded exams for question bank';
COMMENT ON TABLE moderation_history IS 'Audit trail of all moderation actions performed on documents';

COMMENT ON COLUMN document_moderation.overall_risk_score IS 'Calculated risk score 0-100, higher is safer';
COMMENT ON COLUMN document_moderation.detected_issues IS 'JSON array of all issues found during analysis';
COMMENT ON COLUMN document_moderation.ai_recommendations IS 'JSON object with AI suggested action and reasoning';
COMMENT ON COLUMN extracted_questions.extraction_confidence IS 'AI confidence in question extraction accuracy (0.0-1.0)';
