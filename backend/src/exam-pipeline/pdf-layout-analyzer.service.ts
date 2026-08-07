import { Injectable, Logger } from '@nestjs/common';
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

export interface LayoutElement {
  type: 'text' | 'image' | 'figure';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  pageNumber: number;
}

export interface QuestionContext {
  questionText: string;
  questionBounds: LayoutElement;
  nearbyImages: Array<{
    element: LayoutElement;
    distance: number;
    relativePosition: 'above' | 'below' | 'left' | 'right';
    containsLabels?: string[];
  }>;
}

@Injectable()
export class PDFLayoutAnalyzerService {
  private readonly logger = new Logger(PDFLayoutAnalyzerService.name);

  /**
   * Extract layout information from PDF page
   * This gives us text positions, not just text content
   */
  async extractPageLayout(pdfUrl: string, pageNumber: number): Promise<LayoutElement[]> {
    try {
      this.logger.log(`Extracting layout from page ${pageNumber}`);

      // Download PDF
      const response = await fetch(pdfUrl);
      const pdfBuffer = await response.arrayBuffer();
      const pdfData = new Uint8Array(pdfBuffer);

      // Load PDF
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(pageNumber);

      // Get text content with positions
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const elements: LayoutElement[] = [];

      // Extract text elements with their positions
      for (const item of textContent.items) {
        if (item.str && item.str.trim()) {
          const transform = item.transform;
          elements.push({
            type: 'text',
            x: transform[4],
            y: viewport.height - transform[5], // Flip Y coordinate
            width: item.width,
            height: item.height,
            content: item.str,
            pageNumber,
          });
        }
      }

      await pdfDocument.destroy();

      this.logger.log(`Extracted ${elements.length} text elements from page ${pageNumber}`);
      return elements;
    } catch (error) {
      this.logger.error(`Failed to extract layout from page ${pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Find question boundaries in layout
   * Questions usually start with numbers or specific patterns
   */
  findQuestionBounds(
    elements: LayoutElement[],
    questionText: string,
  ): LayoutElement | null {
    // Find the first text element containing the question start
    const questionStart = questionText.substring(0, 50);
    
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      if (elem.content && questionStart.includes(elem.content.substring(0, 20))) {
        // Found the question start - estimate its bounds
        // Look ahead to find where question likely ends
        let maxX = elem.x + elem.width;
        let maxY = elem.y + elem.height;
        let minX = elem.x;
        let minY = elem.y;

        // Collect nearby text that's part of the question
        for (let j = i; j < Math.min(i + 50, elements.length); j++) {
          const next = elements[j];
          if (next.y > elem.y + 100) break; // Too far down
          
          maxX = Math.max(maxX, next.x + next.width);
          maxY = Math.max(maxY, next.y + next.height);
          minX = Math.min(minX, next.x);
        }

        return {
          type: 'text',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          content: questionText,
          pageNumber: elem.pageNumber,
        };
      }
    }

    return null;
  }

  /**
   * Find image regions using OCR bounding boxes
   */
  findImageRegions(
    ocrData: any,
    pageNumber: number,
    pageHeight: number,
  ): LayoutElement[] {
    const images: LayoutElement[] = [];

    const pageData = ocrData.pages?.find((p: any) => p.pageNumber === pageNumber) ||
                     ocrData.pages?.[pageNumber - 1];

    if (!pageData) return images;

    // Extract figures from OCR
    if (pageData.figures && Array.isArray(pageData.figures)) {
      for (const fig of pageData.figures) {
        if (fig.boundingBox && fig.boundingBox.length >= 8) {
          const bbox = fig.boundingBox;
          // Azure OCR format: [x1,y1, x2,y2, x3,y3, x4,y4] normalized
          images.push({
            type: 'figure',
            x: bbox[0],
            y: bbox[1],
            width: bbox[4] - bbox[0],
            height: bbox[5] - bbox[1],
            pageNumber,
          });
        }
      }
    }

    this.logger.log(`Found ${images.length} image regions on page ${pageNumber}`);
    return images;
  }

  /**
   * Calculate distance between two elements
   */
  private calculateDistance(elem1: LayoutElement, elem2: LayoutElement): number {
    const centerX1 = elem1.x + elem1.width / 2;
    const centerY1 = elem1.y + elem1.height / 2;
    const centerX2 = elem2.x + elem2.width / 2;
    const centerY2 = elem2.y + elem2.height / 2;

    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }

  /**
   * Determine relative position
   */
  private getRelativePosition(
    question: LayoutElement,
    image: LayoutElement,
  ): 'above' | 'below' | 'left' | 'right' {
    const questionCenterY = question.y + question.height / 2;
    const imageCenterY = image.y + image.height / 2;
    const questionCenterX = question.x + question.width / 2;
    const imageCenterX = image.x + image.width / 2;

    const verticalDiff = Math.abs(imageCenterY - questionCenterY);
    const horizontalDiff = Math.abs(imageCenterX - questionCenterX);

    if (verticalDiff > horizontalDiff) {
      return imageCenterY < questionCenterY ? 'above' : 'below';
    } else {
      return imageCenterX < questionCenterX ? 'left' : 'right';
    }
  }

  /**
   * Find candidate images for a question
   * Uses spatial proximity and heuristics
   */
  findCandidateImages(
    questionText: string,
    questionBounds: LayoutElement,
    imageRegions: LayoutElement[],
    ocrText: string,
  ): QuestionContext['nearbyImages'] {
    const candidates: QuestionContext['nearbyImages'] = [];

    for (const image of imageRegions) {
      // Skip images on different pages
      if (image.pageNumber !== questionBounds.pageNumber) continue;

      const distance = this.calculateDistance(questionBounds, image);
      const relativePosition = this.getRelativePosition(questionBounds, image);

      // Extract potential labels from OCR text near the image
      const containsLabels = this.extractLabelsNearImage(image, ocrText);

      candidates.push({
        element: image,
        distance,
        relativePosition,
        containsLabels,
      });
    }

    // Sort by distance (closest first)
    candidates.sort((a, b) => a.distance - b.distance);

    // Return top 3 candidates
    return candidates.slice(0, 3);
  }

  /**
   * Extract labels that might be in or near an image
   */
  private extractLabelsNearImage(image: LayoutElement, ocrText: string): string[] {
    const labels: string[] = [];

    // Look for common label patterns
    const labelPatterns = [
      /Document\s+\d+/gi,
      /Figure\s+\d+/gi,
      /Schéma\s+\d+/gi,
      /Tableau\s+\d+/gi,
      /\b([A-Z]\d+)\b/g, // R1, C1, M1, etc.
      /Expérience\s+\d+/gi,
    ];

    for (const pattern of labelPatterns) {
      const matches = ocrText.matchAll(pattern);
      for (const match of matches) {
        if (!labels.includes(match[0])) {
          labels.push(match[0]);
        }
      }
    }

    return labels;
  }

  /**
   * Check if question explicitly references a visual
   * Returns the reference if found
   */
  detectExplicitReference(questionText: string): string | null {
    const referencePatterns = [
      /document\s+(\d+)/i,
      /figure\s+(\d+)/i,
      /schéma\s+(\d+)/i,
      /tableau\s+(\d+)/i,
      /graphique\s+(\d+)/i,
      /expérience\s+(\d+)/i,
    ];

    for (const pattern of referencePatterns) {
      const match = questionText.match(pattern);
      if (match) {
        return match[0]; // Return "Document 1", etc.
      }
    }

    // Check for symbolic references
    const symbols = questionText.match(/\b([A-Z]\d+)\b/g);
    if (symbols && symbols.length >= 2) {
      return `symbols:${symbols.join(',')}`;
    }

    return null;
  }

  /**
   * Match explicit reference to a candidate image
   */
  matchReferenceToCandidate(
    reference: string,
    candidates: QuestionContext['nearbyImages'],
  ): QuestionContext['nearbyImages'][0] | null {
    // Try to match by labels
    for (const candidate of candidates) {
      if (candidate.containsLabels) {
        for (const label of candidate.containsLabels) {
          if (reference.toLowerCase().includes(label.toLowerCase())) {
            this.logger.log(`Matched reference "${reference}" to image with label "${label}"`);
            return candidate;
          }
        }
      }
    }

    // If symbolic reference, prefer images above the question
    if (reference.startsWith('symbols:')) {
      const aboveCandidate = candidates.find(c => c.relativePosition === 'above');
      if (aboveCandidate) {
        this.logger.log(`Matched symbolic reference to image above question`);
        return aboveCandidate;
      }
    }

    // Fallback: return closest candidate
    return candidates[0] || null;
  }

  /**
   * Expand crop region with padding
   * Adds margin around detected region to avoid cutting labels/arrows
   */
  expandCropRegion(
    region: LayoutElement,
    pageWidth: number,
    pageHeight: number,
    paddingPx: number = 40,
  ): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.max(0, region.x - paddingPx),
      y: Math.max(0, region.y - paddingPx),
      width: Math.min(pageWidth - region.x + paddingPx, region.width + 2 * paddingPx),
      height: Math.min(pageHeight - region.y + paddingPx, region.height + 2 * paddingPx),
    };
  }
}
