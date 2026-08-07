-- Migration: Add bookmarks table
-- Description: Allow users to bookmark resources from the library

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_bookmark_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmark_document FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Unique constraint: user can only bookmark a document once
  CONSTRAINT unique_user_document_bookmark UNIQUE ("userId", "documentId")
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks("userId");
CREATE INDEX IF NOT EXISTS idx_bookmarks_document ON bookmarks("documentId");
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks("createdAt" DESC);

-- Add bookmark_count column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0;

-- Create trigger to update bookmark count
CREATE OR REPLACE FUNCTION update_document_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE documents 
    SET bookmark_count = bookmark_count + 1 
    WHERE id = NEW."documentId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE documents 
    SET bookmark_count = GREATEST(bookmark_count - 1, 0)
    WHERE id = OLD."documentId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bookmark_count
AFTER INSERT OR DELETE ON bookmarks
FOR EACH ROW
EXECUTE FUNCTION update_document_bookmark_count();
