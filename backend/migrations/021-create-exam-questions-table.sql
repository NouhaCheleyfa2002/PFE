-- Migration: Create exam_questions table for Question Extraction feature
-- Stores questions extracted from exam documents by AI

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to source document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching'
  
  -- Question metadata
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  points DECIMAL(5,2), -- Points for this question
  page_number INTEGER, -- Which page in the document
  
  -- Multiple choice specific fields
  options JSONB, -- Array of answer options for MCQ
  correct_answer TEXT, -- Correct answer or answer key
  
  -- Additional metadata
  topic VARCHAR(200), -- Topic/concept covered
  bloom_taxonomy VARCHAR(50), -- 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
  
  -- AI extraction metadata
  extraction_confidence DECIMAL(3,2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'edited'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_exam_questions_document_id ON exam_questions(document_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_type ON exam_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_exam_questions_difficulty ON exam_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_questions_status ON exam_questions(status);
CREATE INDEX IF NOT EXISTS idx_exam_questions_topic ON exam_questions(topic);
CREATE INDEX IF NOT EXISTS idx_exam_questions_created_at ON exam_questions(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_exam_questions_doc_status ON exam_questions(document_id, status);

-- Comments
COMMENT ON TABLE exam_questions IS 'Questions extracted from exam documents by AI';
COMMENT ON COLUMN exam_questions.question_type IS 'Type: multiple_choice, true_false, short_answer, essay, fill_blank, matching';
COMMENT ON COLUMN exam_questions.options IS 'JSON array of answer options for multiple choice questions';
COMMENT ON COLUMN exam_questions.extraction_confidence IS 'AI confidence in extraction accuracy (0.00 to 1.00)';
COMMENT ON COLUMN exam_questions.status IS 'Review status: pending, approved, rejected, edited';
