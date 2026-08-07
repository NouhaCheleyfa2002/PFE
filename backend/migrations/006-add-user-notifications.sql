-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_userId ON user_notifications("userId");
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_createdAt ON user_notifications("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_userId_read ON user_notifications("userId", read);

-- Add some sample notifications for testing (optional - you can comment this out if you don't want sample data)
-- You would typically get the actual user IDs from your users table
-- This is just for demonstration purposes

COMMENT ON TABLE user_notifications IS 'Stores user-facing notifications for various events';
COMMENT ON COLUMN user_notifications.type IS 'Type of notification: upload, rating, verification, comment, system, exam, question';
COMMENT ON COLUMN user_notifications.metadata IS 'Additional data associated with the notification (JSON)';
