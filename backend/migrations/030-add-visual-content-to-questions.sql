-- Add visual content support for questions that reference images, graphs, tables, etc.
-- This allows questions like "Based on the graph below..." to include the visual content

-- Add column to indicate if question has associated visual content
ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS has_visual_content BOOLEAN DEFAULT FALSE;

-- Add column to store visual content reference (page section, coordinates, or image URL)
ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS visual_content_ref TEXT NULL;

-- Add column to store visual content type (image, graph, table, diagram, etc.)
ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS visual_content_type VARCHAR(50) NULL;

-- Add column to store visual context keywords detected (for matching)
ALTER TABLE exam_questions 
ADD COLUMN IF NOT EXISTS visual_context_keywords TEXT[] NULL;

-- Create index for questions with visual content
CREATE INDEX IF NOT EXISTS idx_exam_questions_visual ON exam_questions(has_visual_content) 
WHERE has_visual_content = TRUE;

-- Add comments
COMMENT ON COLUMN exam_questions.has_visual_content IS 'Whether this question references visual content like graphs, tables, diagrams';
COMMENT ON COLUMN exam_questions.visual_content_ref IS 'Reference to the visual content (coordinates, section, or URL)';
COMMENT ON COLUMN exam_questions.visual_content_type IS 'Type of visual: image, graph, table, diagram, chart, etc.';
COMMENT ON COLUMN exam_questions.visual_context_keywords IS 'Keywords detected that indicate visual reference (e.g., "graph below", "table above")';
