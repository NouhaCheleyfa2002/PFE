-- Migration: Create exam submissions table
-- Purpose: Track student exam attempts, answers, and scores

CREATE TABLE IF NOT EXISTS exam_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "examId" UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  "maxScore" INTEGER,
  percentage DECIMAL(5,2),
  "timeSpent" INTEGER,
  status VARCHAR(20) DEFAULT 'submitted',
  started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_exam_submissions_exam ON exam_submissions("examId");
CREATE INDEX idx_exam_submissions_student ON exam_submissions("studentId");
CREATE INDEX idx_exam_submissions_status ON exam_submissions(status);
CREATE INDEX idx_exam_submissions_created ON exam_submissions(created_at DESC);

-- Composite index for student's exam history
CREATE INDEX idx_exam_submissions_student_exam ON exam_submissions("studentId", "examId", created_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_exam_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_submission_timestamp
BEFORE UPDATE ON exam_submissions
FOR EACH ROW
EXECUTE FUNCTION update_exam_submission_updated_at();
