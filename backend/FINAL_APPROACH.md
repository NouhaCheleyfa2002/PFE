# Final Diagram Extraction Approach

## The Core Insight

**DeepSeek Chat is NOT a vision model** - it's a document retrieval system.

The pipeline should be:
```
PDF.js → OCR → Detect label positions → DeepSeek chooses → Crop
```

NOT:
```
PDF.js → DeepSeek "find image" → Crop
```

## Key Changes

### 1. AI Role: Document Layout Analyzer

❌ **OLD**: "Find the diagram in this image"
✅ **NEW**: "Analyze the document layout and identify container boundaries"

The AI is NOT doing computer vision - it's doing document retrieval using OCR anchors.

### 2. Pre-Detection of Labels

Before calling AI, we now **detect label positions from OCR**:

```javascript
detectLabelPositions(ocrText) {
  // Find: "Document 1" at position 320
  //       "Document 2" at position 850  
  //       "Figure 1" at position 1200
  
  return [{text: "Document 1", relativePosition: 32%},
          {text: "Document 2", relativePosition: 55%},
          {text: "Figure 1", relativePosition: 78%}]
}
```

### 3. AI Gets Both Visual + Textual Understanding

```
INPUTS TO AI:
- Question: "Exploitez Document 2..."
- Detected Labels:
  * "Document 1" at ~32% of page
  * "Document 2" at ~55% of page  
- OCR Text: [full text for context]
- Page screenshot: [for visual confirmation]

TASK: Locate Document 2 container boundaries
```

### 4. Container Boundary Logic

AI now understands:
- Label "Document 2" is at 55% of page
- Container STARTS ~20-30% above the label (includes title, diagrams)
- Container ENDS at or slightly below the label
- Typical result: top=35%, bottom=68%

### 5. Complete Container Extraction

If "Document 2" contains:
- Title
- Experimental setup text
- 3 graphs
- Legend
- Caption "Document 2"

→ Extract ALL of it, not just one graph

### 6. Simplified AI Decision

AI is no longer doing:
- ❌ Object detection
- ❌ Visual analysis
- ❌ Graph finding

AI is now only doing:
- ✅ Document retrieval ("Which container?")
- ✅ Boundary estimation using OCR anchors
- ✅ Structural analysis

## Example Flow

### Input:
```
Question: "Exploitez les résultats de Document 2..."
OCR Labels: 
  - "Document 1" at 820px (32%)
  - "Document 2" at 1400px (55%)
  - "Figure 1" at 2000px (78%)
```

### AI Analysis:
```json
{
  "referencedObject": "Document 2",
  "containerBoundaries": {
    "top": 35,     // Start above label at 55%
    "left": 8,
    "right": 92,
    "bottom": 68   // End at or past label
  },
  "reasoning": "Document 2 label at 55%, container includes experimental setup above and caption below"
}
```

### Result:
Complete "Document 2" container extracted with all graphs, text, and labels.

## Benefits

1. **More Reliable**: Uses OCR positions as ground truth, not AI vision guessing
2. **Faster**: AI only chooses from pre-detected candidates
3. **More Accurate**: Provides exact label positions to AI
4. **Better Context**: AI has both visual + textual understanding
5. **Simpler Logic**: Document retrieval, not computer vision

## Future Enhancement

Could add classical CV pre-detection:
- Detect rectangular borders
- Detect whitespace separation
- Detect text blocks with captions
- Send candidates to AI: "Which of these 3 regions is Document 2?"

This would make it even more reliable.

## Testing

Run: `node reset-svt-document.js`

Then re-upload SVT document.

Expected improvements:
✅ "Document 2" correctly identified using OCR position
✅ Complete container extracted (not just middle graph)
✅ All elements included (title, graphs, labels, caption)
✅ No surrounding text
✅ Better "Document 1" vs "Document 2" distinction
