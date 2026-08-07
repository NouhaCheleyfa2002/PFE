import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import sharp from 'sharp';

export interface DiagramRegion {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  confidence: number; // 0-1
  description: string;
}

@Injectable()
export class AIDiagramDetectorService {
  private readonly logger = new Logger(AIDiagramDetectorService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Use AI to detect diagram location in a page based on question text
   * CRITICAL FIX: DeepSeek Chat is NOT a vision model - it cannot "see" images
   * Instead: Use OCR text + label detection + AI text reasoning
   */
  async detectDiagramRegion(
    pageImageBase64: string | null,
    questionText: string,
    pageWidth: number,
    pageHeight: number,
    pageOcrText?: string,
  ): Promise<DiagramRegion | null> {
    try {
      this.logger.log(`Analyzing document layout for: "${questionText.substring(0, 60)}..."`);

      // Extract figure reference from question text (Document 1, Figure 2, R1/R2/R3, etc.)
      const figureRef = this.extractFigureReference(questionText);
      
      // Pre-detect label positions from OCR text - THIS IS THE KEY
      const detectedLabels = pageOcrText ? this.detectLabelPositions(pageOcrText) : [];
      
      if (detectedLabels.length > 0) {
        this.logger.log(`Detected ${detectedLabels.length} labeled containers in OCR:`);
        detectedLabels.forEach(label => {
          this.logger.log(`  - "${label.text}" at ~${label.relativePosition.toFixed(0)}% of page`);
        });
      }
      
      // If we have a direct label match, use it immediately
      if (figureRef && detectedLabels.length > 0) {
        const matchedLabel = detectedLabels.find(l => 
          l.text.toLowerCase() === figureRef.toLowerCase() ||
          figureRef.toLowerCase().includes(l.text.toLowerCase())
        );
        
        if (matchedLabel) {
          this.logger.log(`✅ Direct match: "${figureRef}" found at ${matchedLabel.relativePosition.toFixed(0)}%`);
          
          // Estimate container boundaries around this label
          // Container typically starts 20-30% above label and extends 5-10% below
          const containerHeight = 35; // typical container height in percentage
          const containerTop = Math.max(5, matchedLabel.relativePosition - 25);
          const containerBottom = Math.min(95, containerTop + containerHeight);
          
          return {
            x: 8,
            y: containerTop,
            width: 84,
            height: containerBottom - containerTop,
            confidence: 0.95,
            description: `Container with label "${matchedLabel.text}" at ${matchedLabel.relativePosition.toFixed(0)}%`,
          };
        }
      }

      // CRITICAL: DeepSeek Chat is NOT a vision model
      // We can only use it for TEXT-BASED reasoning about layout
      // Only use AI if we have good OCR data and can't find direct match
      
      const systemPrompt = `You are analyzing an exam page layout using OCR text only (NO IMAGE VISION).

Your task: Determine if the question needs a visual element, and if so, estimate container boundaries.

IMPORTANT: You CANNOT see images. You can only:
1. Read OCR text
2. Understand question references
3. Use label positions as anchors
4. Estimate reasonable container sizes

========================== ANALYSIS STEPS ==========================

Step 1: Check if question is self-contained
- Can the question be answered with text alone?
- If YES → return selfContained: true

Step 2: Identify visual reference
- Document 1, Figure 2, Schéma, R1/R2/R3, etc.

Step 3: Use label positions from OCR
- When "Document 2" label found at X% of page
- Container likely starts 20-30% ABOVE that position
- Container extends to label position or slightly below

Step 4: Estimate complete container boundaries
- Include title, diagrams, graphs, labels, caption
- Use generous boundaries (better too large than too small)
- Typical container: 30-40% of page height

========================== OUTPUT FORMAT ==========================

If needs visual:
{
  "referencedObject": "Document 2",
  "selfContained": false,
  "requiresVisual": true,
  "containerBoundaries": {
    "top": 30,    // percentage where container starts
    "left": 8,
    "right": 92,
    "bottom": 65  // percentage where container ends
  },
  "confidence": 0.85,
  "reasoning": "Document 2 label at 55%, estimated container from 30% to 65%"
}

If self-contained:
{
  "selfContained": true,
  "requiresVisual": false,
  "confidence": 1.0
}`;

      const userPrompt = `QUESTION TO ANALYZE:
"""
${questionText}
"""

${figureRef ? `REFERENCED OBJECT: The question mentions "${figureRef}"` : 'NO EXPLICIT REFERENCE in question'}

${detectedLabels.length > 0 ? `\nDETECTED LABELS FROM OCR (positions as % of page height):
${detectedLabels.map(l => `- "${l.text}" at ${l.relativePosition.toFixed(1)}%`).join('\n')}
` : 'NO LABELS DETECTED in OCR'}

PAGE OCR TEXT EXCERPT (first 2000 chars):
"""
${pageOcrText ? pageOcrText.substring(0, 2000) : 'No OCR text available'}
"""

YOUR TASK:

1. Is question self-contained? Can it be answered without seeing any visual?
   ${figureRef ? `NO - question explicitly references "${figureRef}"` : 'Analyze question to determine'}

2. If NOT self-contained, estimate container boundaries:
${detectedLabels.length > 0 && figureRef ? `
   You found label "${figureRef}" in the detected labels above.
   
   Container estimation rules:
   - Container typically STARTS 20-30% ABOVE the label position
   - Container ENDS AT or 5-10% BELOW the label position  
   - Width: usually 8% to 92% (full width minus margins)
   - Height: typically 30-40% of page
   
   Example: If label at 55%
   - Container top: 55% - 25% = 30%
   - Container bottom: 55% + 5% = 60%
   - Full boundaries: {top: 30, left: 8, right: 92, bottom: 60}
` : `
   No direct label match. Use heuristics:
   - Questions about experiments/relations: top 25%, large height (40-50%)
   - Questions about specific figures: centered region
   - Be generous with boundaries
`}

3. Return JSON with containerBoundaries and reasoning

Remember: 
- You CANNOT see the image
- You're estimating based on OCR text and label positions
- Be generous (better too large than too small)
- Confidence should be 0.7-0.9 for estimates, 0.9-0.95 for direct label matches`;

      try {
        // Only call AI if we have OCR text to work with
        if (!pageOcrText || pageOcrText.length < 50) {
          this.logger.warn('Insufficient OCR text for AI analysis, using heuristics');
          return this.getSmartFallbackRegion(questionText);
        }

        const response = await this.aiService.chat(systemPrompt, userPrompt);
        const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleanResponse);

        // Check if question is self-contained
        if (result.selfContained === true || result.requiresVisual === false) {
          this.logger.log(`Question is self-contained, no visual needed`);
          return null;
        }

        // Extract container boundaries
        if (result.containerBoundaries) {
          const bounds = result.containerBoundaries;
          
          // Convert top/left/right/bottom to x/y/width/height
          const x = bounds.left;
          const y = bounds.top;
          const width = bounds.right - bounds.left;
          const height = bounds.bottom - bounds.top;
          
          this.logger.log(`AI identified container: ${result.referencedObject || result.visualType}`);
          this.logger.log(`Boundaries: top=${bounds.top}%, left=${bounds.left}%, right=${bounds.right}%, bottom=${bounds.bottom}%`);
          this.logger.log(`Converted: x=${x}%, y=${y}%, width=${width}%, height=${height}%`);
          this.logger.log(`Reasoning: ${result.reasoning}`);
          this.logger.log(`Confidence: ${result.confidence}`);
          
          return {
            x: x || 8,
            y: y || 25,
            width: width || 84,
            height: height || 50,
            confidence: result.confidence || 0.7,
            description: result.reasoning || `${result.visualType} container`,
          };
        }
        
        // Fallback: Try old boundingBox format for compatibility
        if (result.boundingBox) {
          const bbox = result.boundingBox;
          this.logger.log(`AI located visual (legacy format): ${result.reasoning} (confidence: ${result.confidence})`);
          
          return {
            x: bbox.x || 10,
            y: bbox.y || 25,
            width: bbox.width || 85,
            height: bbox.height || 45,
            confidence: result.confidence,
            description: result.reasoning || result.visualType || 'Visual element',
          };
        }
      } catch (error) {
        this.logger.warn('AI analysis failed:', error.message);
      }

      // If symbolic references detected, return large centered region
      if (figureRef && figureRef.startsWith('symbols:')) {
        this.logger.log('Symbolic references detected - using large centered region');
        return {
          x: 10,
          y: 15,
          width: 80,
          height: 55,
          confidence: 0.85,
          description: `Diagram with labeled elements: ${figureRef.replace('symbols:', '')}`,
        };
      }

      // Fallback: Smart heuristic based on question patterns
      return this.getSmartFallbackRegion(questionText);
    } catch (error) {
      this.logger.error('Failed to detect diagram using AI:', error);
      return null;
    }
  }

  /**
   * Pre-detect label positions from OCR text
   * This helps AI locate containers by providing anchor points
   */
  private detectLabelPositions(ocrText: string): Array<{ text: string; relativePosition: number }> {
    const labels: Array<{ text: string; relativePosition: number }> = [];
    const textLength = ocrText.length;

    // Label patterns to search for
    const patterns = [
      /Document\s+\d+/gi,
      /Figure\s+\d+/gi,
      /Tableau\s+\d+/gi,
      /Schéma\s+\d+/gi,
      /Graphique\s+\d+/gi,
      /Table\s+\d+/gi,
      /Schema\s+\d+/gi,
    ];

    for (const pattern of patterns) {
      const matches = [...ocrText.matchAll(pattern)];
      for (const match of matches) {
        const text = match[0];
        const index = match.index || 0;
        
        // Calculate relative position in text (0-100%)
        const relativePosition = (index / textLength) * 100;
        
        // Avoid duplicates
        if (!labels.some(l => l.text.toLowerCase() === text.toLowerCase())) {
          labels.push({ text, relativePosition });
        }
      }
    }

    return labels.sort((a, b) => a.relativePosition - b.relativePosition);
  }

  /**
   * Extract figure reference from question text
   * Enhanced: Also detects symbolic references (R1, R2, C1, M1, etc.)
   */
  private extractFigureReference(questionText: string): string | null {
    // Explicit figure references
    const figurePatterns = [
      /document\s+(\d+)/i,
      /figure\s+(\d+)/i,
      /tableau\s+(\d+)/i,
      /schema\s+(\d+)/i,
      /graphique\s+(\d+)/i,
      /الوثيقة\s+(\d+)/i,
      /الشكل\s+(\d+)/i,
    ];

    for (const pattern of figurePatterns) {
      const match = questionText.match(pattern);
      if (match) {
        return match[0]; // Return "Document 1", "Figure 2", etc.
      }
    }

    // Symbolic references (R1, R2, C1, M1, X1, Y1, etc.)
    // These indicate diagram elements that need to be seen
    const symbolicPatterns = [
      /\b([A-Z]\d+)\b/g, // Matches R1, C2, M3, etc.
      /\b([A-Z][A-Z]\d+)\b/g, // Matches AB1, CD2, etc.
    ];

    const symbols: string[] = [];
    for (const pattern of symbolicPatterns) {
      const matches = questionText.matchAll(pattern);
      for (const match of matches) {
        // Exclude common words that match pattern (like "R2" in "Répondez")
        const symbol = match[1];
        if (symbol && !this.isCommonWord(symbol)) {
          symbols.push(symbol);
        }
      }
    }

    if (symbols.length >= 2) {
      // Multiple symbolic references indicate diagram with labeled elements
      this.logger.log(`Detected symbolic references: ${symbols.join(', ')}`);
      return `symbols:${symbols.join(',')}`;
    }

    return null;
  }

  /**
   * Check if a symbol is actually a common word (not a diagram reference)
   */
  private isCommonWord(symbol: string): boolean {
    const commonWords = ['A', 'B', 'C', 'D', 'E', 'I', 'O', 'U'];
    return commonWords.includes(symbol);
  }

  /**
   * Find figure label position in OCR text and estimate diagram location
   */
  private findFigureLabelPosition(figureRef: string, ocrText: string): DiagramRegion | null {
    // Find the figure label in text
    const index = ocrText.toLowerCase().indexOf(figureRef.toLowerCase());
    
    if (index === -1) return null;

    // Estimate position based on where label appears in text
    const textLength = ocrText.length;
    const relativePosition = index / textLength;

    // Diagrams are usually ABOVE their labels
    // If label is at 60% of text, diagram is likely at 40-55%
    let y = Math.max(15, (relativePosition * 100) - 15);
    
    // Center horizontally
    let x = 15;
    let width = 70;
    let height = 35;

    // Adjust for common patterns
    if (relativePosition < 0.3) {
      // Label near top - diagram at top
      y = 15;
      height = 40;
    } else if (relativePosition > 0.7) {
      // Label near bottom - diagram in middle/bottom
      y = 45;
      height = 40;
    }

    return {
      x,
      y,
      width,
      height,
      confidence: 0.75,
      description: `Diagram above "${figureRef}" label`,
    };
  }

  /**
   * Smart fallback region based on question patterns
   * Returns generous regions that capture complete visual elements
   */
  private getSmartFallbackRegion(questionText: string): DiagramRegion {
    const lower = questionText.toLowerCase();

    // Biology/anatomy diagrams - large, generous crop
    if (lower.includes('cellule') || lower.includes('cell') || lower.includes('organe') || lower.includes('neurone')) {
      return {
        x: 8,
        y: 25,
        width: 84,
        height: 50,
        confidence: 0.6,
        description: 'Biological diagram (heuristic - complete visual)',
      };
    }

    // Graphs/charts - wide and tall to capture axes and legends
    if (lower.includes('graphique') || lower.includes('graph') || lower.includes('courbe')) {
      return {
        x: 10,
        y: 28,
        width: 82,
        height: 48,
        confidence: 0.6,
        description: 'Graph/chart (heuristic - complete with axes)',
      };
    }

    // Tables - wide to capture all columns
    if (lower.includes('tableau') || lower.includes('table')) {
      return {
        x: 8,
        y: 30,
        width: 84,
        height: 45,
        confidence: 0.6,
        description: 'Table (heuristic - complete)',
      };
    }

    // Experiments/results - large region for multiple diagrams
    if (lower.includes('expérience') || lower.includes('résultat') || lower.includes('experiment') || lower.includes('protocole')) {
      return {
        x: 6,
        y: 24,
        width: 88,
        height: 55,
        confidence: 0.65,
        description: 'Experimental setup/results (heuristic - complete)',
      };
    }

    // Relations/schemas (R1, R2, R3) - generous to capture all arrows and labels
    if (/\b[A-Z]\d+\b/.test(questionText)) {
      return {
        x: 7,
        y: 26,
        width: 86,
        height: 52,
        confidence: 0.7,
        description: 'Labeled diagram with relations (heuristic - complete with labels)',
      };
    }

    // Default: Large generous region focused on complete visual capture
    return {
      x: 8,
      y: 28,
      width: 84,
      height: 48,
      confidence: 0.5,
      description: 'Visual element (default heuristic - generous crop)',
    };
  }

  /**
   * Crop diagram from page image using detected region
   */
  async cropDiagramFromRegion(
    pageImageBase64: string,
    region: DiagramRegion,
    pageWidth: number,
    pageHeight: number,
  ): Promise<{ base64: string; width: number; height: number } | null> {
    try {
      const pageImageBuffer = Buffer.from(pageImageBase64, 'base64');

      // Convert percentages to pixels
      const cropX = Math.floor((region.x / 100) * pageWidth);
      const cropY = Math.floor((region.y / 100) * pageHeight);
      const cropWidth = Math.floor((region.width / 100) * pageWidth);
      const cropHeight = Math.floor((region.height / 100) * pageHeight);

      // Ensure values are within bounds
      const boundedX = Math.max(0, Math.min(cropX, pageWidth - 1));
      const boundedY = Math.max(0, Math.min(cropY, pageHeight - 1));
      const boundedWidth = Math.max(1, Math.min(cropWidth, pageWidth - boundedX));
      const boundedHeight = Math.max(1, Math.min(cropHeight, pageHeight - boundedY));

      this.logger.log(`Cropping diagram: ${boundedX},${boundedY} ${boundedWidth}x${boundedHeight}`);

      const croppedBuffer = await sharp(pageImageBuffer)
        .extract({
          left: boundedX,
          top: boundedY,
          width: boundedWidth,
          height: boundedHeight,
        })
        .png()
        .toBuffer();

      return {
        base64: croppedBuffer.toString('base64'),
        width: boundedWidth,
        height: boundedHeight,
      };
    } catch (error) {
      this.logger.error('Failed to crop diagram from region:', error);
      return null;
    }
  }

  /**
   * Smart diagram detection using page analysis
   * This analyzes the full page and tries to find diagram-like regions
   */
  async detectDiagramsInPage(pageImageBase64: string): Promise<DiagramRegion[]> {
    try {
      const pageImageBuffer = Buffer.from(pageImageBase64, 'base64');
      const metadata = await sharp(pageImageBuffer).metadata();

      // Simple heuristic: assume diagram is in the top 60% of the page
      // and horizontally centered
      const regions: DiagramRegion[] = [
        {
          x: 15,
          y: 15,
          width: 70,
          height: 45,
          confidence: 0.6,
          description: 'Upper central region',
        },
      ];

      return regions;
    } catch (error) {
      this.logger.error('Failed to detect diagrams in page:', error);
      return [];
    }
  }
}
