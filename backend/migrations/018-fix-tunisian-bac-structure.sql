-- Migration: Fix Tunisian Education Structure
-- After 2nd Secondary, students choose orientation for 3rd Secondary and Bac
-- 6 sections: SVT, Math, Technique, Info, Lettres, Sport
-- Plus optional subjects: Language, Music, Arts

DO $$
DECLARE
  third_sec_id INT;
  bac_id INT;
BEGIN
  SELECT id INTO third_sec_id FROM education_levels WHERE code = 'secondary_3';
  SELECT id INTO bac_id FROM education_levels WHERE code = 'bac';

  -- ===== SVT (Sciences Expérimentales) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'svt_biology', 'Biology', 'svt'),
  (third_sec_id, 'svt_geology', 'Geology', 'svt'),
  (third_sec_id, 'svt_physics', 'Physics', 'svt'),
  (third_sec_id, 'svt_chemistry', 'Chemistry', 'svt'),
  (third_sec_id, 'svt_math', 'Mathematics', 'svt'),
  (bac_id, 'svt_biology', 'Biology', 'svt'),
  (bac_id, 'svt_geology', 'Geology', 'svt'),
  (bac_id, 'svt_physics', 'Physics', 'svt'),
  (bac_id, 'svt_chemistry', 'Chemistry', 'svt'),
  (bac_id, 'svt_math', 'Mathematics', 'svt')
  ON CONFLICT DO NOTHING;

  -- ===== MATH (Mathématiques) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'math_main', 'Mathematics', 'math'),
  (third_sec_id, 'math_physics', 'Physics', 'math'),
  (third_sec_id, 'math_sciences', 'Sciences', 'math'),
  (bac_id, 'math_main', 'Mathematics', 'math'),
  (bac_id, 'math_physics', 'Physics', 'math'),
  (bac_id, 'math_sciences', 'Sciences', 'math')
  ON CONFLICT DO NOTHING;

  -- ===== TECHNIQUE (Technical) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'tech_mechanical', 'Mechanical Engineering', 'technique'),
  (third_sec_id, 'tech_electrical', 'Electrical Engineering', 'technique'),
  (third_sec_id, 'tech_civil', 'Civil Engineering', 'technique'),
  (third_sec_id, 'tech_math', 'Mathematics', 'technique'),
  (bac_id, 'tech_mechanical', 'Mechanical Engineering', 'technique'),
  (bac_id, 'tech_electrical', 'Electrical Engineering', 'technique'),
  (bac_id, 'tech_civil', 'Civil Engineering', 'technique'),
  (bac_id, 'tech_math', 'Mathematics', 'technique')
  ON CONFLICT DO NOTHING;

  -- ===== INFO (Sciences Informatiques) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'info_programming', 'Programming', 'info'),
  (third_sec_id, 'info_algorithms', 'Algorithms', 'info'),
  (third_sec_id, 'info_databases', 'Databases', 'info'),
  (third_sec_id, 'info_math', 'Mathematics', 'info'),
  (bac_id, 'info_programming', 'Programming', 'info'),
  (bac_id, 'info_algorithms', 'Algorithms', 'info'),
  (bac_id, 'info_databases', 'Databases', 'info'),
  (bac_id, 'info_math', 'Mathematics', 'info')
  ON CONFLICT DO NOTHING;

  -- ===== LETTRES (Letters/Humanities) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'lettres_philosophy', 'Philosophy', 'lettres'),
  (third_sec_id, 'lettres_arabic_lit', 'Arabic Literature', 'lettres'),
  (third_sec_id, 'lettres_french_lit', 'French Literature', 'lettres'),
  (third_sec_id, 'lettres_history', 'History', 'lettres'),
  (third_sec_id, 'lettres_geography', 'Geography', 'lettres'),
  (bac_id, 'lettres_philosophy', 'Philosophy', 'lettres'),
  (bac_id, 'lettres_arabic_lit', 'Arabic Literature', 'lettres'),
  (bac_id, 'lettres_french_lit', 'French Literature', 'lettres'),
  (bac_id, 'lettres_history', 'History', 'lettres'),
  (bac_id, 'lettres_geography', 'Geography', 'lettres')
  ON CONFLICT DO NOTHING;

  -- ===== SPORT =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'sport_theory', 'Sports Theory', 'sport'),
  (third_sec_id, 'sport_practice', 'Sports Practice', 'sport'),
  (third_sec_id, 'sport_biology', 'Biology', 'sport'),
  (bac_id, 'sport_theory', 'Sports Theory', 'sport'),
  (bac_id, 'sport_practice', 'Sports Practice', 'sport'),
  (bac_id, 'sport_biology', 'Biology', 'sport')
  ON CONFLICT DO NOTHING;

  -- ===== COMMON SUBJECTS (All sections) =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'arabic', 'Arabic', NULL),
  (third_sec_id, 'french', 'French', NULL),
  (third_sec_id, 'english', 'English', NULL),
  (third_sec_id, 'islamic_ed', 'Islamic Education', NULL),
  (third_sec_id, 'philosophy', 'Philosophy', NULL),
  (bac_id, 'arabic', 'Arabic', NULL),
  (bac_id, 'french', 'French', NULL),
  (bac_id, 'english', 'English', NULL),
  (bac_id, 'islamic_ed', 'Islamic Education', NULL),
  (bac_id, 'philosophy', 'Philosophy', NULL)
  ON CONFLICT DO NOTHING;

  -- ===== OPTIONAL SUBJECTS =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'opt_german', 'German (Optional)', 'optional'),
  (third_sec_id, 'opt_italian', 'Italian (Optional)', 'optional'),
  (third_sec_id, 'opt_spanish', 'Spanish (Optional)', 'optional'),
  (third_sec_id, 'opt_music', 'Music (Optional)', 'optional'),
  (third_sec_id, 'opt_arts', 'Arts (Optional)', 'optional'),
  (bac_id, 'opt_german', 'German (Optional)', 'optional'),
  (bac_id, 'opt_italian', 'Italian (Optional)', 'optional'),
  (bac_id, 'opt_spanish', 'Spanish (Optional)', 'optional'),
  (bac_id, 'opt_music', 'Music (Optional)', 'optional'),
  (bac_id, 'opt_arts', 'Arts (Optional)', 'optional')
  ON CONFLICT DO NOTHING;

END $$;
