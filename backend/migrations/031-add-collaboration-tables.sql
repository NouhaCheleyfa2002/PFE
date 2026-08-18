-- ============================================================================
-- COLLABORATION SYSTEM - DATABASE SCHEMA
-- Migration: 031-add-collaboration-tables.sql
-- Description: Adds tables for resource and exam collaboration features
-- ============================================================================

-- ============================================================================
-- RESOURCE COLLABORATORS
-- Tracks co-authors for documents/resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS resource_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  permissions JSONB DEFAULT '{"edit": true, "analytics": true, "revenue": 0}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_resource_collaborator UNIQUE (resource_id, user_id)
);

-- Indexes for resource_collaborators
CREATE INDEX idx_resource_collaborators_resource ON resource_collaborators(resource_id);
CREATE INDEX idx_resource_collaborators_user ON resource_collaborators(user_id);
CREATE INDEX idx_resource_collaborators_status ON resource_collaborators(status);
CREATE INDEX idx_resource_collaborators_invited_by ON resource_collaborators(invited_by);

-- ============================================================================
-- EXAM COLLABORATORS
-- Tracks collaborators for exam builder
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID, -- References exams table (not enforced if table doesn't exist yet)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'reviewer')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_exam_collaborator UNIQUE (exam_id, user_id)
);

-- Indexes for exam_collaborators
CREATE INDEX idx_exam_collaborators_exam ON exam_collaborators(exam_id);
CREATE INDEX idx_exam_collaborators_user ON exam_collaborators(user_id);
CREATE INDEX idx_exam_collaborators_status ON exam_collaborators(status);
CREATE INDEX idx_exam_collaborators_role ON exam_collaborators(role);

-- ============================================================================
-- EXAM SESSIONS
-- Tracks real-time presence in exam editing sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected')),
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_exam_session UNIQUE (exam_id, user_id, socket_id)
);

-- Indexes for exam_sessions
CREATE INDEX idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_user ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX idx_exam_sessions_activity ON exam_sessions(last_activity DESC);

-- ============================================================================
-- QUESTION LOCKS
-- Prevents concurrent editing conflicts in real-time collaboration
-- ============================================================================
CREATE TABLE IF NOT EXISTS question_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID,
  question_id UUID NOT NULL,
  locked_by UUID REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 seconds'),
  
  -- Constraints
  CONSTRAINT unique_question_lock UNIQUE (exam_id, question_id)
);

-- Indexes for question_locks
CREATE INDEX idx_question_locks_exam ON question_locks(exam_id);
CREATE INDEX idx_question_locks_question ON question_locks(question_id);
CREATE INDEX idx_question_locks_expires ON question_locks(expires_at);

-- Function to auto-cleanup expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM question_locks WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup expired locks on insert
DROP TRIGGER IF EXISTS trigger_cleanup_locks ON question_locks;
CREATE TRIGGER trigger_cleanup_locks
  AFTER INSERT ON question_locks
  EXECUTE FUNCTION cleanup_expired_locks();

-- ============================================================================
-- COLLABORATION COMMENTS
-- Comments and suggestions on resources and exam questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS collaboration_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(20) CHECK (resource_type IN ('document', 'exam')),
  resource_id UUID NOT NULL,
  question_id UUID, -- NULL for resource-level comments
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collaboration_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[], -- Array of user IDs mentioned with @
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for collaboration_comments
CREATE INDEX idx_collab_comments_resource ON collaboration_comments(resource_type, resource_id);
CREATE INDEX idx_collab_comments_question ON collaboration_comments(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX idx_collab_comments_user ON collaboration_comments(user_id);
CREATE INDEX idx_collab_comments_resolved ON collaboration_comments(resolved);
CREATE INDEX idx_collab_comments_parent ON collaboration_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_collab_comments_mentions ON collaboration_comments USING GIN(mentions);

-- ============================================================================
-- COLLABORATION VERSIONS
-- Version history for collaborative resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS collaboration_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(20) CHECK (resource_type IN ('document', 'exam')),
  resource_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- Full snapshot of the resource at this version
  changed_by UUID REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_resource_version UNIQUE (resource_type, resource_id, version_number)
);

-- Indexes for collaboration_versions
CREATE INDEX idx_collab_versions_resource ON collaboration_versions(resource_type, resource_id);
CREATE INDEX idx_collab_versions_number ON collaboration_versions(version_number DESC);
CREATE INDEX idx_collab_versions_date ON collaboration_versions(created_at DESC);

-- ============================================================================
-- COLLABORATION ACTIVITIES
-- Activity feed for collaboration events
-- ============================================================================
CREATE TABLE IF NOT EXISTS collaboration_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(20) CHECK (resource_type IN ('document', 'exam')),
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for collaboration_activities
CREATE INDEX idx_collab_activities_resource ON collaboration_activities(resource_type, resource_id);
CREATE INDEX idx_collab_activities_user ON collaboration_activities(user_id);
CREATE INDEX idx_collab_activities_type ON collaboration_activities(action_type);
CREATE INDEX idx_collab_activities_date ON collaboration_activities(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_resource_collaborators_updated_at ON resource_collaborators;
CREATE TRIGGER update_resource_collaborators_updated_at
  BEFORE UPDATE ON resource_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_collaborators_updated_at ON exam_collaborators;
CREATE TRIGGER update_exam_collaborators_updated_at
  BEFORE UPDATE ON exam_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collaboration_comments_updated_at ON collaboration_comments;
CREATE TRIGGER update_collaboration_comments_updated_at
  BEFORE UPDATE ON collaboration_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Active resource collaborators
CREATE OR REPLACE VIEW active_resource_collaborators AS
SELECT 
  rc.*,
  u."fullName" as collaborator_name,
  u.email as collaborator_email,
  u.university as collaborator_university,
  inv."fullName" as inviter_name
FROM resource_collaborators rc
JOIN users u ON rc.user_id = u.id
LEFT JOIN users inv ON rc.invited_by = inv.id
WHERE rc.status = 'accepted';

-- View: Active exam sessions with user info
CREATE OR REPLACE VIEW active_exam_sessions AS
SELECT 
  es.*,
  u."fullName" as user_name,
  u.email as user_email
FROM exam_sessions es
JOIN users u ON es.user_id = u.id
WHERE es.status IN ('active', 'idle')
  AND es.last_activity > NOW() - INTERVAL '5 minutes';

-- View: Unresolved comments
CREATE OR REPLACE VIEW unresolved_comments AS
SELECT 
  cc.*,
  u."fullName" as author_name,
  u.email as author_email
FROM collaboration_comments cc
JOIN users u ON cc.user_id = u.id
WHERE cc.resolved = FALSE
ORDER BY cc.created_at DESC;

-- ============================================================================
-- SAMPLE DATA (for testing only - remove in production)
-- ============================================================================

-- Add comments to show table purposes
COMMENT ON TABLE resource_collaborators IS 'Tracks co-authors and their permissions for educational resources';
COMMENT ON TABLE exam_collaborators IS 'Tracks collaborators for real-time exam editing';
COMMENT ON TABLE exam_sessions IS 'Tracks active real-time editing sessions with presence indicators';
COMMENT ON TABLE question_locks IS 'Prevents concurrent editing conflicts with automatic expiration';
COMMENT ON TABLE collaboration_comments IS 'Comments and suggestions on resources and exam questions';
COMMENT ON TABLE collaboration_versions IS 'Version history with full snapshots for rollback capability';
COMMENT ON TABLE collaboration_activities IS 'Activity feed showing all collaboration events';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 031: Collaboration tables created successfully';
  RAISE NOTICE '  - resource_collaborators: Co-authorship management';
  RAISE NOTICE '  - exam_collaborators: Exam collaboration';
  RAISE NOTICE '  - exam_sessions: Real-time presence tracking';
  RAISE NOTICE '  - question_locks: Conflict prevention';
  RAISE NOTICE '  - collaboration_comments: Comment system';
  RAISE NOTICE '  - collaboration_versions: Version history';
  RAISE NOTICE '  - collaboration_activities: Activity feed';
END $$;
