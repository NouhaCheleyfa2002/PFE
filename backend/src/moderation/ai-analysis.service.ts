import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

export interface SafetyAnalysis {
  safe: boolean;
  score: number; // 0-100
  confidence: number;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

export interface SubjectDetection {
  subject: string;
  category: string;
  confidence: number;
  gradeLevel?: string;
  language?: string;
  bacSection?: string | null;
}

export interface QualityAssessment {
  score: number; // 0-100
  issues: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  completenessScore: number;
  languageQualityScore: number;
}

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Analyze document for safety concerns
   */
  async analyzeSafety(text: string): Promise<SafetyAnalysis> {
    this.logger.log('Analyzing document safety with AI');

    const systemPrompt = `You are a content moderation expert for educational platforms. Analyze documents for safety concerns.`;

    const userPrompt = `Analyze this educational document for safety concerns and return ONLY valid JSON:

Document text (first 3000 chars):
${text.substring(0, 3000)}

Check for:
- Hate speech
- Harassment
- Sexual content
- Violent content
- Offensive language
- Racism or discrimination
- Extremism

Return this exact JSON structure:
{
  "safe": true/false,
  "score": 0-100,
  "confidence": 0.00-1.00,
  "issues": [
    {
      "type": "hate_speech|harassment|sexual|violence|offensive|racism|extremism",
      "severity": "low|medium|high|critical",
      "description": "brief description"
    }
  ]
}`;

    try {
      const response = await this.aiService.chat(userPrompt, systemPrompt);
      const parsed = this.parseJSONResponse(response);
      
      return {
        safe: parsed.safe !== false,
        score: parsed.score || (parsed.safe ? 100 : 50),
        confidence: parsed.confidence || 0.95,
        issues: parsed.issues || [],
      };
    } catch (error) {
      this.logger.error('Safety analysis failed:', error);
      // Default to safe with low confidence if AI fails
      return {
        safe: true,
        score: 85,
        confidence: 0.5,
        issues: [],
      };
    }
  }

  /**
   * Detect subject and category
   */
  async detectSubject(text: string): Promise<SubjectDetection> {
    this.logger.log('Detecting document subject with AI');

    const systemPrompt = `You are an educational content classifier for Tunisian education system. Identify the subject and grade level of documents.`;

    const userPrompt = `Analyze this educational document and identify its subject. Return ONLY valid JSON:

Document text (first 2000 chars):
${text.substring(0, 2000)}

Return this exact JSON structure:
{
  "subject": "Mathematics|Physics|Chemistry|SVT|Computer Science|Arabic|French|English|History|Geography|Philosophy|Economics|Other",
  "category": "Science|Languages|Humanities|Mathematics|Computer Science|Arts|Other",
  "confidence": 0.00-1.00,
  "gradeLevel": "Primary|Middle School|Secondary|1st Secondary|2nd Secondary|3rd Secondary|Bac|University",
  "language": "ar|fr|en",
  "bacSection": "svt|math|technique|info|economie|lettres|sport|null"
}

IMPORTANT FOR TUNISIAN SYSTEM:
- Use "SVT" (Sciences de la Vie et de la Terre) instead of "Biology" or "Geology"
- SVT covers both life sciences and earth sciences
- Bac is the 4th and final year of secondary (after 1st, 2nd, 3rd Secondary)
- Students choose orientation after 2nd Secondary for 3rd Secondary and Bac
- If document is for "3rd Secondary" or "Bac", identify the section:
  * "svt" = Sciences Expérimentales (SVT, Biology, Geology, Life Sciences, Earth Sciences)
  * "math" = Mathématiques
  * "technique" = Technical Sciences (Engineering)
  * "info" = Sciences Informatiques (Programming, CS)
  * "economie" = Économie & Gestion (Economics, Accounting, Management)
  * "lettres" = Letters/Humanities (Philosophy, Literature)
  * "sport" = Sports
- For other levels (Primary, 1st/2nd Secondary), set bacSection to null`;

    try {
      const response = await this.aiService.chat(userPrompt, systemPrompt);
      const parsed = this.parseJSONResponse(response);
      
      // Normalize subject: map Biology/Geology to SVT
      let normalizedSubject = parsed.subject || 'Other';
      if (normalizedSubject.toLowerCase().includes('biology') || 
          normalizedSubject.toLowerCase().includes('geology') ||
          normalizedSubject.toLowerCase().includes('life science') ||
          normalizedSubject.toLowerCase().includes('earth science')) {
        normalizedSubject = 'SVT';
      }
      
      return {
        subject: normalizedSubject,
        category: parsed.category || 'Other',
        confidence: parsed.confidence || 0.7,
        gradeLevel: parsed.gradeLevel,
        language: parsed.language,
        bacSection: parsed.bacSection || null,
      };
    } catch (error) {
      this.logger.error('Subject detection failed:', error);
      return {
        subject: 'Other',
        category: 'Other',
        confidence: 0.3,
      };
    }
  }

  /**
   * Assess document quality
   */
  async assessQuality(text: string, ocrData?: any): Promise<QualityAssessment> {
    this.logger.log('Assessing document quality with AI');

    const systemPrompt = `You are a document quality analyst for educational content. Evaluate document quality.`;

    const userPrompt = `Evaluate the quality of this educational document. Return ONLY valid JSON:

Document text (first 2000 chars):
${text.substring(0, 2000)}

Check for:
- Grammar and spelling errors
- Readability
- Structure and formatting
- Completeness (missing pages, blank pages)
- OCR errors or unreadable text

Return this exact JSON structure:
{
  "score": 0-100,
  "completenessScore": 0-100,
  "languageQualityScore": 0-100,
  "issues": [
    {
      "type": "grammar|spelling|ocr|formatting|completeness|readability",
      "severity": "low|medium|high",
      "description": "brief description"
    }
  ]
}`;

    try {
      const response = await this.aiService.chat(userPrompt, systemPrompt);
      const parsed = this.parseJSONResponse(response);
      
      return {
        score: parsed.score || 80,
        completenessScore: parsed.completenessScore || 85,
        languageQualityScore: parsed.languageQualityScore || 80,
        issues: parsed.issues || [],
      };
    } catch (error) {
      this.logger.error('Quality assessment failed:', error);
      return {
        score: 75,
        completenessScore: 80,
        languageQualityScore: 75,
        issues: [],
      };
    }
  }

  /**
   * Parse JSON from AI response, handling markdown code blocks
   */
  private parseJSONResponse(response: string): any {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.warn('Failed to parse AI response as JSON:', response.substring(0, 200));
      throw error;
    }
  }

  /**
   * Detect Personal Identifiable Information (PII) in document
   */
  async detectPII(text: string): Promise<PIIDetection> {
    this.logger.log('Detecting PII in document');

    // Truncate text for analysis
    const truncatedText = text.substring(0, 5000);

    const systemPrompt = `You are a privacy compliance expert. Detect personal identifiable information (PII) in documents.`;

    const userPrompt = `Analyze this document for PII and return ONLY valid JSON:

Document text:
"""
${truncatedText}
"""

Detect:
- Student names
- Teacher names (unless clearly labeled as author)
- Email addresses
- Phone numbers
- Student IDs
- Addresses
- National IDs or SSNs

Return JSON format:
{
  "found": true|false,
  "piiItems": [
    {
      "type": "name|email|phone|id|address",
      "value": "detected value (partially redacted)",
      "location": "where found in document",
      "confidence": 0.0-1.0
    }
  ],
  "score": 0-100 (100 = no PII, 0 = lots of PII)
}`;

    try {
      const response = await this.aiService.chat(systemPrompt, userPrompt);
      const cleanedResponse = this.cleanJsonResponse(response);
      const result = JSON.parse(cleanedResponse);

      return {
        found: result.found || false,
        piiItems: result.piiItems || [],
        score: result.score || 100,
      };
    } catch (error) {
      this.logger.error('PII detection failed:', error);
      // Return safe default
      return {
        found: false,
        piiItems: [],
        score: 100,
      };
    }
  }

  /**
   * Detect difficulty level of educational content
   */
  async detectDifficulty(text: string): Promise<DifficultyLevel> {
    this.logger.log('Detecting difficulty level');

    const truncatedText = text.substring(0, 3000);

    const systemPrompt = `You are an educational content expert. Analyze the difficulty level of educational materials.`;

    const userPrompt = `Analyze this educational content and determine difficulty level. Return ONLY valid JSON:

Content:
"""
${truncatedText}
"""

Consider:
- Vocabulary complexity
- Concept difficulty
- Prerequisites needed
- Sentence structure
- Technical terminology

Return JSON format:
{
  "level": "beginner|intermediate|advanced",
  "score": 1-10 (1=very easy, 10=very difficult),
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.aiService.chat(systemPrompt, userPrompt);
      const cleanedResponse = this.cleanJsonResponse(response);
      const result = JSON.parse(cleanedResponse);

      return {
        level: result.level || 'intermediate',
        score: result.score || 5,
        reasoning: result.reasoning || 'Unable to determine',
      };
    } catch (error) {
      this.logger.error('Difficulty detection failed:', error);
      return {
        level: 'intermediate',
        score: 5,
        reasoning: 'Analysis failed',
      };
    }
  }

  /**
   * Generate learning objectives from educational content
   */
  async generateLearningObjectives(text: string): Promise<LearningObjectives> {
    this.logger.log('Generating learning objectives');

    const truncatedText = text.substring(0, 4000);

    const systemPrompt = `You are an educational curriculum designer. Generate clear learning objectives from educational content.`;

    const userPrompt = `Generate 3-5 learning objectives for this educational content. Return ONLY valid JSON:

Content:
"""
${truncatedText}
"""

Use action verbs from Bloom's Taxonomy (understand, analyze, apply, evaluate, create).

Return JSON format:
{
  "objectives": [
    "Students will be able to...",
    "Students will understand...",
    etc.
  ],
  "bloomLevel": "remember|understand|apply|analyze|evaluate|create",
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.aiService.chat(systemPrompt, userPrompt);
      const cleanedResponse = this.cleanJsonResponse(response);
      const result = JSON.parse(cleanedResponse);

      return {
        objectives: result.objectives || [],
        bloomLevel: result.bloomLevel || 'understand',
        confidence: result.confidence || 0.5,
      };
    } catch (error) {
      this.logger.error('Learning objectives generation failed:', error);
      return {
        objectives: [],
        bloomLevel: 'understand',
        confidence: 0,
      };
    }
  }

  /**
   * Clean JSON response from AI (remove markdown code blocks, etc.)
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Extract comprehensive metadata from document content
   * This is used for auto-filling upload forms
   */
  async extractMetadata(text: string, originalFileName: string): Promise<DocumentMetadata> {
    this.logger.log('Extracting document metadata with AI');

    const truncatedText = text.substring(0, 4000);

    const systemPrompt = `You are an expert educational content analyzer for Tunisian education system. Extract metadata from documents accurately.`;

    const userPrompt = `Analyze this educational document and extract metadata. Return ONLY valid JSON:

Original filename: ${originalFileName}

Document text:
"""
${truncatedText}
"""

TUNISIAN EDUCATION CONTEXT:
- Education levels: Primary (1st-6th Year), Middle School (7th-9th Year), Secondary (1st-4th Secondary)
- Bac = 4th Secondary (final year)
- After 2nd Secondary, students choose a section for 3rd Secondary and Bac
- Sections: SVT (Sciences de la Vie et de la Terre), Math, Technique (Engineering), Info (CS), Economie (Economics), Lettres (Humanities), Sport
- USE "SVT" for Biology, Geology, Life Sciences, Earth Sciences (NOT "Biology" or "Geology")
- Common subjects: Mathematics, Physics, Chemistry, SVT, Computer Science, Arabic, French, English, History, Geography, Philosophy, Economics, Islamic Studies, Technology, Sports

Extract:
1. Title: Clear, descriptive title (e.g., "Mathematics - Derivatives Chapter", "2024 Bac Math Exam - Main Session")
2. Subject: The academic subject (USE "SVT" for biology/geology content)
3. Class Level: Education level (Primary, Middle School, 1st Secondary, 2nd Secondary, 3rd Secondary, Bac)
4. Resource Type: "course" for lessons/notes/exercises OR "exam" for tests/exams/corrections
5. Bac Section: If level is "3rd Secondary" or "Bac", identify section (svt, math, technique, info, economie, lettres, sport), otherwise null
6. Keywords: 5-7 relevant tags (e.g., ["derivatives", "calculus", "limits", "functions"])
7. Description: 1-2 sentence summary
8. Year: Extract year if mentioned (e.g., 2024, 2023), otherwise null

EXAM DETECTION RULES:
- Keywords indicating exam: "examen", "exam", "contrôle", "devoir", "test", "évaluation", "concours", "correction", "corrigé", "bac", "principale", "controle", "rattrapage"
- Filename patterns: *_2024_Principale.pdf, *_exam_*.pdf, Bac_Math_2023.pdf
- If document contains questions/answers structure, it's likely an exam

Return this exact JSON structure:
{
  "title": "extracted title",
  "subject": "Mathematics|Physics|Chemistry|SVT|Computer Science|Arabic|French|English|History|Geography|Philosophy|Economics|Islamic Studies|Technology|Sports|Other",
  "classLevel": "1st Primary Year|2nd Primary Year|3rd Primary Year|4th Primary Year|5th Primary Year|6th Primary Year|7th Year|8th Year|9th Year|1st Secondary|2nd Secondary|3rd Secondary|Bac",
  "resourceType": "course|exam",
  "bacSection": "svt|math|technique|info|economie|lettres|sport|null",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "description": "Brief 1-2 sentence description of content",
  "year": 2024 or null,
  "confidence": 0.0-1.0
}`;

    try {
      const response = await this.aiService.chat(userPrompt, systemPrompt);
      this.logger.log(`[Metadata] AI response length: ${response.length}`);
      this.logger.log(`[Metadata] AI response preview: ${response.substring(0, 500)}`);
      
      const parsed = this.parseJSONResponse(response);
      this.logger.log(`[Metadata] Parsed JSON: ${JSON.stringify(parsed)}`);
      
      // Normalize subject: map Biology/Geology to SVT
      let normalizedSubject = parsed.subject || 'Other';
      if (normalizedSubject.toLowerCase().includes('biology') || 
          normalizedSubject.toLowerCase().includes('geology') ||
          normalizedSubject.toLowerCase().includes('life science') ||
          normalizedSubject.toLowerCase().includes('earth science')) {
        normalizedSubject = 'SVT';
        this.logger.log(`[Metadata] Normalized subject from ${parsed.subject} to SVT`);
      }
      
      const result = {
        title: parsed.title || this.fallbackTitle(originalFileName),
        subject: normalizedSubject,
        classLevel: parsed.classLevel || 'Bac',
        resourceType: parsed.resourceType || 'course',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        description: parsed.description || 'Educational resource',
        year: parsed.year || null,
        bacSection: parsed.bacSection === 'null' ? null : (parsed.bacSection || null),
        confidence: parsed.confidence || 0.7,
      };
      
      this.logger.log(`[Metadata] Final result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('[Metadata] Extraction failed:', error);
      this.logger.error('[Metadata] Error stack:', error.stack);
      // Return fallback metadata
      const fallback = {
        title: this.fallbackTitle(originalFileName),
        subject: 'Other',
        classLevel: 'Bac',
        resourceType: this.detectResourceTypeFromFilename(originalFileName),
        keywords: [],
        description: 'Educational resource',
        year: this.extractYearFromFilename(originalFileName),
        bacSection: null,
        confidence: 0.3,
      };
      this.logger.log(`[Metadata] Using fallback: ${JSON.stringify(fallback)}`);
      return fallback;
    }
  }

  /**
   * Generate fallback title from filename
   */
  private fallbackTitle(filename: string): string {
    // Remove extension
    let title = filename.replace(/\.(pdf|docx|pptx)$/i, '');
    
    // Replace underscores and hyphens with spaces
    title = title.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    title = title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return title;
  }

  /**
   * Detect resource type from filename
   */
  private detectResourceTypeFromFilename(filename: string): 'course' | 'exam' {
    const lowerFilename = filename.toLowerCase();
    const examKeywords = ['exam', 'examen', 'test', 'bac', 'controle', 'devoir', 'correction', 'corrige'];
    
    for (const keyword of examKeywords) {
      if (lowerFilename.includes(keyword)) {
        return 'exam';
      }
    }
    
    return 'course';
  }

  /**
   * Extract year from filename
   */
  private extractYearFromFilename(filename: string): number | null {
    const yearMatch = filename.match(/20\d{2}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : null;
  }
}

export interface PIIDetection {
  found: boolean;
  piiItems: Array<{
    type: 'email' | 'phone' | 'name' | 'id' | 'address' | 'ssn';
    value: string;
    location: string;
    confidence: number;
  }>;
  score: number;
}

export interface DifficultyLevel {
  level: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  reasoning: string;
}

export interface LearningObjectives {
  objectives: string[];
  bloomLevel: string;
  confidence: number;
}

export interface DocumentMetadata {
  title: string;
  subject: string;
  classLevel: string;
  resourceType: 'course' | 'exam';
  keywords: string[];
  description: string;
  year: number | null;
  bacSection: string | null;
  confidence: number;
}

