# Document Container Extraction - Complete Rewrite

## The Problem with Previous Approach

❌ **Object Detection**: AI was trying to "find a graph"
✅ **Document Segmentation**: AI should "identify complete container boundaries"

## Key Changes

### 1. Document Container Concept

The AI now understands that educational documents are **visual containers**:

```
┌─────────────────────────────────────┐
│ Explanatory text                    │
│ Graph 1                             │
│ Graph 2                             │
│ Labels, legends                     │
│                                     │
│         Document 2                  │
└─────────────────────────────────────┘
```

**OLD**: Extract just "Graph 1"
**NEW**: Extract the ENTIRE container including all elements

### 2. Container Boundaries Recognition

A container may be defined by:
- Outer rectangular border
- Common background
- Shared title/caption
- Grouped graphics
- Aligned elements

### 3. Two-Step Reasoning

**Step 1**: Identify the referenced object
- "Document 2"
- "Schema with R1, R2, R3"
- "Experimental results"

**Step 2**: Find the complete visual boundaries
- Imagine drawing ONE rectangle around the entire container
- Include: title, all graphs, labels, caption
- Exclude: surrounding questions, unrelated text

### 4. Critical Rule

**If question references "Document X" → Extract COMPLETE Document X**

Do NOT isolate individual graphs from within the document.

### 5. Exclusion Rules

Never include:
✗ Free-flowing body text outside the container
✗ The question asking about the document
✗ The next question
✗ Neighbouring documents
✗ Unrelated paragraphs

Only include captions physically attached to the container.

### 6. Boundary Coordinates

Changed from `boundingBox {x, y, width, height}` to:

```json
{
  "containerBoundaries": {
    "top": 25,     // where container starts (%)
    "left": 8,     // left edge (%)
    "right": 92,   // right edge (%)
    "bottom": 70   // where container ends (%)
  }
}
```

This forces the AI to think about **edges** rather than **centers and sizes**.

### 7. Generous Buffer Zones

- Add 2-3% buffer on all sides
- Better to include too much than cut off elements
- If container seems at y=30%, start at y=27%
- If height seems 40%, use 43-45%

### 8. Wording Changes

**OLD**: "Extract the diagram"
**NEW**: "Imagine drawing a rectangle around the document with a marker"

This aligns with how humans perceive document boundaries.

## Example Transformations

### Before:
```
Question: "Exploitez Document 2..."
AI Response: Crops just the middle graph (35% of page)
```

### After:
```
Question: "Exploitez Document 2..."
AI Response: 
- Identifies "Document 2" container
- Finds top edge (includes title)
- Finds bottom edge (includes caption "Document 2")
- Includes ALL graphs and text INSIDE the container
- Excludes question text ABOVE
- Returns: top=28%, left=7%, right=93%, bottom=72%
```

## Testing

Run: `node reset-svt-document.js`

Then re-upload the SVT document.

Expected results:
✅ "Document 2" shows COMPLETE container with all experiments
✅ No question text above/below included
✅ All labels (R1, R2, R3) visible
✅ All graphs within Document 2 included together
✅ Border/caption included
