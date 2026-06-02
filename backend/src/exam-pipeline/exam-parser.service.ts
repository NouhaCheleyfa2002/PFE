import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ParsedQuestion } from './interfaces/exam-pipeline.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExamParserService {
  private readonly logger = new Logger(ExamParserService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * Parse exam text using DeepSeek AI to extract structured questions AND exam metadata
   */
  async parseExamText(
    ocrText: string,
    customPrompt?: string,
  ): Promise<ParsedQuestion[]> {
    if (!ocrText || ocrText.trim() === '') {
      throw new HttpException(
        'OCR text cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Parsing exam text with DeepSeek (length: ${ocrText.length})`,
    );

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = customPrompt || this.buildUserPrompt(ocrText);

    try {
      // Call DeepSeek AI
      const aiResponse = await this.aiService.chat(userPrompt, systemPrompt);

      // Parse the response
      const questions = this.parseAiResponse(aiResponse);

      this.logger.log(`Successfully parsed ${questions.length} questions`);

      return questions;
    } catch (error) {
      this.logger.error('Failed to parse exam text:', error);
      throw new HttpException(
        'Failed to parse exam with AI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract exam metadata (title, level, subject, year) from OCR text using DeepSeek AI
   */
  async extractExamMetadata(ocrText: string): Promise<{
    title: string | null;
    level: string | null;
    subject: string | null;
    year: number | null;
  }> {
    if (!ocrText || ocrText.trim() === '') {
      return { title: null, level: null, subject: null, year: null };
    }

    this.logger.log('Extracting exam metadata with DeepSeek');

    const systemPrompt = this.buildMetadataSystemPrompt();
    const userPrompt = this.buildMetadataUserPrompt(ocrText);

    try {
      const aiResponse = await this.aiService.chat(userPrompt, systemPrompt);
      const metadata = this.parseMetadataResponse(aiResponse);

      this.logger.log('Successfully extracted exam metadata:', metadata);

      return metadata;
    } catch (error) {
      this.logger.error('Failed to extract exam metadata:', error);
      // Return null values instead of failing the entire pipeline
      return { title: null, level: null, subject: null, year: null };
    }
  }

  /**
   * Build the system prompt for DeepSeek
   */
  private buildSystemPrompt(): string {
    return `You are an expert exam parser. Your task is to extract questions from exam documents and return them in a structured JSON format.

Rules:
1. Extract ALL questions from the provided text
2. For multiple choice questions, extract all options
3. Identify the correct answer if marked in the text
4. Determine the topic/subject of each question
5. Estimate difficulty level (easy, medium, hard)
6. Extract any explanations provided
7. Return ONLY valid JSON, no markdown code blocks
8. If a field is not available, use null

Output format:
{
  "questions": [
    {
      "id": "uuid-here",
      "text": "Question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correctAnswer": "B",
      "topic": "Subject/Topic",
      "difficulty": "medium",
      "explanation": "Explanation if available"
    }
  ]
}`;
  }

  /**
   * Build system prompt for metadata extraction
   */
  private buildMetadataSystemPrompt(): string {
    return `You are an expert at extracting metadata from educational exam documents.

Your task is to analyze the exam text and extract:
1. Exam title (full descriptive title)
2. Educational level - MUST be one of these exact values:
   - "1st Year"
   - "2nd Year"
   - "3rd Year"
   - "4th Year"
   - "5th Year"
   - "Master"
   - "Residency"
   
3. Subject - MUST be one of these exact values:
   - "Cardiology"
   - "Neurology"
   - "Pediatrics"
   - "Surgery"
   - "Internal Medicine"
   - "Radiology"
   - "Oncology"
   - "Emergency Medicine"
   
4. Year (numeric year like 2024, 2023)

Rules:
- Look for title/header at the beginning of the document
- Match level to the closest option from the list above
- Match subject to the closest option from the list above
- If the document mentions "1ère année" or "première année" → use "1st Year"
- If the document mentions "2ème année" or "deuxième année" → use "2nd Year"
- If the document mentions "3ème année" or "troisième année" → use "3rd Year"
- If the document mentions "4ème année" or "quatrième année" → use "4th Year"
- If the document mentions "5ème année" or "cinquième année" → use "5th Year"
- If the document mentions "Master", "M1", "M2" → use "Master"
- If the document mentions "Résidanat", "Residency", "Internat" → use "Residency"
- Extract the 4-digit year if present
- Return ONLY valid JSON, no markdown code blocks
- If a field cannot be determined or doesn't match the allowed values, use null

Output format:
{
  "title": "Exam full title",
  "level": "3rd Year",
  "subject": "Cardiology",
  "year": 2024
}`;
  }

  /**
   * Build metadata extraction user prompt
   */
  private buildMetadataUserPrompt(ocrText: string): string {
    // Use first 2000 characters (usually contains metadata)
    const headerText = ocrText.substring(0, 2000);
    
    return `Extract exam metadata from the following exam document text.

IMPORTANT: Match the level and subject to the exact values I provided in the system prompt.

Document text:
${headerText}

Return ONLY the JSON object with title, level, subject, and year fields.`;
  }

  /**
   * Parse metadata extraction response
   */
  private parseMetadataResponse(aiResponse: string): {
    title: string | null;
    level: string | null;
    subject: string | null;
    year: number | null;
  } {
    try {
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code blocks
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\n?```$/g, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      return {
        title: parsed.title || null,
        level: parsed.level || null,
        subject: parsed.subject || null,
        year: parsed.year ? parseInt(parsed.year, 10) : null,
      };
    } catch (error) {
      this.logger.error('Failed to parse metadata response:', {
        error: error.message,
        response: aiResponse.substring(0, 200),
      });
      return { title: null, level: null, subject: null, year: null };
    }
  }

  /**
   * Build the user prompt with the OCR text
   */
  private buildUserPrompt(ocrText: string): string {
    return `Extract all questions from the following exam text and return them in the specified JSON format:

${ocrText}

Remember to return ONLY the JSON object, no additional text or markdown formatting.`;
  }

  /**
   * Parse AI response and extract questions
   */
  private parseAiResponse(aiResponse: string): ParsedQuestion[] {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();

      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\n?```$/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      // Validate and normalize questions
      const questions: ParsedQuestion[] = parsed.questions.map(
        (q: any, index: number) => {
          if (!q.text) {
            throw new Error(`Question ${index + 1} is missing text field`);
          }

          return {
            id: q.id || uuidv4(),
            text: q.text,
            options: Array.isArray(q.options) ? q.options : null,
            correctAnswer: q.correctAnswer || null,
            topic: q.topic || null,
            difficulty: q.difficulty || null,
            explanation: q.explanation || null,
          };
        },
      );

      return questions;
    } catch (error) {
      this.logger.error('Failed to parse AI response:', {
        error: error.message,
        response: aiResponse.substring(0, 500),
      });

      // Try to extract partial data
      const partialQuestions = this.extractPartialQuestions(aiResponse);
      if (partialQuestions.length > 0) {
        this.logger.warn(
          `Extracted ${partialQuestions.length} questions from partial response`,
        );
        return partialQuestions;
      }

      throw new HttpException(
        'Failed to parse AI response into structured questions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Attempt to extract questions from malformed response
   */
  private extractPartialQuestions(response: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    try {
      // Try to find JSON objects in the response
      const jsonMatches = response.match(/\{[^{}]*"text"[^{}]*\}/g);

      if (jsonMatches) {
        for (const match of jsonMatches) {
          try {
            const q = JSON.parse(match);
            if (q.text) {
              questions.push({
                id: q.id || uuidv4(),
                text: q.text,
                options: Array.isArray(q.options) ? q.options : null,
                correctAnswer: q.correctAnswer || null,
                topic: q.topic || null,
                difficulty: q.difficulty || null,
                explanation: q.explanation || null,
              });
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to extract partial questions:', error);
    }

    return questions;
  }

  /**
   * Validate a parsed question
   */
  validateQuestion(question: ParsedQuestion): boolean {
    if (!question.text || question.text.trim() === '') {
      return false;
    }

    // If options are provided, ensure there are at least 2
    if (question.options && question.options.length < 2) {
      return false;
    }

    return true;
  }
}
