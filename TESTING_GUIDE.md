# Question Bank Edit & Delete - Testing Guide

## Quick Start

### 1. Start Backend
```bash
cd backend
npm run start:dev
```

Wait for: `Nest application successfully started`

### 2. Start Frontend
```bash
cd front
npm run dev
```

Wait for: `Local: http://localhost:3001`

### 3. Access Question Bank
Navigate to: `http://localhost:3001/dashboard/questions`

## Test Scenarios

### ✅ Test 1: View All Questions
**Expected**: All 138 questions visible across all subjects
- Verify question cards show subject-specific icons
- Verify level filter shows all education levels
- Verify questions are grouped by subject

### ✅ Test 2: Edit Question
1. Click on any subject (e.g., "English")
2. Hover over a question card
3. Click the pencil/edit icon (top-right)
4. **Expected**: Question text replaced with textarea
5. Modify the text
6. Click "Save" button
7. **Expected**: 
   - Question text updates immediately in UI
   - Edit mode exits
   - No page reload needed

### ✅ Test 3: Cancel Edit
1. Click edit icon on a question
2. Modify text in textarea
3. Click "Cancel" button
4. **Expected**:
   - Original text restored
   - Edit mode exits
   - No changes saved

### ✅ Test 4: Delete Question
1. Hover over a question card
2. Click the trash icon (top-right)
3. **Expected**: Confirmation dialog appears
4. Click "OK" to confirm
5. **Expected**:
   - Question disappears from UI immediately
   - Question count decreases in subject card
   - No page reload needed

### ✅ Test 5: Persistence Check
1. Edit a question and save
2. Refresh the page
3. **Expected**: Edited text persists
4. Navigate away and back
5. **Expected**: Changes still visible

### ✅ Test 6: Soft Delete Verification
1. Delete a question
2. Refresh the page
3. **Expected**: Deleted question doesn't reappear
4. Run database check:
```bash
cd backend
node check-deleted-at-column.js
```
5. **Expected**: `deleted` count increases by 1

### ✅ Test 7: Level Filter
1. Select a specific level from dropdown (e.g., "Bac Sciences")
2. **Expected**: Only questions from that level shown
3. **Expected**: Subject cards update to show only subjects with questions in that level
4. Click "Clear filter"
5. **Expected**: All questions visible again

### ✅ Test 8: Empty State
1. Delete all questions from a subject
2. **Expected**: Empty state message appears
3. Navigate back to subject list
4. **Expected**: Subject card shows "0 questions"

## API Testing with Postman/cURL

### Get All Questions
```bash
curl http://localhost:3000/exam-questions?limit=10000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Question
```bash
curl -X PATCH http://localhost:3000/exam-questions/QUESTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"questionText":"Updated question text"}'
```

### Delete Question
```bash
curl -X DELETE http://localhost:3000/exam-questions/QUESTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Verification

### Check Column Structure
```bash
cd backend
node check-deleted-at-column.js
```

**Expected Output**:
```
✅ Connected to database
✅ Column "deleted_at" exists:
{
  "column_name": "deleted_at",
  "data_type": "timestamp without time zone",
  "is_nullable": "YES"
}

📊 Question counts:
{
  "total": "138",
  "active": "138",
  "deleted": "0"
}
```

### Manual Database Query
```sql
-- View all questions (including deleted)
SELECT id, question_text, deleted_at 
FROM exam_questions 
ORDER BY created_at DESC;

-- Count active vs deleted
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted,
  COUNT(*) as total
FROM exam_questions;

-- Restore a deleted question (if needed)
UPDATE exam_questions 
SET deleted_at = NULL 
WHERE id = 'QUESTION_ID';
```

## Troubleshooting

### Issue: Questions not updating
**Solution**: Check browser console for errors, verify JWT token is valid

### Issue: Questions still showing after delete
**Solution**: Check Network tab, verify DELETE request returns 200 status

### Issue: Edit button not appearing
**Solution**: Hover over question card, ensure icons are imported correctly

### Issue: Backend errors
**Solution**: 
```bash
cd backend
npm run start:dev
# Check logs for specific error messages
```

### Issue: Frontend errors
**Solution**:
```bash
cd front
npm run dev
# Check browser console for React errors
```

## Performance Checks

### Load Time
- Question Bank page should load in < 2 seconds
- Editing should be instant (< 100ms)
- Deletion should complete in < 500ms

### Network Requests
- Initial load: 1 request to `/exam-questions?limit=10000`
- Edit: 1 PATCH request to `/exam-questions/:id`
- Delete: 1 DELETE request to `/exam-questions/:id`

## Success Criteria

✅ All 138 questions visible without pagination
✅ Edit functionality works on all questions
✅ Delete removes questions from UI and marks as deleted in DB
✅ Soft delete maintains data integrity (deletedAt timestamp)
✅ Level filter correctly filters questions
✅ No TypeScript compilation errors
✅ No React console errors
✅ All changes persist across page reloads

## Known Limitations

- No bulk operations (edit/delete multiple questions at once)
- No undo functionality for deletions
- No question restore feature (must use SQL to undelete)
- No edit history tracking

## Future Enhancements

See `QUESTION_BANK_IMPLEMENTATION.md` for planned features.
