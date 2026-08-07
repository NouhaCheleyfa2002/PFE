-- Migration: Add layout settings to exam templates
-- Date: 2026-08-02
-- Description: Adds layoutSettings JSONB column to store advanced typography and alignment settings

-- Add layout_settings column
ALTER TABLE exam_templates
ADD COLUMN layout_settings JSONB DEFAULT '{
  "institutionNameSize": 18,
  "institutionNameAlign": "center",
  "addressSize": 12,
  "addressAlign": "center",
  "contactSize": 10,
  "contactAlign": "center",
  "academicYearSize": 12,
  "academicYearAlign": "center",
  "headerSpacing": 8,
  "lineHeight": 1.4,
  "showInstitutionName": true,
  "showAddress": true,
  "showContact": true,
  "showAcademicYear": true
}'::jsonb;

-- Update default template with layout settings
UPDATE exam_templates
SET layout_settings = '{
  "institutionNameSize": 18,
  "institutionNameAlign": "center",
  "addressSize": 12,
  "addressAlign": "center",
  "contactSize": 10,
  "contactAlign": "center",
  "academicYearSize": 12,
  "academicYearAlign": "center",
  "headerSpacing": 8,
  "lineHeight": 1.4,
  "showInstitutionName": true,
  "showAddress": true,
  "showContact": true,
  "showAcademicYear": true
}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';
