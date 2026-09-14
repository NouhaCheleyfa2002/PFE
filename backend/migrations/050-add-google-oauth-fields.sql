-- Add Google OAuth fields to users table
-- Migration 050: Add Google OAuth Support

-- Add googleId column for storing Google's unique identifier
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Add profile picture URL
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);

-- Allow password to be nullable (for OAuth users)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.profile_picture IS 'Profile picture URL from OAuth or uploaded';
