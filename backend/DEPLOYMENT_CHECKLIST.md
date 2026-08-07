# Diagram Extraction Fix - Deployment Checklist

## Pre-Deployment Testing

### ☐ 1. Environment Check
- [ ] Backend server starts without errors: `npm run start:dev`
- [ ] Database connected and migrations applied
- [ ] Azure OCR credentials valid in `.env`
- [ ] DeepSeek API key valid in `.env`
- [ ] SeaweedFS storage running

### ☐ 2. Code Verification
- [ ] `ai-diagram-detector.service.ts` has direct label matching logic
- [ ] AI prompt clearly states "You CANNOT see images"
- [ ] Confidence threshold set to 0.4 (line ~895 in `question-extraction.service.ts`)
- [ ] Container boundary calculations use percentages (0-100), not pixels
- [ ] Fallback heuristics in place for OCR failures

### ☐ 3. Test with SVT Document

**Reset and re-upload:**
```bash
node reset-svt-document.js
# Then upload SVT PDF from frontend
```

**Check logs for:**
- [ ] "Detected X labeled containers in OCR"
- [ ] Labels: "Document 1", "Document 2", "Document 3" detected
- [ ] Direct matches: "✅ Direct match: Document 2 found at X%"
- [ ] Extraction success: "✨ Extracted diagram for..."
- [ ] No errors or crashes

**Check frontend results:**
- [ ] Questions with "Document 2" reference show diagrams
- [ ] Questions with "R1, R2, R3" show relation diagrams
- [ ] Images are complete containers (not zoomed crops)
- [ ] Images are readable
- [ ] At least 80% of visual questions have diagrams

### ☐ 4. Edge Cases

Test these scenarios:
- [ ] Question with no explicit reference (should use heuristics)
- [ ] Question with "expérience 1 et 2" (should get experiment region)
- [ ] Question with symbolic refs only "R1, R2, R3" (should detect pattern)
- [ ] Page with no OCR data (should use fallback)
- [ ] Question with very low confidence (<0.4) (should skip extraction)

### ☐ 5. Performance Testing
- [ ] Time to extract 30 questions: < 30 seconds
- [ ] Time to extract diagrams for 10 visual questions: < 30 seconds
- [ ] Total document processing: < 2 minutes
- [ ] No memory leaks (check after 10+ documents)
- [ ] PDF.js cleanup (documents destroyed after use)

---

## Deployment Steps

### ☐ Step 1: Backup Current System
```bash
# Backup database
pg_dump edushare > backup_before_diagram_fix.sql

# Backup code
git commit -am "Backup before diagram extraction fix"
git tag backup-pre-diagram-fix
```

### ☐ Step 2: Deploy Code Changes

**Files to deploy:**
- [ ] `src/exam-pipeline/ai-diagram-detector.service.ts` ⭐
- [ ] `src/exam-pipeline/pdf-layout-analyzer.service.ts`
- [ ] `src/moderation/question-extraction.service.ts`

**Configuration:**
- [ ] `.env` has all required keys
- [ ] No hardcoded values
- [ ] Confidence threshold configurable (if needed)

### ☐ Step 3: Install Dependencies
```bash
npm install
# Verify: canvas, sharp, pdfjs-dist installed
```

### ☐ Step 4: Run Migrations
```bash
# No new migrations needed for this fix
# But verify existing tables:
npm run migration:run
```

### ☐ Step 5: Start Production Server
```bash
npm run build
npm run start:prod
```

### ☐ Step 6: Smoke Test Production

**Quick verification:**
```bash
# Health check
curl http://your-domain/api/health

# Upload a test document
# Watch logs for extraction success

# Check one question has diagram
curl http://your-domain/api/exam-questions/{id}
# Verify visualContentRef has "diagrams" array
```

---

## Post-Deployment Monitoring

### ☐ Day 1 - Intensive Monitoring

**Watch for:**
- [ ] Extraction success rate (should be >80%)
- [ ] API response times (should be <3s for diagram extraction)
- [ ] Error rates (should be <5%)
- [ ] Memory usage (should be stable)
- [ ] CPU usage (spikes during extraction are normal)

**Log patterns to monitor:**
```bash
# Success indicators
grep "✨ Extracted diagram" logs/*.log | wc -l
grep "✅ Direct match" logs/*.log | wc -l

# Error indicators  
grep "❌" logs/*.log
grep "Failed to extract" logs/*.log
grep "Low AI confidence" logs/*.log
```

### ☐ Week 1 - Usage Analytics

**Track metrics:**
- [ ] Total documents processed
- [ ] Questions with visual content extracted
- [ ] Average extraction time per question
- [ ] Confidence score distribution
- [ ] Method usage: Direct match vs AI vs Fallback
- [ ] User feedback on diagram quality

**SQL queries for analytics:**
```sql
-- Success rate
SELECT 
  COUNT(*) FILTER (WHERE visual_content_ref LIKE '%diagrams%') as with_diagrams,
  COUNT(*) as total_visual_questions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE visual_content_ref LIKE '%diagrams%') / COUNT(*), 2) as success_rate
FROM exam_questions
WHERE has_visual_content = true
  AND created_at > NOW() - INTERVAL '7 days';

-- Confidence distribution
SELECT 
  CASE 
    WHEN (visual_content_ref::json->'aiConfidence')::numeric > 0.9 THEN 'Very High (>0.9)'
    WHEN (visual_content_ref::json->'aiConfidence')::numeric > 0.7 THEN 'High (0.7-0.9)'
    WHEN (visual_content_ref::json->'aiConfidence')::numeric > 0.5 THEN 'Medium (0.5-0.7)'
    ELSE 'Low (<0.5)'
  END as confidence_range,
  COUNT(*)
FROM exam_questions
WHERE has_visual_content = true
  AND visual_content_ref LIKE '%aiConfidence%'
GROUP BY confidence_range;
```

---

## Rollback Plan

If extraction success rate < 70% or critical issues:

### ☐ Emergency Rollback
```bash
# Stop server
pm2 stop edushare-backend

# Restore code
git checkout backup-pre-diagram-fix

# Restore database (if needed)
psql edushare < backup_before_diagram_fix.sql

# Restart
pm2 restart edushare-backend
```

### ☐ Partial Rollback (keep questions, disable diagram extraction)
```typescript
// In question-extraction.service.ts
// Comment out diagram extraction:
/*
if (visualQuestions.length > 0) {
  this.extractDiagramsForQuestions(documentId, visualQuestions);
}
*/
```

---

## Success Metrics

### Minimum Viable Product (MVP) Criteria

✅ **Ship if all these are true:**
- [ ] Extraction success rate ≥ 75%
- [ ] No server crashes or errors
- [ ] Average extraction time < 3 seconds per question
- [ ] Diagrams show complete containers (not zoomed crops)
- [ ] Teachers can see referenced diagrams with questions

### Ideal Criteria

✅ **Excellent if these are true:**
- [ ] Extraction success rate ≥ 85%
- [ ] Direct label matching works for 60%+ questions
- [ ] No false positives (wrong diagrams)
- [ ] Positive teacher feedback
- [ ] Ready to add hybrid manual correction UI

---

## Known Limitations

Document these for users:

1. **OCR dependency** - Requires good OCR quality
   - Solution: Azure OCR is very reliable
   - Fallback: Manual correction UI (future)

2. **Label pattern matching** - Requires standard naming
   - Works: "Document 1", "Figure 2", "Schéma 3"
   - Fails: "Annexe A", "Photo personnelle"
   - Solution: Add more patterns or manual correction

3. **Container estimation** - Uses typical layout assumptions
   - Assumes: Label near bottom of container
   - Assumes: Container ~30-40% of page height
   - Solution: AI reasoning helps adapt to variations

4. **Confidence threshold** - May skip some valid questions
   - Current: 0.4 (conservative)
   - Adjustment: Can lower to 0.3 if needed
   - Trade-off: Lower threshold = more false positives

---

## Documentation for Users

### For Teachers (End Users)

**What changed:**
- Questions with diagrams now show the diagrams automatically
- Look for "✨ Extracted Diagrams" section below question
- If diagram missing or wrong, report to admin

**Known issues:**
- Some diagrams may not extract (working on 100% coverage)
- Manual correction feature coming soon

### For Admins

**If extraction fails:**
```bash
# Re-trigger extraction for specific document
curl -X POST http://localhost:3000/api/moderation/document/{id}/re-extract-diagrams

# Or use script
node backend/check-visual-content.js
```

**Adjust confidence threshold:**
Edit `src/moderation/question-extraction.service.ts` line ~895:
```typescript
if (aiRegion && aiRegion.confidence > 0.3) {  // Was 0.4
```

**Check extraction status:**
```sql
SELECT 
  id,
  question_text,
  has_visual_content,
  visual_content_ref LIKE '%diagrams%' as has_diagram
FROM exam_questions
WHERE document_id = 'YOUR_ID';
```

---

## Next Steps After Deployment

### Short-term (1-2 weeks)
- [ ] Monitor success rate and user feedback
- [ ] Collect examples of failures
- [ ] Adjust confidence threshold if needed
- [ ] Document common failure patterns

### Medium-term (1 month)
- [ ] Design hybrid UI (AI + manual correction)
- [ ] Add "Select from PDF" button for teachers
- [ ] Store correction data for learning
- [ ] A/B test different confidence thresholds

### Long-term (3+ months)
- [ ] Train on correction data to improve AI
- [ ] Add support for more label patterns
- [ ] Implement smart container detection (ML)
- [ ] Consider upgrading to true vision model (DeepSeek-VL or GPT-4V)

---

## Support Contacts

**Technical Issues:**
- Check: `DIAGRAM_EXTRACTION_FIX.md`
- Check: `TESTING_INSTRUCTIONS.md`
- Check: Backend logs

**Questions:**
- Architecture: See `IMPLEMENTATION_SUMMARY.md`
- Strategy: See `FINAL_APPROACH.md`
- Future plans: See `HYBRID_EXTRACTION_UX.md`

---

## Final Checklist Before Go-Live

- [ ] All pre-deployment tests passed
- [ ] Code deployed and server running
- [ ] Smoke tests passed
- [ ] Monitoring dashboard ready
- [ ] Rollback plan documented and tested
- [ ] Team trained on new feature
- [ ] User documentation updated
- [ ] Success metrics defined and baseline recorded

**Sign-off:**
- [ ] Developer: Code tested and working
- [ ] QA: Edge cases verified
- [ ] Product: Meets requirements
- [ ] DevOps: Deployment successful
- [ ] Manager: Approved for production

---

**Deployment Date:** _______________  
**Deployed by:** _______________  
**Verified by:** _______________  
**Rollback if needed by:** _______________
