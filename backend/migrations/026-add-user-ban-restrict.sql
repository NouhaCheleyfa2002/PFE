-- Add ban and restriction fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_type VARCHAR(50); -- 'upload', 'comment', 'download', 'all'

-- Add moderation fields to ratings
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP;
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS flagged_reason TEXT;
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id);
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS ai_moderation_score DECIMAL(3,2); -- 0.00 to 1.00
ALTER TABLE resource_ratings ADD COLUMN IF NOT EXISTS ai_moderation_flags TEXT[]; -- ['toxic', 'spam', 'offensive', etc.]

-- Create index for quick lookup of flagged content
CREATE INDEX IF NOT EXISTS idx_ratings_flagged ON resource_ratings(flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_ratings_moderation_status ON resource_ratings(moderation_status);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned) WHERE banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_restricted ON users(restricted) WHERE restricted = TRUE;
