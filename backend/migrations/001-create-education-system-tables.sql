-- Migration 001: Create Education System Tables
-- Description: Adds support for Tunisian education system (14 levels)
-- Date: 2026-06-06

-- ============================================================
-- 1. CREATE ENUMS
-- ============================================================

CREATE TYPE education_stage AS ENUM ('primary', 'basic', 'secondary', 'baccalaureate');

-- ============================================================
-- 2. CREATE EDUCATION LEVELS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS education_levels (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  stage education_stage NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_order_index UNIQUE(order_index)
);

-- Create indexes for education_levels
CREATE INDEX IF NOT EXISTS idx_education_levels_stage ON education_levels(stage);
CREATE INDEX IF NOT EXISTS idx_education_levels_order ON education_levels(order_index);
CREATE INDEX IF NOT EXISTS idx_education_levels_code ON education_levels(code);

-- ============================================================
-- 3. SEED EDUCATION LEVELS DATA
-- ============================================================

INSERT INTO education_levels (code, display_name, stage, order_index) VALUES
  -- Primary Education (6 levels)
  ('primary_1', '1st Primary Year', 'primary', 1),
  ('primary_2', '2nd Primary Year', 'primary', 2),
  ('primary_3', '3rd Primary Year', 'primary', 3),
  ('primary_4', '4th Primary Year', 'primary', 4),
  ('primary_5', '5th Primary Year', 'primary', 5),
  ('primary_6', '6th Primary Year', 'primary', 6),
  
  -- Basic Education (3 levels)
  ('basic_7', '7th Basic Education', 'basic', 7),
  ('basic_8', '8th Basic Education', 'basic', 8),
  ('basic_9', '9th Basic Education', 'basic', 9),
  
  -- Secondary Education (3 levels)
  ('secondary_1', '1st Secondary', 'secondary', 10),
  ('secondary_2', '2nd Secondary', 'secondary', 11),
  ('secondary_3', '3rd Secondary', 'secondary', 12),
  
  -- Baccalaureate (1 level)
  ('bac', 'Bac', 'baccalaureate', 13)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. CREATE SUBJECT MAPPINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS subject_mappings (
  id SERIAL PRIMARY KEY,
  education_level_id INT NOT NULL REFERENCES education_levels(id) ON DELETE CASCADE,
  subject_code VARCHAR(50) NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  stream VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_level_subject UNIQUE(education_level_id, subject_code)
);

-- Create indexes for subject_mappings
CREATE INDEX IF NOT EXISTS idx_subject_mappings_level ON subject_mappings(education_level_id);
CREATE INDEX IF NOT EXISTS idx_subject_mappings_stream ON subject_mappings(stream);
CREATE INDEX IF NOT EXISTS idx_subject_mappings_code ON subject_mappings(subject_code);
CREATE INDEX IF NOT EXISTS idx_subject_mappings_active ON subject_mappings(is_active);

-- ============================================================
-- 5. SEED SUBJECT MAPPINGS DATA
-- ============================================================

-- Primary Education Subjects (Available for levels 1-6)
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arabic', 'Arabic', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'french', 'French', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'english', 'English', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'math', 'Mathematics', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'sciences', 'Sciences', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'history_geography', 'History & Geography', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'islamic_education', 'Islamic Education', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'civic_education', 'Civic Education', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arts_crafts', 'Arts & Crafts', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'physical_education', 'Physical Education', NULL
FROM education_levels el WHERE el.stage = 'primary'
ON CONFLICT DO NOTHING;

-- Basic Education Subjects (Includes all primary subjects + additional)
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arabic', 'Arabic', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'french', 'French', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'english', 'English', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'math', 'Mathematics', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'physics_chemistry', 'Physics & Chemistry', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'life_earth_sciences', 'Life & Earth Sciences', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'history_geography', 'History & Geography', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'islamic_education', 'Islamic Education', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'civic_education', 'Civic Education', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'technology', 'Technology', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'computer_science', 'Computer Science', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arts', 'Arts', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'physical_education', 'Physical Education', NULL
FROM education_levels el WHERE el.stage = 'basic'
ON CONFLICT DO NOTHING;

-- Economics for 9th Basic only
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'economics_management', 'Economics & Management', NULL
FROM education_levels el WHERE el.code = 'basic_9'
ON CONFLICT DO NOTHING;

-- Secondary Education - Sciences Stream
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'math', 'Mathematics', 'sciences'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'physics', 'Physics', 'sciences'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'chemistry', 'Chemistry', 'sciences'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'biology', 'Biology', 'sciences'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'earth_sciences', 'Earth Sciences', 'sciences'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- Secondary Education - Economics Stream
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'economics', 'Economics', 'economics'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'management', 'Management', 'economics'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'accounting', 'Accounting', 'economics'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'statistics', 'Statistics', 'economics'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'math', 'Mathematics', 'economics'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- Secondary Education - Letters Stream
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'philosophy', 'Philosophy', 'letters'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arabic_literature', 'Arabic Literature', 'letters'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'french_literature', 'French Literature', 'letters'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'history', 'History', 'letters'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'geography', 'Geography', 'letters'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- Secondary Education - Technical Stream
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'technical_drawing', 'Technical Drawing', 'technical'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'electrical_engineering', 'Electrical Engineering', 'technical'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'mechanical_engineering', 'Mechanical Engineering', 'technical'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'civil_engineering', 'Civil Engineering', 'technical'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- Secondary Education - Computer Science Stream
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'programming', 'Programming', 'computer_science'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'algorithms', 'Algorithms', 'computer_science'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'databases', 'Databases', 'computer_science'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'networks', 'Networks', 'computer_science'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'math', 'Mathematics', 'computer_science'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- Common subjects for all secondary/bac streams
INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'arabic', 'Arabic', NULL
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'french', 'French', NULL
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'english', 'English', NULL
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'islamic_education', 'Islamic Education', NULL
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream)
SELECT el.id, 'physical_education', 'Physical Education', NULL
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. CREATE TYPE MAPPINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS type_mappings (
  id SERIAL PRIMARY KEY,
  education_level_id INT NOT NULL REFERENCES education_levels(id) ON DELETE CASCADE,
  type_code VARCHAR(50) NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_level_type UNIQUE(education_level_id, type_code)
);

-- Create indexes for type_mappings
CREATE INDEX IF NOT EXISTS idx_type_mappings_level ON type_mappings(education_level_id);
CREATE INDEX IF NOT EXISTS idx_type_mappings_code ON type_mappings(type_code);
CREATE INDEX IF NOT EXISTS idx_type_mappings_active ON type_mappings(is_active);

-- ============================================================
-- 7. SEED TYPE MAPPINGS DATA
-- ============================================================

-- Primary/Basic Education Types
INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'course_notes', 'Course Notes'
FROM education_levels el WHERE el.stage IN ('primary', 'basic')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'exercises', 'Exercises'
FROM education_levels el WHERE el.stage IN ('primary', 'basic')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'worksheets', 'Worksheets'
FROM education_levels el WHERE el.stage IN ('primary', 'basic')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'activities', 'Activities'
FROM education_levels el WHERE el.stage IN ('primary', 'basic')
ON CONFLICT DO NOTHING;

-- Secondary/Baccalaureate Types
INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'course_notes', 'Course Notes'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'qcm', 'QCM'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'exercises', 'Exercises'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'exam', 'Exam'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'case_study', 'Case Study'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

INSERT INTO type_mappings (education_level_id, type_code, type_name)
SELECT el.id, 'presentation', 'Presentation'
FROM education_levels el WHERE el.stage IN ('secondary', 'baccalaureate')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. VERIFICATION
-- ============================================================

-- Verify counts
DO $$
DECLARE
  level_count INT;
  subject_count INT;
  type_count INT;
BEGIN
  SELECT COUNT(*) INTO level_count FROM education_levels;
  SELECT COUNT(*) INTO subject_count FROM subject_mappings;
  SELECT COUNT(*) INTO type_count FROM type_mappings;
  
  RAISE NOTICE 'Migration 001 completed successfully:';
  RAISE NOTICE '  - Education Levels: %', level_count;
  RAISE NOTICE '  - Subject Mappings: %', subject_count;
  RAISE NOTICE '  - Type Mappings: %', type_count;
END $$;

