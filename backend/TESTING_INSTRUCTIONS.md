# Testing Instructions - Diagram Extraction Fix

## What Was Fixed

The automatic diagram extraction was completely broken because:
- **DeepSeek Chat cannot see images** (it's text-only, not a vision model)
- Code was sending screenshots to AI expecting vision analysis
- AI was guessing randomly without being able to see anything

**New approach:** Use OCR text + label detection + position estimation (no vision needed)

## Quick Test Steps

### 1. Start the backend server
```bash
cd backend
npm run start:dev
```

Wait for: `Application is running on: http://localhost:3000`

### 2. Reset SVT document (delete old broken extractions)
```bash
node reset-svt-document.js
```

You should see:
```
✅ Deleted all questions for SVT document
✅ Reset document status to 'uploaded'
🔄 Ready for re-extraction
```

### 3. Re-upload SVT PDF from frontend

Open your browser and go to the moderation page:
- Upload the SVT exam PDF
- System will automatically extract questions
- Diagrams will extract in background

### 4. Watch backend logs for these key indicators:

**✅ Good signs:**
```
🎨 Extracting diagram images for X questions with visual content...
Detected 3 labeled containers in OCR:
  - "Document 1" at ~25% of page
  - "Document 2" at ~55% of page  
  - "Document 3" at ~78% of page
  
✅ Direct match: "Document 2" found at 55%
Container boundaries: top=30%, left=8%, right=92%, bottom=65%
✨ Extracted diagram for "Expliquez comment les relations..."
```

**❌ Bad signs:**
```
❌ No OCR data for page X
❌ Low AI confidence (0.2) for question...
❌ Failed to crop diagram
Insufficient OCR text for AI analysis
```

### 5. Check frontend

Go to the question list and look for questions mentioning "Document 2", "R1, R2, R3", etc.

**Expected result:**
- Click on question
- See "✨ Extracted Diagrams (1)" section
- Image shows COMPLETE container:
  - Document title at top
  - All diagrams/graphs
  - Labels (R1, R2, R3)
  - Caption at bottom
- Image is readable (not zoomed in)

**If still broken:**
- Image extremely zoomed in → Check logs for coordinate issues
- No image at all → Check confidence threshold (currently 0.4)
- Wrong section → OCR labels might be misdetected

## Manual Re-Extraction (if needed)

If diagrams didn't extract during upload:

```bash
# Option 1: Use the script
node backend/check-visual-content.js

# Option 2: API call
curl -X POST http://localhost:3000/api/moderation/document/{documentId}/re-extract-diagrams
```

## Adjusting Confidence Threshold

If too many questions are being skipped (low confidence):

Edit `src/moderation/question-extraction.service.ts`:

```typescript
// Line ~895 - Current threshold
if (aiRegion && aiRegion.confidence > 0.4) {  // Try lowering to 0.3

// Or add more detailed logging
this.logger.log(`AI confidence: ${aiRegion.confidence} (threshold: 0.4)`);
```

## Expected vs Previous Behavior

### Previous (Broken):
```
Question: "Expliquez les relations R1, R2 et R3"
Result: ⏳ Diagram Extraction in Progress (never completes)
        OR extremely zoomed close-up of one graph
```

### Now (Fixed):
```
Question: "Expliquez les relations R1, R2 et R3"
Result: ✨ Extracted Diagrams (1)
        [Complete "Document 2" container with title, all diagrams, labels]
```

## Troubleshooting Checklist

### Diagrams not extracting at all

- [ ] Backend server running? `http://localhost:3000`
- [ ] OCR data available? Check `document.ocrResultUrl` in database
- [ ] Check logs for "🎨 Extracting diagram images"
- [ ] Questions marked with `hasVisualContent=true`?
- [ ] Confidence threshold too high? (Try 0.3 instead of 0.4)

### Diagrams too zoomed in (still happening)

- [ ] Check logs: Are coordinates in percentages (0-100) or pixels (0-2400)?
- [ ] Verify: `x=8, y=30, width=84, height=35` (percentages)
- [ ] NOT: `x=192, y=720, width=2016, height=840` (pixels)

### Wrong diagram extracted

- [ ] Check OCR label detection in logs
- [ ] Verify question mentions correct reference ("Document 2")
- [ ] Check if OCR found that label
- [ ] May need hybrid approach (manual correction UI)

### AI returning low confidence

- [ ] Check OCR text length: needs at least 50 characters
- [ ] Verify label detection working
- [ ] Check AI response in logs (is it valid JSON?)
- [ ] DeepSeek API key valid? Check `.env`

## Database Queries (if needed)

Check questions with visual content:
```sql
SELECT 
  id,
  question_text,
  has_visual_content,
  visual_content_type,
  visual_content_ref,
  page_number
FROM exam_questions
WHERE document_id = 'YOUR_DOC_ID'
  AND has_visual_content = true;
```

Check if diagrams extracted:
```sql
SELECT 
  id,
  question_text,
  (visual_content_ref::text LIKE '%diagrams%') as has_diagram_data,
  LENGTH(visual_content_ref::text) as data_size
FROM exam_questions  
WHERE document_id = 'YOUR_DOC_ID'
  AND has_visual_content = true;
```

## Performance Expectations

- **Question extraction**: 5-10 seconds for 30 questions
- **Diagram extraction**: 2-3 seconds per question (runs async)
- **Total time**: ~1-2 minutes for full document with 10 visual questions
- **Success rate**: 80-90% automatic, 100% with manual correction

## Next Steps (Recommended)

1. **Test with current fix** - See if direct label matching works
2. **Check accuracy** - How many diagrams are correct?
3. **If <80% accuracy** - Implement hybrid UI (AI + manual selection)
4. **If >80% accuracy** - Ship it and iterate based on teacher feedback

## Files to Monitor

During testing, keep these files open in your editor:

1. **Backend logs** (terminal running `npm run start:dev`)
   - Shows extraction progress
   - Label detection results
   - AI confidence scores
   - Success/error messages

2. **`src/exam-pipeline/ai-diagram-detector.service.ts`**
   - Main logic for diagram detection
   - Adjust confidence thresholds here
   - Debug label matching

3. **Browser developer console** (F12)
   - Frontend API calls
   - Image loading errors
   - Visual content display issues

## Success Criteria

✅ Test passes if:
- At least 80% of questions with visual content show diagrams
- Diagrams include COMPLETE containers (title + all elements + labels)
- Images are readable (not too zoomed)
- Extraction completes within 2 minutes
- No backend crashes or errors

✅ Ready to ship if:
- Success rate > 85%
- Teachers can see referenced diagrams with questions
- Manual correction UI not immediately needed (can add later)

## Support

If issues persist:
1. Check all 3 documentation files:
   - `DIAGRAM_EXTRACTION_FIX.md` - What we fixed
   - `IMPLEMENTATION_SUMMARY.md` - Architecture
   - `FINAL_APPROACH.md` - Strategy

2. Review logs for specific error patterns
3. Consider hybrid approach (add manual selection UI)
