-- Migration 048: Add PDF and DOCX file URLs to exams table
-- This allows exams to store generated document files for download

-- Add pdf_url column for generated PDF files
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add docx_url column for generated Word documents
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS docx_url TEXT;

-- Add comments
COMMENT ON COLUMN exams.pdf_url IS 'URL to generated PDF version of the exam';
COMMENT ON COLUMN exams.docx_url IS 'URL to generated DOCX version of the exam';
