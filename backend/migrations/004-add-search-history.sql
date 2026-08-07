-- Migration 004: Add Search History Table
-- Purpose: Track user searches and enable popular search analytics

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    filters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at);
CREATE INDEX idx_search_history_query ON search_history(query);

-- Add comment
COMMENT ON TABLE search_history IS 'Tracks user search queries for analytics and recommendations';
COMMENT ON COLUMN search_history.user_id IS 'User who performed the search';
COMMENT ON COLUMN search_history.query IS 'Search query text';
COMMENT ON COLUMN search_history.results_count IS 'Number of results returned';
COMMENT ON COLUMN search_history.filters IS 'JSON object containing applied filters (topic, difficulty, etc.)';
COMMENT ON COLUMN search_history.created_at IS 'Timestamp when search was performed';
