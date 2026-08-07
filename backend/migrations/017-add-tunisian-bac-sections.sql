-- Migration: Add Tunisian Baccalaureate Sections (3rd Secondary Year)
-- Created: 2026-07-27
-- Description: Add proper Tunisian Bac sections/orientations for 3rd year secondary

-- The Tunisian education system has 6 main Baccalaureate sections:
-- 1. Sciences Expérimentales (SVT) - Experimental Sciences / Life & Earth Sciences
-- 2. Mathématiques (Math) - Mathematics
-- 3. Technique (Tech) - Technical Sciences
-- 4. Sciences Informatiques (Info) - Computer Science
-- 5. Lettres - Letters/Humanities
-- 6. Sport - Sports

-- Add specific subjects for each Bac section

-- ============================================================
-- 1. BAC SCIENCES EXPERIMENTALES (SVT)
-- ============================================================

-- Get the 3rd Secondary level ID
DO $$
DECLARE
  third_secondary_id INT;
BEGIN
  SELECT id INTO third_secondary_id FROM education_levels WHERE code = 'secondary_3';

  -- Sciences Expérimentales subjects
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'svt_biology', 'Sciences de la Vie et de la Terre - Biology', 'svt'),
  (third_secondary_id, 'svt_geology', 'Sciences de la Vie et de la Terre - Geology', 'svt'),
  (third_secondary_id, 'svt_physics', 'Physics', 'svt'),
  (third_secondary_id, 'svt_chemistry', 'Chemistry', 'svt'),
  (third_secondary_id, 'svt_math', 'Mathematics', 'svt')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- 2. BAC MATHEMATIQUES
  -- ============================================================
  
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'math_main', 'Mathematics (Main)', 'math'),
  (third_secondary_id, 'math_physics', 'Physics', 'math'),
  (third_secondary_id, 'math_sciences', 'Sciences', 'math'),
  (third_secondary_id, 'math_computer', 'Computer Science', 'math')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- 3. BAC TECHNIQUE (Technical Sciences)
  -- ============================================================
  
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'tech_electrique', 'Electrical Engineering', 'technique'),
  (third_secondary_id, 'tech_mecanique', 'Mechanical Engineering', 'technique'),
  (third_secondary_id, 'tech_civil', 'Civil Engineering', 'technique'),
  (third_secondary_id, 'tech_drawing', 'Technical Drawing', 'technique'),
  (third_secondary_id, 'tech_math', 'Mathematics', 'technique'),
  (third_secondary_id, 'tech_physics', 'Physics', 'technique')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- 4. BAC SCIENCES INFORMATIQUES
  -- ============================================================
  
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'info_programming', 'Programming', 'info'),
  (third_secondary_id, 'info_algorithms', 'Algorithms & Data Structures', 'info'),
  (third_secondary_id, 'info_databases', 'Databases', 'info'),
  (third_secondary_id, 'info_networks', 'Computer Networks', 'info'),
  (third_secondary_id, 'info_math', 'Mathematics', 'info'),
  (third_secondary_id, 'info_physics', 'Physics', 'info')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- 5. BAC LETTRES (Letters/Humanities)
  -- ============================================================
  
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'lettres_philosophy', 'Philosophy', 'lettres'),
  (third_secondary_id, 'lettres_arabic', 'Arabic Literature', 'lettres'),
  (third_secondary_id, 'lettres_french', 'French Literature', 'lettres'),
  (third_secondary_id, 'lettres_history', 'History', 'lettres'),
  (third_secondary_id, 'lettres_geography', 'Geography', 'lettres'),
  (third_secondary_id, 'lettres_english', 'English', 'lettres')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- 6. BAC SPORT
  -- ============================================================
  
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'sport_theory', 'Sports Theory', 'sport'),
  (third_secondary_id, 'sport_practice', 'Sports Practice', 'sport'),
  (third_secondary_id, 'sport_biology', 'Biology & Physiology', 'sport'),
  (third_secondary_id, 'sport_math', 'Mathematics', 'sport')
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  -- ============================================================
  -- COMMON SUBJECTS (All Bac sections)
  -- ============================================================
  
  -- These subjects are common across all Bac sections
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_secondary_id, 'common_arabic', 'Arabic Language', NULL),
  (third_secondary_id, 'common_french', 'French Language', NULL),
  (third_secondary_id, 'common_english', 'English Language', NULL),
  (third_secondary_id, 'common_islamic', 'Islamic Education', NULL),
  (third_secondary_id, 'common_sport', 'Physical Education', NULL),
  (third_secondary_id, 'common_philosophy', 'Philosophy (General)', NULL)
  ON CONFLICT (education_level_id, subject_code) DO NOTHING;

  RAISE NOTICE 'Tunisian Bac sections added successfully for 3rd Secondary';
END $$;

-- Add stream descriptions for reference
COMMENT ON TABLE subject_mappings IS 'Subject mappings for education levels with Tunisian Bac sections: svt, math, technique, info, lettres, sport';

-- Create index for faster stream filtering
CREATE INDEX IF NOT EXISTS idx_subject_mappings_stream_level 
ON subject_mappings(education_level_id, stream) 
WHERE stream IS NOT NULL;

-- Display final count
DO $$
DECLARE
  svt_count INT;
  math_count INT;
  tech_count INT;
  info_count INT;
  lettres_count INT;
  sport_count INT;
BEGIN
  SELECT COUNT(*) INTO svt_count FROM subject_mappings WHERE stream = 'svt';
  SELECT COUNT(*) INTO math_count FROM subject_mappings WHERE stream = 'math';
  SELECT COUNT(*) INTO tech_count FROM subject_mappings WHERE stream = 'technique';
  SELECT COUNT(*) INTO info_count FROM subject_mappings WHERE stream = 'info';
  SELECT COUNT(*) INTO lettres_count FROM subject_mappings WHERE stream = 'lettres';
  SELECT COUNT(*) INTO sport_count FROM subject_mappings WHERE stream = 'sport';
  
  RAISE NOTICE 'Bac Section Subject Counts:';
  RAISE NOTICE '  - SVT (Sciences Expérimentales): % subjects', svt_count;
  RAISE NOTICE '  - Math (Mathématiques): % subjects', math_count;
  RAISE NOTICE '  - Technique: % subjects', tech_count;
  RAISE NOTICE '  - Info (Sciences Informatiques): % subjects', info_count;
  RAISE NOTICE '  - Lettres: % subjects', lettres_count;
  RAISE NOTICE '  - Sport: % subjects', sport_count;
END $$;
