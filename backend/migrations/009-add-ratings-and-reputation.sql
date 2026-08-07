-- Ratings and Reputation System Migration

-- Resource Ratings Table
CREATE TABLE IF NOT EXISTS resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  usability_rating INTEGER CHECK (usability_rating >= 1 AND usability_rating <= 5),
  would_recommend BOOLEAN,
  review TEXT,
  tags TEXT[], -- Array of quick tags like 'well-structured', 'creative', etc.
  helpful_votes INTEGER DEFAULT 0,
  not_helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource_id, teacher_id) -- One rating per teacher per resource
);

CREATE INDEX idx_resource_ratings_resource_id ON resource_ratings(resource_id);
CREATE INDEX idx_resource_ratings_teacher_id ON resource_ratings(teacher_id);
CREATE INDEX idx_resource_ratings_created_at ON resource_ratings(created_at DESC);

-- Rating Helpful Votes Table (to track who voted)
CREATE TABLE IF NOT EXISTS rating_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES resource_ratings(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rating_id, voter_id) -- One vote per user per rating
);

CREATE INDEX idx_rating_votes_rating_id ON rating_votes(rating_id);

-- Add rating columns to documents table
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookmarks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Add reputation columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS reputation_score DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_downloads INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_resources INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges TEXT[]; -- Array of badge names

-- Teacher Follows Table
CREATE TABLE IF NOT EXISTS teacher_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id) -- Can't follow yourself
);

CREATE INDEX idx_teacher_follows_follower ON teacher_follows(follower_id);
CREATE INDEX idx_teacher_follows_following ON teacher_follows(following_id);

-- Resource Bookmarks Table
CREATE TABLE IF NOT EXISTS resource_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

CREATE INDEX idx_resource_bookmarks_resource ON resource_bookmarks(resource_id);
CREATE INDEX idx_resource_bookmarks_user ON resource_bookmarks(user_id);

-- Resource Downloads Tracking Table
CREATE TABLE IF NOT EXISTS resource_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resource_downloads_resource ON resource_downloads(resource_id);
CREATE INDEX idx_resource_downloads_user ON resource_downloads(user_id);
CREATE INDEX idx_resource_downloads_date ON resource_downloads(downloaded_at DESC);

-- Function to update document rating
CREATE OR REPLACE FUNCTION update_document_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE documents
  SET 
    average_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM resource_ratings
      WHERE resource_id = NEW.resource_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM resource_ratings
      WHERE resource_id = NEW.resource_id
    )
  WHERE id = NEW.resource_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_rating
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_document_rating();

-- Function to update teacher reputation
CREATE OR REPLACE FUNCTION update_teacher_reputation()
RETURNS TRIGGER AS $$
DECLARE
  teacher_id_var UUID;
BEGIN
  -- Get the teacher_id from the resource
  SELECT user_id INTO teacher_id_var
  FROM documents
  WHERE id = NEW.resource_id;
  
  -- Update teacher statistics
  UPDATE users
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rr.overall_rating), 0)
      FROM resource_ratings rr
      JOIN documents d ON d.id = rr.resource_id
      WHERE d.user_id = teacher_id_var
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM resource_ratings rr
      JOIN documents d ON d.id = rr.resource_id
      WHERE d.user_id = teacher_id_var
    ),
    total_resources = (
      SELECT COUNT(*)
      FROM documents
      WHERE user_id = teacher_id_var
    ),
    total_downloads = (
      SELECT SUM(downloads)
      FROM documents
      WHERE user_id = teacher_id_var
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

CREATE TRIGGER trigger_update_teacher_reputation
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_teacher_reputation();

-- Function to update helpful votes count
CREATE OR REPLACE FUNCTION update_rating_helpful_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resource_ratings
  SET 
    helpful_votes = (
      SELECT COUNT(*)
      FROM rating_votes
      WHERE rating_id = NEW.rating_id AND vote_type = 'helpful'
    ),
    not_helpful_votes = (
      SELECT COUNT(*)
      FROM rating_votes
      WHERE rating_id = NEW.rating_id AND vote_type = 'not_helpful'
    )
  WHERE id = NEW.rating_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating_helpful_votes
AFTER INSERT OR UPDATE OR DELETE ON rating_votes
FOR EACH ROW
EXECUTE FUNCTION update_rating_helpful_votes();
