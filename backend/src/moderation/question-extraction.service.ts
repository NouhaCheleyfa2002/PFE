import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { PDFDiagramExtractorService } from '../exam-pipeline/pdf-diagram-extractor.service';
import { AIDiagramDetectorService } from '../exam-pipeline/ai-diagram-detector.service';
import { PDFLayoutAnalyzerService } from '../exam-pipeline/pdf-layout-analyzer.service';
import sharp from 'sharp';

export interface ExtractedQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'open' | 'fill_blank' | 'match' | 'image';
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pageNumber?: number;
  questionNumber?: number;
  confidence: number;
  hasVisualContent?: boolean;
  visualContentType?: string;
  visualContextKeywords?: string[];
}

export interface QuestionExtractionResult {
  success: boolean;
  questionsFound: number;
  questions: ExtractedQuestion[];
  error?: string;
}

@Injectable()
export class QuestionExtractionService {
  private readonly logger = new Logger(QuestionExtractionService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(ExamQuestionEntity)
    private readonly questionRepository: Repository<ExamQuestionEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    private readonly pdfDiagramExtractor: PDFDiagramExtractorService,
    private readonly aiDiagramDetector: AIDiagramDetectorService,
    private readonly layoutAnalyzer: PDFLayoutAnalyzerService,
  ) {}

  /**
   * Extract questions from document text using AI
   */
  async extractQuestions(
    text: string,
    subject?: string,
    gradeLevel?: string
  ): Promise<QuestionExtractionResult> {
    try {
      this.logger.log('Extracting questions from document...');

      // Truncate text if too long (first 15000 chars)
      const truncatedText = text.substring(0, 15000);

      const systemPrompt = `You are an expert in analyzing educational documents and extracting questions. Extract questions from exams, quizzes, and worksheets. Be concise and return valid JSON only.`;

      const userPrompt = `Extract questions from this document. Return ONLY valid JSON, no markdown, no explanations.

Document text (excerpt):
"""
${truncatedText}
"""

Subject: ${subject || 'Unknown'}
Grade Level: ${gradeLevel || 'Unknown'}

Extract up to 30 questions maximum (STRICT LIMIT). For each question:
1. questionText - the actual question
2. questionType - one of: mcq, true_false, open, fill_blank, match, image
3. options - array of answer choices (for MCQ only)
4. correctAnswer - the correct answer if visible
5. explanation - explanation if provided (MAX 30 characters, or omit)
6. difficulty - one of: beginner, intermediate, advanced
7. pageNumber - page number if visible
8. questionNumber - question number
9. confidence - 0.0 to 1.0
10. hasVisualContent - TRUE if question references "graph below", "table above", "diagram shown", etc.
11. visualContentType - if hasVisualContent is true, specify: graph, table, diagram, chart, image, or figure

JSON format:
{
  "questions": [
    {
      "questionText": "What is 2+2?",
      "questionType": "mcq",
      "options": ["A) 3", "B) 4", "C) 5"],
      "correctAnswer": "B) 4",
      "explanation": "Basic addition",
      "difficulty": "beginner",
      "pageNumber": 1,
      "questionNumber": 1,
      "confidence": 0.95,
      "hasVisualContent": false,
      "visualContentType": null
    }
  ]
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, nothing else
- Explanations MAX 30 characters (VERY SHORT or omit!)
- Extract ALL questions found in the document (no limit)
- Set hasVisualContent=true if question mentions:
  * Graphs, tables, diagrams, figures, documents, schemas
  * Symbolic references like "R1, R2, R3" or "C1, C2" or "M1, M2" (labeled elements in diagrams)
  * References to visual elements like "document 1", "figure 2", "schéma", "graphique"
  * Experimental setups: "expériences", "expérience 1 et 2", "résultats"
  * Questions that CANNOT be answered without seeing a visual element
  * Questions asking to "exploiter les résultats" or analyze experiments
- If no questions found, return {"questions": []}`;

      const response = await this.aiService.chat(systemPrompt, userPrompt);
      const cleanedResponse = this.cleanJsonResponse(response);
      
      // Log the raw AI response for debugging
      this.logger.log('AI response (first 500 chars):', cleanedResponse.substring(0, 500));
      
      // Handle case where AI doesn't return valid JSON
      if (!cleanedResponse || cleanedResponse.length === 0) {
        this.logger.warn('AI returned empty response for question extraction');
        return {
          success: false,
          questionsFound: 0,
          questions: [],
          error: 'AI returned empty response',
        };
      }

      let result;
      try {
        result = JSON.parse(cleanedResponse);
      } catch (parseError) {
        this.logger.error('Failed to parse AI response as JSON:', cleanedResponse.substring(0, 200));
        this.logger.error('Parse error details:', parseError.message);
        
        // Try to extract partial JSON if possible
        try {
          // Attempt to fix common JSON issues
          const fixedResponse = this.attemptJsonFix(cleanedResponse);
          result = JSON.parse(fixedResponse);
          this.logger.log('Successfully recovered partial JSON response');
        } catch (recoveryError) {
          this.logger.warn('Could not recover from JSON parse error');
          return {
            success: false,
            questionsFound: 0,
            questions: [],
            error: `Invalid JSON response from AI: ${parseError.message}`,
          };
        }
      }

      // Handle case where AI doesn't find questions
      if (!result || !result.questions || !Array.isArray(result.questions)) {
        this.logger.warn('AI response does not contain questions array');
        return {
          success: true,
          questionsFound: 0,
          questions: [],
        };
      }

      const extractedQuestions: ExtractedQuestion[] = (result.questions || []).map((q: any) => {
        const questionText = q.questionText || q.question_text || q.text || '';
        
        // Log if question text is empty for debugging
        if (!questionText || questionText.trim() === '') {
          this.logger.warn('Empty question text detected:', JSON.stringify(q));
        }
        
        // Detect visual content from question text
        const visualDetection = this.detectVisualContent(questionText);
        
        // Use AI detection if available, otherwise use our pattern matching
        const hasVisualContent = q.hasVisualContent || visualDetection.hasVisual;
        const visualContentType = q.visualContentType || visualDetection.type;
        
        // Log visual content detection
        if (hasVisualContent) {
          this.logger.log(`Visual content detected in question: "${questionText.substring(0, 60)}..." - Type: ${visualContentType}`);
        }
        
        return {
          questionText,
          questionType: this.normalizeQuestionType(q.questionType || q.question_type || q.type || 'open'),
          options: q.options || [],
          correctAnswer: q.correctAnswer || q.correct_answer || q.answer,
          explanation: q.explanation,
          difficulty: this.normalizeDifficulty(q.difficulty || 'intermediate'),
          pageNumber: q.pageNumber || q.page_number || q.page,
          questionNumber: q.questionNumber || q.question_number || q.number,
          confidence: q.confidence || 0.7,
          hasVisualContent,
          visualContentType,
          visualContextKeywords: visualDetection.keywords,
        };
      });

      // Filter out questions with empty text or low confidence (< 60%)
      const filteredQuestions = extractedQuestions.filter(q => {
        if (!q.questionText || q.questionText.trim() === '') {
          this.logger.warn('Filtering out question with empty text');
          return false;
        }
        if (q.confidence < 0.6) {
          this.logger.log(`Filtering out low confidence question: ${q.questionText.substring(0, 50)}...`);
          return false;
        }
        return true;
      });

      this.logger.log(`Extracted ${filteredQuestions.length} questions (${extractedQuestions.length - filteredQuestions.length} filtered out due to low confidence)`);

      return {
        success: true,
        questionsFound: filteredQuestions.length,
        questions: filteredQuestions,
      };
    } catch (error) {
      this.logger.error('Question extraction failed:', error);
      return {
        success: false,
        questionsFound: 0,
        questions: [],
        error: error.message,
      };
    }
  }

  /**
   * Save extracted questions to database
   */
  async saveExtractedQuestions(
    documentId: string,
    questions: ExtractedQuestion[],
    subject?: string,
    gradeLevel?: string,
  ): Promise<number> {
    try {
      this.logger.log(`Saving ${questions.length} questions for document ${documentId}`);
      
      // Validate all questions have required fields
      const validQuestions = questions.filter(q => {
        if (!q.questionText || q.questionText.trim() === '') {
          this.logger.warn('Skipping question with empty text:', q);
          return false;
        }
        return true;
      });
      
      if (validQuestions.length === 0) {
        this.logger.warn('No valid questions to save (all questions have empty text)');
        return 0;
      }
      
      this.logger.log(`${validQuestions.length} of ${questions.length} questions are valid`);
      
      // Fetch document to get OCR data if needed (for visual content)
      let ocrData: any = null;
      const hasVisualQuestions = validQuestions.some(q => q.hasVisualContent);
      
      if (hasVisualQuestions) {
        try {
          const document = await this.documentRepository.findOne({
            where: { id: documentId },
          });
          
          if (document && document.ocrResultUrl) {
            this.logger.log(`Fetching OCR data from ${document.ocrResultUrl} for visual content extraction`);
            const ocrResponse = await fetch(document.ocrResultUrl);
            if (ocrResponse.ok) {
              ocrData = await ocrResponse.json();
              this.logger.log('OCR data fetched successfully');
            } else {
              this.logger.warn('Failed to fetch OCR data for visual content');
            }
          } else {
            this.logger.warn('Document has no OCR result URL for visual content');
          }
        } catch (error) {
          this.logger.warn('Could not fetch OCR data for visual content:', error.message);
        }
      }
      
      const questionEntities = validQuestions.map((q, index) => {
        const entity = new ExamQuestionEntity();
        entity.documentId = documentId;
        entity.questionText = q.questionText.trim();
        entity.questionType = q.questionType;
        entity.difficulty = q.difficulty;
        entity.pageNumber = q.pageNumber || null;
        entity.options = q.options && q.options.length > 0 ? q.options : null;
        entity.correctAnswer = q.correctAnswer || null;
        entity.topic = subject || null;
        entity.extractionConfidence = q.confidence;
        entity.extractedAt = new Date();
        entity.status = 'pending'; // Needs review
        entity.bloomTaxonomy = null; // Can be enhanced later
        entity.points = null; // Can be set during review
        entity.reviewedBy = null;
        entity.reviewedAt = null;
        
        // Visual content support
        entity.hasVisualContent = q.hasVisualContent || false;
        entity.visualContentType = q.visualContentType || null;
        entity.visualContextKeywords = q.visualContextKeywords || null;
        
        // Extract visual context from OCR data if available
        if (entity.hasVisualContent && ocrData && entity.pageNumber) {
          const visualContext = this.extractVisualContextFromOcr(
            ocrData,
            entity.pageNumber,
            entity.questionText,
          );
          
          if (visualContext) {
            entity.visualContentRef = JSON.stringify(visualContext);
            if (index === 0 || entity.hasVisualContent) {
              this.logger.log(`Visual context extracted for question: "${entity.questionText.substring(0, 60)}..." - ${visualContext.contextLength} chars, ${visualContext.imageCount} images`);
            }
          } else {
            // Fallback: just store page reference
            entity.visualContentRef = `page:${entity.pageNumber}`;
          }
        } else if (entity.hasVisualContent && entity.pageNumber) {
          // Store page number as visual reference for now
          entity.visualContentRef = `page:${entity.pageNumber}`;
        }
        
        // Debug log first question and any with visual content
        if (index === 0 || entity.hasVisualContent) {
          this.logger.log(`Question entity: text="${entity.questionText.substring(0, 80)}...", hasVisual=${entity.hasVisualContent}, type=${entity.visualContentType}`);
        }
        
        return entity;
      });

      const savedQuestions = await this.questionRepository.save(questionEntities);
      this.logger.log(`Successfully saved ${savedQuestions.length} questions to database`);
      
      // AUTOMATICALLY EXTRACT DIAGRAM IMAGES for questions with visual content
      const visualQuestions = savedQuestions.filter(q => q.hasVisualContent && q.pageNumber);
      if (visualQuestions.length > 0) {
        this.logger.log(`🎨 Extracting diagram images for ${visualQuestions.length} questions with visual content...`);
        // Do this asynchronously - don't wait for it
        this.extractDiagramsForQuestions(documentId, visualQuestions).catch(error => {
          this.logger.error('Failed to extract diagram images in background:', error);
        });
      }
      
      return savedQuestions.length;
    } catch (error) {
      this.logger.error(`Failed to save questions to database:`, error);
      this.logger.error('Error details:', error.stack);
      return 0;
    }
  }
  
  /**
   * Extract visual context from OCR data for a specific question
   */
  private extractVisualContextFromOcr(
    ocrData: any,
    pageNumber: number,
    questionText: string,
  ): { context: string; contextLength: number; pageNumber: number; hasImages: boolean; imageCount: number } | null {
    try {
      if (!ocrData.pages || !Array.isArray(ocrData.pages)) {
        return null;
      }

      // Find the page
      let page = ocrData.pages.find((p: any) => p.pageNumber === pageNumber);
      if (!page) {
        // Try index-based access (0-indexed)
        page = ocrData.pages[pageNumber - 1];
      }
      
      if (!page) {
        return null;
      }

      const pageText = page.text || page.content || '';
      const images = page.images || page.figures || [];
      
      // Try to find question in page text and extract context
      const questionIndex = pageText.indexOf(questionText.substring(0, Math.min(50, questionText.length)));
      
      let context = '';
      if (questionIndex !== -1) {
        // Extract 800 characters before and after the question
        const start = Math.max(0, questionIndex - 800);
        const end = Math.min(pageText.length, questionIndex + questionText.length + 800);
        context = pageText.substring(start, end);
        
        // Expand to complete paragraphs
        context = this.expandToCompleteParagraphs(pageText, start, end);
      } else {
        // Question not found, return first part of page (likely contains relevant context)
        context = pageText.substring(0, 1600);
      }

      return {
        context: context.trim(),
        contextLength: context.length,
        pageNumber,
        hasImages: images.length > 0,
        imageCount: images.length,
      };
    } catch (error) {
      this.logger.error('Failed to extract visual context from OCR:', error);
      return null;
    }
  }
  
  /**
   * Expand text range to complete paragraphs
   */
  private expandToCompleteParagraphs(
    fullText: string,
    start: number,
    end: number,
  ): string {
    // Find previous paragraph break or start
    while (start > 0 && fullText[start] !== '\n' && fullText[start - 1] !== '\n') {
      start--;
    }

    // Find next paragraph break or end
    while (end < fullText.length && fullText[end] !== '\n') {
      end++;
    }

    return fullText.substring(start, end).trim();
  }

  /**
   * Detect if a question references visual content (graphs, tables, diagrams, etc.)
   */
  private detectVisualContent(questionText: string): {
    hasVisual: boolean;
    type: string | null;
    keywords: string[];
  } {
    const lowerText = questionText.toLowerCase();
    
    // Visual reference patterns
    const visualPatterns = [
      // English patterns
      { regex: /\b(graph|chart|diagram|figure|image|picture|illustration)\s+(below|above|shown|presented|displayed)/i, type: 'graph', keyword: 'graph' },
      { regex: /\b(table|chart)\s+(below|above|shown|displayed|following)/i, type: 'table', keyword: 'table' },
      { regex: /\b(diagram|figure|illustration)\s+(below|above|shown)/i, type: 'diagram', keyword: 'diagram' },
      { regex: /\baccording to the (graph|chart|table|diagram|figure)/i, type: 'graph', keyword: 'according to' },
      { regex: /\bbased on the (graph|chart|table|diagram|figure|data)/i, type: 'graph', keyword: 'based on' },
      { regex: /\b(refer to|see|using|from) the (graph|chart|table|diagram|figure)/i, type: 'graph', keyword: 'refer to' },
      { regex: /\bin the (graph|chart|table|diagram) (below|above|shown)/i, type: 'graph', keyword: 'in the' },
      { regex: /\bthe (following|given) (graph|chart|table|diagram)/i, type: 'graph', keyword: 'following' },
      
      // French patterns
      { regex: /\b(graphique|diagramme|figure|image|illustration|schéma)\s+(ci-dessous|ci-dessus|suivant|présenté)/i, type: 'graph', keyword: 'graphique' },
      { regex: /\b(tableau)\s+(ci-dessous|ci-dessus|suivant)/i, type: 'table', keyword: 'tableau' },
      { regex: /\bd'après (le|la) (graphique|tableau|diagramme|figure)/i, type: 'graph', keyword: "d'après" },
      { regex: /\bselon (le|la) (graphique|tableau|diagramme)/i, type: 'graph', keyword: 'selon' },
      { regex: /\ben se référant (au|à la) (graphique|tableau|diagramme)/i, type: 'graph', keyword: 'se référant' },
      
      // Arabic patterns
      { regex: /\b(الرسم|الشكل|الجدول|الصورة|المخطط)\s+(التالي|أعلاه|أدناه|الموضح)/i, type: 'graph', keyword: 'الرسم' },
      { regex: /\b(بناء على|وفقا ل|حسب|من خلال)\s+(الرسم|الشكل|الجدول)/i, type: 'graph', keyword: 'بناء على' },
      
      // Generic patterns that indicate visual is needed
      { regex: /\b(shown|illustrated|presented|displayed|depicted)\s+(in|on|by)/i, type: 'image', keyword: 'shown' },
      { regex: /\b(voir|see|انظر)\s+(figure|figure|شكل)/i, type: 'image', keyword: 'see' },
    ];
    
    const detectedKeywords: string[] = [];
    let visualType: string | null = null;
    
    for (const pattern of visualPatterns) {
      if (pattern.regex.test(questionText)) {
        detectedKeywords.push(pattern.keyword);
        if (!visualType) {
          visualType = pattern.type;
        }
      }
    }
    
    return {
      hasVisual: detectedKeywords.length > 0,
      type: visualType,
      keywords: detectedKeywords,
    };
  }

  /**
   * Normalize question type to valid enum value
   */
  private normalizeQuestionType(type: string): 'mcq' | 'true_false' | 'open' | 'fill_blank' | 'match' | 'image' {
    const normalized = type.toLowerCase().replace(/[-_\s]/g, '');
    
    if (normalized.includes('mcq') || normalized.includes('multiplechoice')) return 'mcq';
    if (normalized.includes('truefalse') || normalized.includes('tf')) return 'true_false';
    if (normalized.includes('fillblank') || normalized.includes('fill')) return 'fill_blank';
    if (normalized.includes('match')) return 'match';
    if (normalized.includes('image') || normalized.includes('picture')) return 'image';
    
    return 'open';
  }

  /**
   * Get count of extracted questions for a document
   */
  async getQuestionCount(documentId: string): Promise<number> {
    try {
      return await this.questionRepository.count({ where: { documentId } });
    } catch (error) {
      this.logger.error(`Failed to get question count for document ${documentId}:`, error);
      return 0;
    }
  }

  /**
   * Re-extract diagrams for all questions with visual content in a document
   * PUBLIC method for manual triggering
   */
  async reExtractDiagramsForDocument(documentId: string): Promise<{ success: boolean; processed: number; error?: string }> {
    try {
      this.logger.log(`🔄 Re-extracting diagrams for document: ${documentId}`);
      
      // Find all questions with visual content for this document
      const questions = await this.questionRepository.find({
        where: {
          documentId,
          hasVisualContent: true,
        },
      });

      if (questions.length === 0) {
        return {
          success: true,
          processed: 0,
          error: 'No questions with visual content found',
        };
      }

      this.logger.log(`Found ${questions.length} questions with visual content - starting extraction`);

      // Trigger extraction
      await this.extractDiagramsForQuestions(documentId, questions);

      return {
        success: true,
        processed: questions.length,
      };
    } catch (error) {
      this.logger.error('Re-extraction failed:', error);
      return {
        success: false,
        processed: 0,
        error: error.message,
      };
    }
  }

  /**
   * Normalize difficulty to valid enum value
   */
  private normalizeDifficulty(difficulty: string): 'beginner' | 'intermediate' | 'advanced' {
    const normalized = difficulty.toLowerCase();
    
    if (normalized.includes('beginner') || normalized.includes('easy') || normalized.includes('basic')) return 'beginner';
    if (normalized.includes('advanced') || normalized.includes('hard') || normalized.includes('difficult')) return 'advanced';
    
    return 'intermediate';
  }

  /**
   * Clean JSON response from AI
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Attempt to fix common JSON errors in AI responses
   * Enhanced to handle truncated responses with incomplete strings
   */
  private attemptJsonFix(jsonString: string): string {
    let fixed = jsonString.trim();
    
    // Step 1: Remove any unterminated strings at the end
    // Look for the last properly closed string (ending with ")
    const lastProperStringEnd = this.findLastCompleteStringPosition(fixed);
    if (lastProperStringEnd > 0 && lastProperStringEnd < fixed.length - 1) {
      // There's content after the last complete string that might be garbage
      const afterLastString = fixed.substring(lastProperStringEnd);
      
      // If the content after last string doesn't have proper structure, remove it
      if (afterLastString.includes('"') && !this.isValidJsonFragment(afterLastString)) {
        fixed = fixed.substring(0, lastProperStringEnd);
        this.logger.log(`Removed incomplete JSON fragment: "${afterLastString.substring(0, 50)}..."`);
      }
    }
    
    // Step 2: Try to find the last complete question by looking for the "confidence" field
    const confidenceMatches = [...fixed.matchAll(/"confidence":\s*([\d.]+)/g)];
    
    if (confidenceMatches.length > 0) {
      // Get the position after the last complete confidence field
      const lastMatch = confidenceMatches[confidenceMatches.length - 1];
      const lastGoodPosition = lastMatch.index! + lastMatch[0].length;
      
      // Cut off everything after the last complete question
      fixed = fixed.substring(0, lastGoodPosition);
      
      // Step 3: Properly close the JSON structure
      // Close the question object
      if (!fixed.trim().endsWith('}')) {
        fixed += '}';
      }
      
      // Close the questions array
      if (!fixed.includes(']}')) {
        fixed += ']';
      }
      
      // Close the main object
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      
      this.logger.log(`JSON recovered: ${confidenceMatches.length} complete questions extracted`);
    } else {
      // Fallback: Try to find any complete field and trim there
      const lastCompleteField = this.findLastCompleteField(fixed);
      
      if (lastCompleteField > 0) {
        fixed = fixed.substring(0, lastCompleteField);
        this.logger.log(`Recovered by finding last complete field at position ${lastCompleteField}`);
      }
      
      // Close unclosed structures
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/]/g) || []).length;
      
      // Close arrays first
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }
      
      // Then close objects
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      
      this.logger.warn(`JSON recovery fallback: closed ${openBrackets - closeBrackets} brackets and ${openBraces - closeBraces} braces`);
    }
    
    return fixed;
  }

  /**
   * Find the position of the last complete string in JSON
   * Returns the position after the closing quote
   */
  private findLastCompleteStringPosition(json: string): number {
    let lastCompletePos = -1;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < json.length; i++) {
      const char = json[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        if (inString) {
          // String ended
          lastCompletePos = i + 1;
          inString = false;
        } else {
          // String started
          inString = true;
        }
      }
    }
    
    return lastCompletePos;
  }

  /**
   * Check if a JSON fragment has valid structure
   */
  private isValidJsonFragment(fragment: string): boolean {
    // Valid fragments should have balanced quotes and brackets
    const quoteCount = (fragment.match(/(?<!\\)"/g) || []).length;
    const openBraces = (fragment.match(/{/g) || []).length;
    const closeBraces = (fragment.match(/}/g) || []).length;
    const openBrackets = (fragment.match(/\[/g) || []).length;
    const closeBrackets = (fragment.match(/]/g) || []).length;
    
    return quoteCount % 2 === 0 && openBraces === closeBraces && openBrackets === closeBrackets;
  }

  /**
   * Find the position of the last complete field (key: value pair)
   * Returns position after the value (could be after comma, number, boolean, or closing bracket/brace)
   */
  private findLastCompleteField(json: string): number {
    // Look for patterns like: "field": value, or "field": value}
    // Values can be: numbers, booleans, strings, arrays, objects
    
    // Find all complete field patterns
    const fieldPatterns = [
      /"[\w]+"\s*:\s*[\d.]+\s*[,}\]]/g,           // number values
      /"[\w]+"\s*:\s*(true|false)\s*[,}\]]/g,     // boolean values
      /"[\w]+"\s*:\s*"[^"]*"\s*[,}\]]/g,          // string values
      /"[\w]+"\s*:\s*\[[^\]]*\]\s*[,}\]]/g,       // array values
      /"[\w]+"\s*:\s*null\s*[,}\]]/g,             // null values
    ];
    
    let lastPosition = -1;
    
    for (const pattern of fieldPatterns) {
      const matches = [...json.matchAll(pattern)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const endPos = lastMatch.index! + lastMatch[0].length - 1; // -1 to not include the delimiter
        if (endPos > lastPosition) {
          lastPosition = endPos;
        }
      }
    }
    
    return lastPosition;
  }

  /**
   * Detect if document contains questions (heuristic)
   */
  isLikelyExamOrQuiz(text: string, title: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Keywords that indicate exam/quiz content
    const examKeywords = [
      'exam', 'test', 'quiz', 'qcm', 'exercise', 'exercice',
      'question', 'answer', 'choose', 'select', 'true or false',
      'vrai ou faux', 'choisir', 'répondre', 'complète',
      'what is', 'calculate', 'solve', 'find',
      // Tunisian Bac specific patterns
      'bac', 'baccalauréat', 'principale', 'controle', 'contrôle',
      'session principale', 'session de contrôle', 'epreuve', 'épreuve',
      'devoir', 'composition', 'interrogation',
    ];

    // Tunisian Bac filename patterns (e.g., "Math_2026_Principale.pdf", "Arabe_Economie_et_gestion_2026")
    const bacFilenamePattern = /_\d{4}_(principale|controle|controlle)/i.test(title);
    
    // Check for year + session pattern (common in Tunisian exams)
    const hasYearSession = /\b(20\d{2})\s*(principale|contrôle|controle|bac)/i.test(title);

    // Check title
    const titleHasKeywords = examKeywords.some(keyword => lowerTitle.includes(keyword));

    // Check text for question patterns
    const hasQuestionMarks = (text.match(/\?/g) || []).length >= 3;
    const hasNumberedQuestions = /\b(question|q\.?|سؤال)\s*\d+/i.test(text); // Added Arabic word for question
    const hasMultipleChoice = /[a-d]\)\s+\w+/i.test(text);
    const hasKeywords = examKeywords.some(keyword => lowerText.includes(keyword));

    const isLikelyExam = titleHasKeywords || 
                         bacFilenamePattern || 
                         hasYearSession ||
                         hasQuestionMarks || 
                         hasNumberedQuestions || 
                         hasMultipleChoice || 
                         hasKeywords;
    
    // Log detection for debugging
    this.logger.log(`Exam detection for "${title.substring(0, 50)}": ${isLikelyExam} (bacPattern=${bacFilenamePattern}, yearSession=${hasYearSession}, keywords=${titleHasKeywords})`);
    
    return isLikelyExam;
  }

  /**
   * Extract diagram images for questions with visual content (background task)
   * This runs asynchronously after questions are saved
   * IMPROVED: Extract specific diagram for each question based on position
   */
  private async extractDiagramsForQuestions(
    documentId: string,
    questions: ExamQuestionEntity[],
  ): Promise<void> {
    try {
      this.logger.log(`📸 Starting layout-aware diagram extraction for ${questions.length} questions...`);
      
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (!document || !document.ocrResultUrl) {
        this.logger.warn('Document or OCR data not available for diagram extraction');
        return;
      }

      const ocrResponse = await fetch(document.ocrResultUrl);
      if (!ocrResponse.ok) {
        this.logger.warn('Failed to fetch OCR result for diagram extraction');
        return;
      }

      const ocrData = await ocrResponse.json();

      const questionsByPage = new Map<number, ExamQuestionEntity[]>();
      for (const question of questions) {
        if (question.pageNumber) {
          const pageQuestions = questionsByPage.get(question.pageNumber) || [];
          pageQuestions.push(question);
          questionsByPage.set(question.pageNumber, pageQuestions);
        }
      }

      this.logger.log(`📄 Processing ${questionsByPage.size} pages with layout analysis`);

      for (const [pageNumber, pageQuestions] of questionsByPage.entries()) {
        try {
          this.logger.log(`🎨 Page ${pageNumber}: Extracting layout for ${pageQuestions.length} questions`);
          
          const pageData = ocrData.pages?.find((p: any) => p.pageNumber === pageNumber) || 
                          ocrData.pages?.[pageNumber - 1];

          if (!pageData) {
            this.logger.warn(`No OCR data for page ${pageNumber}`);
            continue;
          }

          const pageImageBase64 = await this.pdfDiagramExtractor.renderPDFPageAsImage(
            document.storageUrl,
            pageNumber,
          );

          if (!pageImageBase64) {
            this.logger.error(`Failed to render page ${pageNumber}`);
            continue;
          }

          const pageImageBuffer = Buffer.from(pageImageBase64, 'base64');
          const imageMetadata = await sharp(pageImageBuffer).metadata();
          const pageWidth = imageMetadata.width || 1200;
          const pageHeight = imageMetadata.height || 1600;

          const pageText = pageData.text || pageData.content || '';

          // ALWAYS use AI detection - OCR regions are unreliable
          this.logger.log(`🤖 Using AI detection for all questions on page ${pageNumber}`);
          
          for (const question of pageQuestions) {
            try {
              this.logger.log(`Processing: "${question.questionText.substring(0, 60)}..."`);
              
              // Use AI to detect diagram location
              const aiRegion = await this.aiDiagramDetector.detectDiagramRegion(
                pageImageBase64,
                question.questionText,
                pageWidth,
                pageHeight,
                pageText,
              );

              if (aiRegion && aiRegion.confidence > 0.4) {
                this.logger.log(`✅ AI detected diagram (confidence ${aiRegion.confidence}): ${aiRegion.description}`);
                
                // Crop using AI detection (coordinates are percentages)
                const croppedDiagram = await this.aiDiagramDetector.cropDiagramFromRegion(
                  pageImageBase64,
                  aiRegion,
                  pageWidth,
                  pageHeight,
                );

                if (croppedDiagram) {
                  let visualContent: any = {};
                  if (question.visualContentRef) {
                    try {
                      visualContent = JSON.parse(question.visualContentRef);
                    } catch {
                      visualContent = { context: question.visualContentRef };
                    }
                  }

                  visualContent.diagrams = [{
                    imageData: croppedDiagram.base64,
                    mimeType: 'image/png',
                    width: croppedDiagram.width,
                    height: croppedDiagram.height,
                    type: 'diagram',
                  }];
                  visualContent.diagramCount = 1;
                  visualContent.diagramsExtractedAt = new Date().toISOString();
                  visualContent.extractionMethod = 'ai-detection';
                  visualContent.aiConfidence = aiRegion.confidence;

                  await this.questionRepository.update(question.id, {
                    visualContentRef: JSON.stringify(visualContent),
                  });

                  this.logger.log(`✨ Extracted diagram for "${question.questionText.substring(0, 50)}..."`);
                } else {
                  this.logger.warn(`❌ Failed to crop diagram for "${question.questionText.substring(0, 50)}..."`);
                }
              } else {
                this.logger.warn(`❌ Low AI confidence (${aiRegion?.confidence || 0}) for "${question.questionText.substring(0, 50)}..."`);
              }
            } catch (error) {
              this.logger.error(`Failed to process question ${question.id}:`, error.message);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to process page ${pageNumber}:`, error);
        }
      }

      this.logger.log(`🎉 Layout-aware extraction completed`);
    } catch (error) {
      this.logger.error('Failed to extract diagrams:', error);
    }
  }

  private extractLabelsFromOCR(text: string): string[] {
    const labels: string[] = [];
    const patterns = [
      /Document\s+\d+/gi,
      /Figure\s+\d+/gi,
      /Schéma\s+\d+/gi,
      /Expérience\s+\d+/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (!labels.includes(match[0])) {
          labels.push(match[0]);
        }
      }
    }

    return labels;
  }
}
