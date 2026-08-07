-- Migration 005: Add Activity Logs Table
-- Purpose: Track all user activities for analytics and reporting

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    resource_type VARCHAR(50),
    resource_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_activity ON activity_logs(user_id, activity_type);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Add comments
COMMENT ON TABLE activity_logs IS 'Tracks all user activities for analytics dashboard';
COMMENT ON COLUMN activity_logs.user_id IS 'User who performed the activity';
COMMENT ON COLUMN activity_logs.activity_type IS 'Type of activity (document_upload, question_generated, search, etc.)';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional context about the activity';
COMMENT ON COLUMN activity_logs.resource_type IS 'Type of resource involved (document, question, etc.)';
COMMENT ON COLUMN activity_logs.resource_id IS 'ID of the resource involved';
COMMENT ON COLUMN activity_logs.created_at IS 'Timestamp when activity occurred';
