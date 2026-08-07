-- Add views and downloads columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS views INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0;

-- Create index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_documents_views ON documents(views DESC);
CREATE INDEX IF NOT EXISTS idx_documents_downloads ON documents(downloads DESC);

-- Update existing documents to have 0 views and downloads
UPDATE documents SET views = 0 WHERE views IS NULL;
UPDATE documents SET downloads = 0 WHERE downloads IS NULL;
