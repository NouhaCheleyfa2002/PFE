-- Migration 024: Create Default System Template
-- This creates a default template that all users can access

INSERT INTO exam_templates (
  id,
  name,
  user_id,
  institution_name,
  institution_address,
  contact_phone,
  contact_email,
  academic_year,
  logo_url,
  logo_position,
  page_margins,
  page_orientation,
  footer_text,
  watermark_text,
  watermark_opacity,
  font_family,
  primary_color,
  secondary_color,
  placeholders,
  is_default,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Exam Template',
  NULL,
  'Educational Institution',
  '',
  '',
  '',
  '2024-2025',
  NULL,
  '{"x": 10, "y": 10, "width": 30, "height": 20}'::jsonb,
  '{"top": 20, "bottom": 20, "left": 15, "right": 15}'::jsonb,
  'portrait',
  'Page {pageNumber} of {totalPages}',
  '',
  0,
  'Arial',
  '#0d1b3e',
  '#63b3ed',
  '[]'::jsonb,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create index for quick default template lookup
CREATE INDEX IF NOT EXISTS idx_templates_is_default ON exam_templates(is_default) WHERE is_default = true;
