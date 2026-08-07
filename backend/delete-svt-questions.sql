-- Delete all questions for the SVT document
-- This will trigger re-extraction when the document is re-processed

DELETE FROM exam_questions 
WHERE document_id = 'e4d96e27-b2fb-470f-9055-f01e56474326';

-- Verify deletion
SELECT COUNT(*) as remaining_questions 
FROM exam_questions 
WHERE document_id = 'e4d96e27-b2fb-470f-9055-f01e56474326';
