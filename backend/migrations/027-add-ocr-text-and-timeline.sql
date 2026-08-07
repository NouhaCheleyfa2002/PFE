-- Add OCR text storage and timeline tracking to document moderation
-- Migration 027

-- Add column for storing extracted OCR text
ALTER TABLE document_moderation 
ADD COLUMN IF NOT EXISTS ocr_extracted_text TEXT,
ADD COLUMN IF NOT EXISTS ocr_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata_extraction_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ai_analysis_completed_at TIMESTAMP;

-- Add index for faster text searches
CREATE INDEX IF NOT EXISTS idx_document_moderation_ocr_completed 
ON document_moderation(ocr_completed_at);

-- Add comment
COMMENT ON COLUMN document_moderation.ocr_extracted_text IS 'Full text extracted from document via OCR';
COMMENT ON COLUMN document_moderation.ocr_completed_at IS 'Timestamp when OCR processing completed';
COMMENT ON COLUMN document_moderation.metadata_extraction_completed_at IS 'Timestamp when metadata extraction completed';
COMMENT ON COLUMN document_moderation.ai_analysis_completed_at IS 'Timestamp when AI analysis completed';
