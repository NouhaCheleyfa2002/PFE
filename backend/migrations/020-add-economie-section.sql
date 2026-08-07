-- Migration: Add Économie & Gestion section to Bac structure
-- Economics section with subjects: Economics, Accounting, Management, Statistics, Business Law

DO $$
DECLARE
  third_sec_id INT;
  bac_id INT;
BEGIN
  SELECT id INTO third_sec_id FROM education_levels WHERE code = 'secondary_3';
  SELECT id INTO bac_id FROM education_levels WHERE code = 'bac';

  -- ===== ÉCONOMIE & GESTION =====
  INSERT INTO subject_mappings (education_level_id, subject_code, subject_name, stream) VALUES
  (third_sec_id, 'eco_economics', 'Economics', 'economie'),
  (third_sec_id, 'eco_accounting', 'Accounting', 'economie'),
  (third_sec_id, 'eco_management', 'Management', 'economie'),
  (third_sec_id, 'eco_statistics', 'Statistics', 'economie'),
  (third_sec_id, 'eco_business_law', 'Business Law', 'economie'),
  (third_sec_id, 'eco_math', 'Mathematics', 'economie'),
  (bac_id, 'eco_economics', 'Economics', 'economie'),
  (bac_id, 'eco_accounting', 'Accounting', 'economie'),
  (bac_id, 'eco_management', 'Management', 'economie'),
  (bac_id, 'eco_statistics', 'Statistics', 'economie'),
  (bac_id, 'eco_business_law', 'Business Law', 'economie'),
  (bac_id, 'eco_math', 'Mathematics', 'economie')
  ON CONFLICT DO NOTHING;

END $$;
