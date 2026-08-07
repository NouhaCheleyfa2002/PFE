-- Fix trigger to use correct column name (userId instead of user_id)

DROP TRIGGER IF EXISTS trigger_update_teacher_reputation ON resource_ratings;
DROP FUNCTION IF EXISTS update_teacher_reputation();

-- Recreate function with correct column name
CREATE OR REPLACE FUNCTION update_teacher_reputation()
RETURNS TRIGGER AS $$
DECLARE
  teacher_id_var UUID;
BEGIN
  -- Get the teacher_id from the resource (using correct column name)
  SELECT "userId" INTO teacher_id_var
  FROM documents
  WHERE id = NEW.resource_id;
  
  -- Update teacher statistics
  UPDATE users
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rr.overall_rating), 0)
      FROM resource_ratings rr
      JOIN documents d ON d.id = rr.resource_id
      WHERE d."userId" = teacher_id_var
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM resource_ratings rr
      JOIN documents d ON d.id = rr.resource_id
      WHERE d."userId" = teacher_id_var
    ),
    total_resources = (
      SELECT COUNT(*)
      FROM documents
      WHERE "userId" = teacher_id_var
    ),
    total_downloads = (
      SELECT SUM(downloads)
      FROM documents
      WHERE "userId" = teacher_id_var
    )
  WHERE id = teacher_id_var;
  
  -- Calculate reputation score (weighted)
  UPDATE users
  SET reputation_score = (
    COALESCE(average_rating, 0) * 40 / 5 + -- 40% weight (max 40 points)
    LEAST(total_downloads, 1000) * 25 / 1000 + -- 25% weight (max 25 points)
    LEAST(followers, 500) * 15 / 500 + -- 15% weight (max 15 points)
    LEAST(total_ratings, 200) * 10 / 200 + -- 10% weight (max 10 points)
    CASE WHEN verified THEN 10 ELSE 0 END -- 10% weight (10 points for verified)
  )
  WHERE id = teacher_id_var;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_teacher_reputation
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_teacher_reputation();
