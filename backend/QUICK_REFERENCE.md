# Quick Reference: Diagram Extraction

## Current Implementation

### What It Does
Automatically extracts complete document containers (not individual graphs) from exam PDFs for questions that reference visual elements.

### How It Works
1. OCR detects labels: "Document 1" at 32%, "Document 2" at 55%
2. AI identifies which container the question needs
3. AI estimates complete container boundaries using label as anchor
4. System crops and saves the diagram

### Test It
```bash
cd backend
node reset-svt-document.js
# Then re-upload document from frontend
```

### Check Logs
Look for:
- `🤖 Using AI detection`
- `Detected 2 labeled containers`
- `AI identified container: Document 2`
- `✨ Extracted diagram`

### Success = Complete Container
✅ Title + ALL graphs + Labels + Caption
❌ NOT just one graph from the middle

## Key Files

| File | Purpose |
|------|---------|
| `ai-diagram-detector.service.ts` | Document retrieval with OCR anchors |
| `pdf-layout-analyzer.service.ts` | OCR label position detection |
| `pdf-diagram-extractor.service.ts` | PDF.js rendering |
| `question-extraction.service.ts` | Main extraction orchestration |

## Quick Fixes

### If diagrams are cut off:
→ Increase padding in fallback heuristics (currently 50-65% height)

### If wrong document extracted:
→ Check OCR label detection in logs
→ Verify AI is receiving correct label positions

### If no diagram extracted:
→ Check `hasVisualContent` detection
→ Lower confidence threshold (currently 0.4)

### If question text included:
→ AI needs better boundary training
→ Add more examples to prompt

## Confidence Threshold
```typescript
if (aiRegion && aiRegion.confidence > 0.4) {
  // Use AI result
}
```
Adjust 0.4 higher for stricter, lower for more permissive.

## Re-Extract Endpoint
```
POST /moderation/documents/:documentId/re-extract-diagrams
```

## Future: Hybrid UI
- Show AI confidence
- "Select from PDF" button  
- Manual correction capability
- Track improvements

## Remember
This is **document retrieval**, not computer vision.
AI chooses from OCR-detected containers, doesn't "see" images.
