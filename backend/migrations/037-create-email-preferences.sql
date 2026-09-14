-- Migration 037: Create Email Preferences Table
-- This allows users to control which email notifications they want to receive

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Authentication emails
  welcome_emails BOOLEAN DEFAULT TRUE,
  security_alerts BOOLEAN DEFAULT TRUE,
  password_changed_emails BOOLEAN DEFAULT TRUE,
  
  -- Verification emails (teachers only)
  verification_status_emails BOOLEAN DEFAULT TRUE,
  
  -- Resource/Document emails
  resource_moderation_emails BOOLEAN DEFAULT TRUE,
  resource_approved_emails BOOLEAN DEFAULT TRUE,
  
  -- Collaboration emails
  collaboration_invites BOOLEAN DEFAULT TRUE,
  collaboration_mentions BOOLEAN DEFAULT TRUE,
  collaboration_accepted_emails BOOLEAN DEFAULT TRUE,
  
  -- Purchase emails (students)
  purchase_confirmations BOOLEAN DEFAULT TRUE,
  
  -- Sale emails (teachers)
  sale_notifications BOOLEAN DEFAULT TRUE,
  
  -- Exam emails
  exam_published_emails BOOLEAN DEFAULT TRUE,
  exam_shared_emails BOOLEAN DEFAULT TRUE,
  exam_generated_emails BOOLEAN DEFAULT TRUE,
  
  -- Admin emails
  admin_verification_alerts BOOLEAN DEFAULT TRUE,
  admin_moderation_alerts BOOLEAN DEFAULT TRUE,
  admin_report_alerts BOOLEAN DEFAULT TRUE,
  
  -- General preferences
  marketing_emails BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_preferences_updated_at
BEFORE UPDATE ON email_preferences
FOR EACH ROW
EXECUTE FUNCTION update_email_preferences_updated_at();

-- Create default preferences for existing users
INSERT INTO email_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM email_preferences)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE email_preferences IS 'User email notification preferences';
