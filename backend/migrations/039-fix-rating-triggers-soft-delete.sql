-- Migration 039: Fix rating triggers to exclude soft-deleted ratings
-- This ensures that average_rating and total_ratings columns in documents table
-- only count non-deleted ratings

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_document_rating ON resource_ratings;
DROP TRIGGER IF EXISTS trigger_update_teacher_reputation ON resource_ratings;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_document_rating();
DROP FUNCTION IF EXISTS update_teacher_reputation();

-- Recreate function to update document rating (with deletedAt filter)
CREATE OR REPLACE FUNCTION update_document_rating()
RETURNS TRIGGER AS $$
DECLARE
  resource_id_var UUID;
BEGIN
  -- Get the resource_id (works for INSERT, UPDATE, DELETE)
  IF TG_OP = 'DELETE' THEN
    resource_id_var := OLD.resource_id;
  ELSE
    resource_id_var := NEW.resource_id;
  END IF;

  -- Update documents table with ratings excluding soft-deleted entries
  UPDATE documents
  SET 
    average_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM resource_ratings
      WHERE resource_id = resource_id_var
        AND resource_type = 'document'
        AND deleted_at IS NULL
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM resource_ratings
      WHERE resource_id = resource_id_var
        AND resource_type = 'document'
        AND deleted_at IS NULL
    )
  WHERE id = resource_id_var;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for document ratings
CREATE TRIGGER trigger_update_document_rating
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_document_rating();

-- Recreate function to update teacher reputation (with deletedAt filter)
CREATE OR REPLACE FUNCTION update_teacher_reputation()
RETURNS TRIGGER AS $$
DECLARE
  teacher_id_var UUID;
  resource_id_var UUID;
BEGIN
  -- Get the resource_id (works for INSERT, UPDATE, DELETE)
  IF TG_OP = 'DELETE' THEN
    resource_id_var := OLD.resource_id;
  ELSE
    resource_id_var := NEW.resource_id;
  END IF;

  -- Get the teacher_id from the resource (try documents first)
  SELECT "userId" INTO teacher_id_var
  FROM documents
  WHERE id = resource_id_var;
  
  -- If not found in documents, check if it's an exam
  IF teacher_id_var IS NULL THEN
    SELECT owner_id INTO teacher_id_var
    FROM exams
    WHERE id = resource_id_var;
  END IF;
  
  -- Update teacher stats if we found the teacher
  IF teacher_id_var IS NOT NULL THEN
    UPDATE users
    SET 
      average_rating = (
        SELECT COALESCE(AVG(rr.overall_rating), 0)
        FROM resource_ratings rr
        INNER JOIN documents d ON d.id = rr.resource_id AND rr.resource_type = 'document'
        WHERE d."userId" = teacher_id_var
          AND rr.deleted_at IS NULL
      ),
      total_ratings = (
        SELECT COUNT(*)
        FROM resource_ratings rr
        INNER JOIN documents d ON d.id = rr.resource_id AND rr.resource_type = 'document'
        WHERE d."userId" = teacher_id_var
          AND rr.deleted_at IS NULL
      ),
      total_downloads = (
        SELECT COUNT(*)
        FROM resource_downloads rd
        INNER JOIN documents d ON d.id = rd.resource_id AND rd.resource_type = 'document'
        WHERE d."userId" = teacher_id_var
      )
    WHERE id = teacher_id_var;
    
    -- Update reputation score based on new stats
    UPDATE users
    SET reputation_score = (
      COALESCE(average_rating, 0) * 40 / 5 + -- 40% weight (max 40 points)
      COALESCE(total_ratings, 0) * 20 / 100 + -- 20% weight (max 20 points, capped at 100 ratings)
      LEAST(total_downloads, 1000) * 25 / 1000 + -- 25% weight (max 25 points)
      LEAST(followers, 500) * 15 / 500 + -- 15% weight (max 15 points)
      (CASE WHEN verified THEN 10 ELSE 0 END) -- Verified badge gives extra 10 points
    )
    WHERE id = teacher_id_var;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for teacher reputation
CREATE TRIGGER trigger_update_teacher_reputation
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_teacher_reputation();

-- Recalculate all existing ratings to fix any stale data
UPDATE documents
SET 
  average_rating = (
    SELECT COALESCE(AVG(overall_rating), 0)
    FROM resource_ratings
    WHERE resource_id = documents.id
      AND resource_type = 'document'
      AND deleted_at IS NULL
  ),
  total_ratings = (
    SELECT COUNT(*)
    FROM resource_ratings
    WHERE resource_id = documents.id
      AND resource_type = 'document'
      AND deleted_at IS NULL
  );

-- Recalculate teacher reputations
UPDATE users
SET 
  average_rating = (
    SELECT COALESCE(AVG(rr.overall_rating), 0)
    FROM resource_ratings rr
    INNER JOIN documents d ON d.id = rr.resource_id AND rr.resource_type = 'document'
    WHERE d."userId" = users.id
      AND rr.deleted_at IS NULL
  ),
  total_ratings = (
    SELECT COUNT(*)
    FROM resource_ratings rr
    INNER JOIN documents d ON d.id = rr.resource_id AND rr.resource_type = 'document'
    WHERE d."userId" = users.id
      AND rr.deleted_at IS NULL
  );

UPDATE users
SET reputation_score = (
  COALESCE(average_rating, 0) * 40 / 5 +
  COALESCE(total_ratings, 0) * 20 / 100 +
  LEAST(total_downloads, 1000) * 25 / 1000 +
  LEAST(followers, 500) * 15 / 500 +
  (CASE WHEN verified THEN 10 ELSE 0 END)
);
