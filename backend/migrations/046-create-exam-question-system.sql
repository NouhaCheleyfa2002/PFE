-- Migration 046: Create Exam Question System for Student Practice
-- This establishes the relationship between published exams and their questions

-- 1. Create exam_question_set table
-- This links published exams to specific questions from the question bank
CREATE TABLE IF NOT EXISTS exam_question_set (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  
  -- Question snapshot at publish time (prevents changes to question bank from affecting published exams)
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  question_data JSONB NOT NULL, -- options, correct_answer, blanks, etc.
  
  -- Exam-specific metadata
  order_index INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique order within each exam
  CONSTRAINT unique_exam_question_order UNIQUE (exam_id, order_index)
);

CREATE INDEX idx_exam_question_set_exam ON exam_question_set(exam_id);
CREATE INDEX idx_exam_question_set_question ON exam_question_set(question_id);
CREATE INDEX idx_exam_question_set_order ON exam_question_set(exam_id, order_index);

-- 2. Create exam_attempts table
-- Tracks student attempts at taking interactive exams
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Attempt metadata
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'abandoned'
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,
  
  -- Scoring
  total_questions INTEGER NOT NULL,
  answered_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score DECIMAL(5, 2), -- Percentage or points
  max_score INTEGER,
  
  -- Timing
  time_spent_seconds INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX idx_exam_attempts_student_exam ON exam_attempts(student_id, exam_id);

-- 3. Create exam_answers table
-- Stores student answers for each question in an attempt
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  exam_question_id UUID NOT NULL REFERENCES exam_question_set(id) ON DELETE CASCADE,
  
  -- Answer data
  answer_data JSONB NOT NULL, -- Structure depends on question type
  is_correct BOOLEAN,
  points_earned DECIMAL(5, 2),
  
  -- Timing
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Each question can only be answered once per attempt
  CONSTRAINT unique_attempt_question UNIQUE (attempt_id, exam_question_id)
);

CREATE INDEX idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX idx_exam_answers_question ON exam_answers(exam_question_id);
CREATE INDEX idx_exam_answers_correct ON exam_answers(is_correct);

-- 4. Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_exam_question_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exam_question_set_updated_at
BEFORE UPDATE ON exam_question_set
FOR EACH ROW
EXECUTE FUNCTION update_exam_question_set_updated_at();

CREATE OR REPLACE FUNCTION update_exam_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exam_attempts_updated_at
BEFORE UPDATE ON exam_attempts
FOR EACH ROW
EXECUTE FUNCTION update_exam_attempts_updated_at();

CREATE OR REPLACE FUNCTION update_exam_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exam_answers_updated_at
BEFORE UPDATE ON exam_answers
FOR EACH ROW
EXECUTE FUNCTION update_exam_answers_updated_at();

-- 5. Add helper function to calculate attempt statistics
CREATE OR REPLACE FUNCTION calculate_attempt_stats(attempt_uuid UUID)
RETURNS void AS $$
DECLARE
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_correct_answers INTEGER;
  v_total_points DECIMAL(5, 2);
  v_max_score INTEGER;
BEGIN
  -- Get attempt's exam total questions
  SELECT COUNT(*) INTO v_total_questions
  FROM exam_question_set eqs
  INNER JOIN exam_attempts ea ON ea.exam_id = eqs.exam_id
  WHERE ea.id = attempt_uuid;
  
  -- Count answered questions
  SELECT COUNT(*) INTO v_answered_questions
  FROM exam_answers
  WHERE attempt_id = attempt_uuid;
  
  -- Count correct answers
  SELECT COUNT(*) INTO v_correct_answers
  FROM exam_answers
  WHERE attempt_id = attempt_uuid AND is_correct = true;
  
  -- Calculate total points earned
  SELECT COALESCE(SUM(points_earned), 0) INTO v_total_points
  FROM exam_answers
  WHERE attempt_id = attempt_uuid;
  
  -- Get max possible score
  SELECT COALESCE(SUM(points), 0) INTO v_max_score
  FROM exam_question_set eqs
  INNER JOIN exam_attempts ea ON ea.exam_id = eqs.exam_id
  WHERE ea.id = attempt_uuid;
  
  -- Update attempt
  UPDATE exam_attempts
  SET 
    total_questions = v_total_questions,
    answered_questions = v_answered_questions,
    correct_answers = v_correct_answers,
    score = v_total_points,
    max_score = v_max_score
  WHERE id = attempt_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE exam_question_set IS 'Links published exams to their question set (snapshot from question bank)';
COMMENT ON TABLE exam_attempts IS 'Tracks student attempts at taking interactive exams';
COMMENT ON TABLE exam_answers IS 'Stores student answers for each question in an attempt';
