-- Create exams table for exam builder
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  "classLevel" VARCHAR(100),
  subject VARCHAR(100),
  duration VARCHAR(50),
  instructions TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  "templateId" UUID,
  "maxPoints" INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_exams_owner ON exams("ownerId");
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_created ON exams("createdAt" DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exams_updated_at
BEFORE UPDATE ON exams
FOR EACH ROW
EXECUTE FUNCTION update_exams_updated_at();
