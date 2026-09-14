import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import { ExamQuestionEntity } from '../exam-pipeline/entities/exam-question.entity';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ExamQuestionEntity)
    private readonly questionRepository: Repository<ExamQuestionEntity>,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY', '');
    this.apiUrl = this.configService.get<string>(
      'DEEPSEEK_API_URL',
      'https://api.deepseek.com',
    );
    this.model = this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');

    if (!this.apiKey) {
      this.logger.warn('DeepSeek API key not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60 seconds timeout
    });
  }

  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new HttpException(
        'DeepSeek API key is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async chat(prompt: string, context?: string): Promise<string> {
    this.validateApiKey();

    if (!prompt || prompt.trim() === '') {
      throw new HttpException('Prompt cannot be empty', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Processing chat request with prompt length: ${prompt.length}`);

    try {
      const messages: DeepSeekMessage[] = [];

      // Add system context if provided
      if (context) {
        messages.push({
          role: 'system',
          content: context,
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt,
      });

      const requestData: DeepSeekRequest = {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      };

      const response = await this.axiosInstance.post<DeepSeekResponse>(
        '/chat/completions',
        requestData,
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from DeepSeek API');
      }

      const aiResponse = response.data.choices[0].message.content;
      
      this.logger.log(
        `Chat completed. Tokens used: ${response.data.usage.total_tokens}`,
      );

      return aiResponse;
    } catch (error) {
      this.logger.error('DeepSeek API error:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new HttpException(
            'Invalid DeepSeek API key',
            HttpStatus.UNAUTHORIZED,
          );
        } else if (error.response?.status === 429) {
          throw new HttpException(
            'Rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else if (error.response?.status === 400) {
          throw new HttpException(
            `Bad request: ${error.response.data?.error?.message || 'Invalid request'}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new HttpException(
        'Failed to communicate with AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Structured generation with lower temperature for reliable, consistent output
   * Use for question transformation, formatting tasks, etc.
   */
  private async structuredGeneration(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    this.validateApiKey();

    if (!prompt || prompt.trim() === '') {
      throw new HttpException('Prompt cannot be empty', HttpStatus.BAD_REQUEST);
    }

    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const requestData: DeepSeekRequest = {
        model: this.model,
        messages,
        temperature: 0.2, // Lower temperature for more consistent, structured output
        max_tokens: 2000,
      };

      const response = await this.axiosInstance.post<DeepSeekResponse>(
        '/chat/completions',
        requestData,
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from DeepSeek API');
      }

      const aiResponse = response.data.choices[0].message.content;
      
      this.logger.log(
        `Structured generation completed. Tokens used: ${response.data.usage.total_tokens}`,
      );

      return aiResponse;
    } catch (error) {
      this.logger.error('DeepSeek API error in structured generation:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new HttpException(
            'Invalid DeepSeek API key',
            HttpStatus.UNAUTHORIZED,
          );
        } else if (error.response?.status === 429) {
          throw new HttpException(
            'Rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        } else if (error.response?.status === 400) {
          throw new HttpException(
            `Bad request: ${error.response.data?.error?.message || 'Invalid request'}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new HttpException(
        'Failed to communicate with AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate generated question variation
   * Backend controls the format - do not trust AI output blindly
   */
  private validateGeneratedVariation(
    variation: any,
    request: {
      transformation: string;
      questionType: string;
    },
  ): void {
    if (!variation.text) {
      throw new Error('Generated question is empty');
    }

    if (!variation.correctAnswer) {
      throw new Error('Generated answer is empty');
    }

    const text = variation.text.trim();
    const type = request.questionType;

    // ----------------------------------
    // Must not look like an answer
    // ----------------------------------

    const answerPrefixes = [
      /^answer\s*:/i,
      /^correct answer\s*:/i,
      /^solution\s*:/i,
      /^la réponse\s*:/i,
      /^réponse\s*:/i,
      /^الجواب\s*:/i,
      /^الإجابة\s*:/i,
    ];

    if (answerPrefixes.some(regex => regex.test(text))) {
      throw new Error(
        'AI generated an answer instead of a question',
      );
    }

    // ----------------------------------
    // Question must have enough content
    // ----------------------------------

    if (text.length < 15) {
      throw new Error(
        'Generated question is too short',
      );
    }

    // ----------------------------------
    // MCQ
    // ----------------------------------

    if (type === 'mcq') {
      if (
        !Array.isArray(variation.options) ||
        variation.options.length !== 4
      ) {
        throw new Error(
          'MCQ must contain exactly 4 options',
        );
      }

      // Check if answer matches any option (flexible matching)
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .trim()
          .replace(/^[A-D][.)\]]\s*/i, '') // Remove letter prefix like "A) " or "B." or "C]"
          .replace(/\s+/g, ' ')             // Normalize whitespace
          .replace(/[.,;!?،؛]/g, '');      // Remove only common punctuation (not all chars)
      };
      
      const answer = variation.correctAnswer.trim();
      const normalizedAnswer = normalizeText(answer);
      
      // Check if answer is just a letter (A, B, C, D)
      if (/^[A-D]$/i.test(answer)) {
        // Convert letter to index (A=0, B=1, C=2, D=3)
        const answerIndex = answer.toUpperCase().charCodeAt(0) - 65;
        if (answerIndex >= 0 && answerIndex < variation.options.length) {
          // Replace answer with the actual option text
          variation.correctAnswer = variation.options[answerIndex];
          this.logger.log(
            `[MCQ] Converted letter answer "${answer}" to option text: "${variation.correctAnswer}"`
          );
          return; // Valid - we've fixed it
        }
      }
      
      const answerExists = variation.options.some((option: string) => {
        const normalizedOption = normalizeText(option);
        
        // Exact match after normalization
        if (normalizedOption === normalizedAnswer) return true;
        
        // Option contains answer (for partial matching)
        if (normalizedOption.includes(normalizedAnswer) && normalizedAnswer.length > 3) return true;
        
        // Answer contains option (for when answer is more detailed)
        if (normalizedAnswer.includes(normalizedOption) && normalizedOption.length > 3) return true;
        
        return false;
      });

      if (!answerExists) {
        // Log for debugging
        this.logger.warn(
          `MCQ validation failed. Answer: "${variation.correctAnswer}", Normalized: "${normalizeText(variation.correctAnswer)}", Options: ${JSON.stringify(variation.options)}`
        );
        this.logger.warn(
          `Normalized options: ${variation.options.map((o: string) => normalizeText(o)).join(' | ')}`
        );
        throw new Error(
          `MCQ correct answer does not match an option. Answer: "${variation.correctAnswer}"`,
        );
      }
    }

    // ----------------------------------
    // TRUE / FALSE
    // ----------------------------------

    if (type === 'true_false') {
      const answer =
        variation.correctAnswer
          .toLowerCase()
          .trim();

      const validAnswers = [
        'true',
        'false',
        'vrai',
        'faux',
        'صح',
        'خطأ',
        'صحيح',      // Additional Arabic: correct/true
        'خاطئ',      // Additional Arabic: false/incorrect
        'صواب',      // Additional Arabic: correct
        'خطا',       // Additional Arabic: error (without hamza)
        't',         // Abbreviation
        'f',         // Abbreviation
      ];

      if (!validAnswers.includes(answer)) {
        throw new Error(
          `Invalid True/False answer: "${variation.correctAnswer}". Expected one of: ${validAnswers.join(', ')}`,
        );
      }

      if (
        !text.includes('?') &&
        !/vrai ou faux/i.test(text) &&
        !/true or false/i.test(text) &&
        !text.includes('صح أم خطأ')
      ) {
        throw new Error(
          'True/False question is not properly formatted',
        );
      }
    }

    // ----------------------------------
    // FILL BLANK
    // ----------------------------------

    if (type === 'fill_blank') {
      if (!text.includes('_____')) {
        throw new Error(
          'Fill-blank question must contain _____',
        );
      }
    }
  }

  async summarize(text: string): Promise<string> {
    this.validateApiKey();

    if (!text || text.trim() === '') {
      throw new HttpException('Text cannot be empty', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Processing summarization request for text length: ${text.length}`);

    const prompt = `Please provide a concise summary of the following text:\n\n${text}`;
    const context = 'You are a helpful assistant that creates clear and concise summaries.';

    return this.chat(prompt, context);
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    this.validateApiKey();

    if (!text || text.trim() === '') {
      throw new HttpException('Text cannot be empty', HttpStatus.BAD_REQUEST);
    }

    if (!targetLanguage || targetLanguage.trim() === '') {
      throw new HttpException(
        'Target language cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Processing translation request to ${targetLanguage} for text length: ${text.length}`,
    );

    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}`;
    const context = 'You are a professional translator. Provide only the translation without any additional explanation.';

    return this.chat(prompt, context);
  }

  async generateEmail(purpose: string, tone: string = 'professional'): Promise<string> {
    this.validateApiKey();

    if (!purpose || purpose.trim() === '') {
      throw new HttpException('Purpose cannot be empty', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Generating email with tone: ${tone}`);

    const prompt = `Write a ${tone} email for the following purpose:\n\n${purpose}`;
    const context = `You are a professional email writer. Create a well-structured email with appropriate greeting, body, and closing. The tone should be ${tone}.`;

    return this.chat(prompt, context);
  }

  async getServiceStatus(): Promise<{
    configured: boolean;
    model: string;
    apiUrl: string;
  }> {
    return {
      configured: !!this.apiKey && this.apiKey.trim() !== '',
      model: this.model,
      apiUrl: this.apiUrl,
    };
  }

  /**
   * Generate exam questions from course material
   */
  async generateQuestions(
    documentText: string,
    count: number,
    difficulty: string,
    topics?: string[],
    customInstructions?: string,
  ): Promise<Array<{
    text: string;
    options: string[] | null;
    correctAnswer: string | null;
    topic: string | null;
    difficulty: string;
    explanation: string | null;
  }>> {
    this.validateApiKey();

    if (!documentText || documentText.trim() === '') {
      throw new HttpException('Document text cannot be empty', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Generating ${count} ${difficulty} questions from document (${documentText.length} chars)`);

    const systemPrompt = this.buildQuestionGenerationSystemPrompt();
    const userPrompt = this.buildQuestionGenerationUserPrompt(
      documentText,
      count,
      difficulty,
      topics,
      customInstructions,
    );

    try {
      const aiResponse = await this.chat(userPrompt, systemPrompt);
      const questions = this.parseGeneratedQuestions(aiResponse);

      this.logger.log(`Successfully generated ${questions.length} questions`);
      return questions;
    } catch (error) {
      this.logger.error('Failed to generate questions:', error);
      throw new HttpException(
        'Failed to generate questions with AI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate question variations with separate transformation and format
   * IMPORTANT: Generates ONE variation per AI request for maximum reliability
   */
  async generateQuestionVariations(
    originalQuestion: any,
    variationRequests: Array<{ transformation: string; questionType: string }>,
    customInstructions?: string,
  ): Promise<any[]> {
    this.validateApiKey();

    if (!originalQuestion) {
      throw new HttpException(
        'Original question is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!variationRequests || variationRequests.length === 0) {
      throw new HttpException(
        'At least one variation is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const questionText =
      originalQuestion.questionText ||
      originalQuestion.text ||
      '';

    const originalType =
      originalQuestion.questionType ||
      originalQuestion.type ||
      'short_answer';

    const originalAnswer =
      originalQuestion.correctAnswer ||
      originalQuestion.answer ||
      '';

    const originalDifficulty =
      originalQuestion.difficulty ||
      'medium';

    const originalOptions =
      Array.isArray(originalQuestion.options)
        ? originalQuestion.options
        : [];

    if (!questionText.trim()) {
      throw new HttpException(
        'Original question text is empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `[QuestionVariation] Generating ${variationRequests.length} variations`,
    );
    
    // Log what we're actually receiving
    this.logger.log(
      `[QuestionVariation] REQUESTS = ${JSON.stringify(
        variationRequests,
        null,
        2,
      )}`,
    );

    /*
     * IMPORTANT:
     * Generate EACH variation independently.
     * Do not ask DeepSeek to generate several different formats
     * in the same completion.
     */
    const results = await Promise.all(
      variationRequests.map(async (request, index) => {
        this.logger.log(
          `[QuestionVariation ${index + 1}/${variationRequests.length}] ` +
          `${request.transformation} + ${request.questionType}`,
        );

        const systemPrompt = `You are an expert educational assessment designer.

Your ONLY task is to transform an existing educational question into ONE new question.

You are NOT answering the original question.
You are NOT explaining the original question.
You are NOT summarizing the original question.

You are creating a NEW QUESTION that a student must answer.

==================================================
🚨 CRITICAL - EXAMPLES OF WHAT NOT TO DO
==================================================

WRONG EXAMPLE 1 (putting answer in text field):
{
  "text": "Answer: True",
  "correctAnswer": "True"
}
❌ THIS IS COMPLETELY WRONG!

WRONG EXAMPLE 2 (putting answer in text field):
{
  "text": "Answer: صح",
  "correctAnswer": "صح"
}
❌ THIS IS COMPLETELY WRONG!

WRONG EXAMPLE 3 (just the answer word):
{
  "text": "صح",
  "correctAnswer": "صح"
}
❌ THIS IS WRONG! "صح" is an ANSWER, not a question!

CORRECT EXAMPLE:
{
  "text": "صح أم خطأ: المؤشرات اللغوية تساعد على فهم بنية النص الحجاجي.",
  "options": ["صح", "خطأ"],
  "correctAnswer": "صح"
}
✅ THIS IS CORRECT! The text contains a QUESTION.

==================================================
ABSOLUTE RULE
==================================================

The "text" field MUST contain the question shown to the student.

The "correctAnswer" field MUST contain the hidden answer.

NEVER put the answer inside "text".

NEVER return an answer as "text".

NEVER return an explanation as "text".

NEVER put just "صح" or "خطأ" or "True" or "False" in the "text" field.

==================================================
REQUIRED QUESTION TYPE
==================================================

The required question type is:

${request.questionType}

You MUST use this exact type.

Do NOT change it.

Do NOT infer another type.

Do NOT substitute another format.

==================================================
TRANSFORMATION
==================================================

The requested transformation is:

${request.transformation}

Apply ONLY this transformation while preserving the academic concept and learning objective.

==================================================
QUESTION TYPE DEFINITIONS
==================================================

MCQ:
- text must be a complete question.
- exactly 4 options.
- exactly ONE option is correct.
- correctAnswer must identify the correct option.
- options must contain the answer choices.

TRUE_FALSE:
- text must contain a FULL QUESTION starting with
  "Vrai ou faux :" or "True or False:" or "صح أم خطأ:"
- The text must present a STATEMENT that the student evaluates
- NEVER put just "صح" or "True" or "Vrai" in the text field
- correctAnswer must be one of the valid answer values
- Example CORRECT:
  {
    "text": "صح أم خطأ: المؤشرات اللغوية تساعد على فهم بنية النص.",
    "options": ["صح", "خطأ"],
    "correctAnswer": "صح"
  }

SHORT_ANSWER:
- text must explicitly ask the student a question.
- correctAnswer contains the expected response.

ESSAY:
- text must ask for analysis, discussion,
  comparison, evaluation, or detailed explanation.
- correctAnswer contains the expected answer.

FILL_BLANK:
- text must contain _____.
- correctAnswer contains the missing information.

==================================================
LANGUAGE
==================================================

Use EXACTLY the same language as the original question.

Do NOT translate it.

==================================================
QUALITY
==================================================

The generated question must:

1. Be genuinely different from the original wording.
2. Test the same academic concept.
3. Preserve important facts, formulas, entities,
   terminology and relationships.
4. Be appropriate for the requested transformation.
5. Be appropriate for the original academic level.

==================================================
OUTPUT
==================================================

Return ONLY this JSON object:

{
  "variationType": "${request.transformation}",
  "type": "${request.questionType}",
  "text": "THE FULL QUESTION HERE - NEVER put 'Answer:' here",
  "options": null,
  "correctAnswer": "THE ANSWER HERE",
  "difficulty": "easy|medium|hard"
}

No markdown. No explanation. No additional text.

🚨 REMINDER: The "text" field must be a QUESTION, not an answer!`;

        const userPrompt = `ORIGINAL QUESTION
=================

Question: ${questionText}

Original type: ${originalType}

Original difficulty: ${originalDifficulty}

Original correct answer: ${originalAnswer || 'Not provided'}

${
  originalOptions.length > 0
    ? `
Original options:
${originalOptions
  .map((option: any) =>
    typeof option === 'string'
      ? option
      : option.text || JSON.stringify(option),
  )
  .join('\n')}
`
    : ''
}

==================================================

REQUESTED TRANSFORMATION: ${request.transformation}

REQUESTED QUESTION TYPE: ${request.questionType}

${
  customInstructions
    ? `
ADDITIONAL TEACHER INSTRUCTION:
${customInstructions}
`
    : ''
}

==================================================

Generate ONE question only.

Remember:

🚨 CRITICAL RULES:
1. The "text" field = THE QUESTION (what student READS on exam)
2. The "correctAnswer" field = THE ANSWER (what student WRITES as response)
3. NEVER put "Answer:" in the text field
4. NEVER put just "صح" or "True" in the text field
5. For True/False: Start text with "صح أم خطأ:" or "True or False:"

WRONG:
{
  "text": "Answer: صح"  ← WRONG! This is an answer, not a question
}

CORRECT:
{
  "text": "صح أم خطأ: المؤشرات اللغوية تساعد على فهم النص."  ← CORRECT! This is a question
}

Return JSON only.`;

        try {
          this.logger.log(
            `[QuestionVariation ${index + 1}] Calling structuredGeneration...`,
          );

          const response = await this.structuredGeneration(
            userPrompt,
            systemPrompt,
          );

          this.logger.log(
            `[QuestionVariation ${index + 1}] Raw AI response: ${response.substring(0, 300)}`,
          );

          // Pre-check: If response contains "Answer:" it's wrong, reject immediately
          if (/^[\s\{]*["\']?text["\']?\s*:\s*["\']Answer:/i.test(response)) {
            throw new Error(
              'AI generated "Answer:" in text field - regenerating...',
            );
          }

          this.logger.log(
            `[QuestionVariation ${index + 1}] Parsing JSON...`,
          );

          const parsed = this.parseJsonResponse(response);

          this.logger.log(
            `[QuestionVariation ${index + 1}] Parsed JSON: ${JSON.stringify(parsed).substring(0, 200)}`,
          );

          const variation = parsed?.variations
            ? parsed.variations[0]
            : parsed;

          if (!variation) {
            throw new Error(
              'AI returned no variation',
            );
          }

          /*
           * IMPORTANT:
           * The backend controls these values.
           * Do not trust the AI to tell us what it generated.
           */
          variation.variationType =
            request.transformation;

          variation.type =
            request.questionType;

          variation.text =
            String(variation.text || '').trim();

          variation.correctAnswer =
            variation.correctAnswer
              ? String(variation.correctAnswer).trim()
              : null;

          /*
           * Validate the result
           */
          this.logger.log(
            `[QuestionVariation ${index + 1}] Validating variation...`,
          );

          this.validateGeneratedVariation(
            variation,
            request,
          );

          // Normalize True/False answers to standard format
          if (request.questionType === 'true_false' && variation.correctAnswer) {
            const answer = variation.correctAnswer.toLowerCase().trim();
            // Normalize to standard Arabic or English/French
            if (['صح', 'صحيح', 'صواب'].includes(answer)) {
              variation.correctAnswer = 'صح';
            } else if (['خطأ', 'خاطئ', 'خطا'].includes(answer)) {
              variation.correctAnswer = 'خطأ';
            } else if (['true', 't', 'vrai'].includes(answer)) {
              variation.correctAnswer = answer === 'vrai' ? 'Vrai' : 'True';
            } else if (['false', 'f', 'faux'].includes(answer)) {
              variation.correctAnswer = answer === 'faux' ? 'Faux' : 'False';
            }
          }

          this.logger.log(
            `[QuestionVariation ${index + 1}] SUCCESS: Generated ${variation.type}`,
          );

          return variation;
        } catch (error) {
          this.logger.error(
            `[QuestionVariation ${index + 1}] FAILED:`,
            error.message || error,
          );
          this.logger.error(
            `[QuestionVariation ${index + 1}] Stack:`,
            error.stack,
          );

          throw new HttpException(
            `Failed to generate variation ${index + 1} (${request.transformation} + ${request.questionType}): ${error.message || 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }),
    );

    this.logger.log(
      `[QuestionVariation] Successfully generated ${results.length} variations`,
    );

    return results;
  }

  /**
   * Improve an existing question (grammar, clarity, difficulty, distractors, etc.)
   */
  async improveQuestion(
    question: any,
    improvementTypes: string[],
    customInstructions?: string,
  ): Promise<any> {
    this.validateApiKey();

    // Extract question text safely (handle both questionText and text properties)
    const questionText = question.questionText || question.text || '';
    const questionType = question.questionType || question.type || 'open';
    
    if (!questionText.trim()) {
      throw new HttpException('Question text is empty', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Improving question: "${questionText.substring(0, 50)}..." with improvements: ${improvementTypes.join(', ')}`);

    const systemPrompt = `You are an expert educational content reviewer specialized in improving exam questions in ANY LANGUAGE.

Your task is to improve existing questions based on specified improvement types while PRESERVING THE EXACT SAME LANGUAGE as the original question.

Improvement Types:
- fix_grammar: Correct grammatical errors and typos IN THE ORIGINAL LANGUAGE
- clarify_wording: Make question clearer and more precise IN THE ORIGINAL LANGUAGE
- increase_difficulty: Make question more challenging (add complexity, multi-step reasoning) IN THE ORIGINAL LANGUAGE
- simplify: Make question easier to understand (simpler vocabulary, clearer structure) IN THE ORIGINAL LANGUAGE
- improve_distractors: For MCQ only - make wrong answer options more plausible and realistic IN THE ORIGINAL LANGUAGE
- reduce_ambiguity: Remove any confusing, unclear, or ambiguous phrasing IN THE ORIGINAL LANGUAGE

ABSOLUTELY CRITICAL RULES:
1. ⚠️ NEVER TRANSLATE - Keep the EXACT SAME LANGUAGE as the original (Arabic→Arabic, French→French, English→English, etc.)
2. The improved question MUST be in the SAME LANGUAGE and SAME SCRIPT as the original
3. PRESERVE the original question's intent, subject matter, and difficulty level (unless specifically asked to change difficulty)
4. Keep the same question TYPE (open-ended, MCQ, etc.) unless improvement requires changing it
5. For MCQ questions, maintain 4 options unless specifically improving distractors
6. Provide specific, actionable changes that improve the question quality
7. Explain pedagogical reasoning for each improvement
8. Return ONLY valid JSON, no markdown code blocks, no extra text

LANGUAGE EXAMPLES:
- If question is in Arabic (العربية), improved question MUST be in Arabic
- If question is in French (Français), improved question MUST be in French  
- If question is in English, improved question MUST be in English

YOU MUST NOT:
❌ Translate the question to another language
❌ Mix languages in the improved version
❌ Change the fundamental meaning or subject
❌ Add content that wasn't in the original unless improving clarity/difficulty

YOU MUST:
✅ Improve grammar/spelling in the ORIGINAL LANGUAGE
✅ Make wording clearer in the ORIGINAL LANGUAGE
✅ Adjust difficulty level in the ORIGINAL LANGUAGE
✅ Keep all improvements in the SAME LANGUAGE

Required Output Format:
{
  "improvedText": "The improved question text (EXACT SAME LANGUAGE as original - Arabic if original was Arabic, French if original was French, etc.)",
  "improvedOptions": ["A) option1", "B) option2", "C) option3", "D) option4"] or null,
  "improvements": [
    {
      "improvementType": "fix_grammar|clarify_wording|increase_difficulty|simplify|improve_distractors|reduce_ambiguity",
      "changes": ["Specific change 1 (describe what was changed)", "Specific change 2", ...],
      "reasoning": "Clear explanation of why this improves the question"
    }
  ],
  "summary": "Brief overall summary of all improvements made"
}`;

    const userPrompt = `Original Question to Improve:

Text: "${questionText}"
Type: ${questionType}
${question.options && question.options.length > 0 ? `
Options:
${question.options.map((opt: any, idx: number) => {
  const optText = typeof opt === 'string' ? opt : opt.text || opt;
  return optText;
}).join('\n')}` : ''}
${question.correctAnswer ? `\nCorrect Answer: ${question.correctAnswer}` : ''}
${question.difficulty ? `\nCurrent Difficulty: ${question.difficulty}` : ''}
${question.topic ? `\nTopic: ${question.topic}` : ''}

IMPROVEMENTS TO APPLY: ${improvementTypes.join(', ')}

${customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

⚠️ CRITICAL LANGUAGE REQUIREMENT:
The original question is written in a specific language (you can see it above in the "Text" field).
Your improved version MUST be in the EXACT SAME LANGUAGE.
DO NOT translate to English or any other language.
If the original is Arabic, write improvements in Arabic.
If the original is French, write improvements in French.
If the original is English, write improvements in English.

Return ONLY the JSON object with improvements. No markdown, no extra text.`;

    try {
      const aiResponse = await this.chat(userPrompt, systemPrompt);
      
      this.logger.log(`AI Raw Response (first 200 chars): ${aiResponse.substring(0, 200)}`);
      
      const parsed = this.parseJsonResponse(aiResponse);
      
      // Validate response structure
      if (!parsed.improvedText) {
        throw new Error('AI response missing improvedText field');
      }
      
      // Check if AI might have just returned the original (no real improvement)
      if (parsed.improvedText === questionText) {
        this.logger.warn('AI returned the same text as original - might not have improved anything');
      }
      
      if (!parsed.improvements || !Array.isArray(parsed.improvements)) {
        this.logger.warn('AI response missing improvements array, adding empty array');
        parsed.improvements = [];
      }
      
      if (!parsed.summary) {
        parsed.summary = 'Question improved based on selected criteria.';
      }
      
      this.logger.log(`Successfully improved question (${parsed.improvements.length} improvements applied)`);
      this.logger.log(`Improved text (first 100 chars): ${parsed.improvedText.substring(0, 100)}`);
      
      return parsed;
    } catch (error) {
      this.logger.error('Failed to improve question:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to improve question: ${error.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate rubric for essay questions
   */
  async generateRubric(
    question: any,
    totalPoints: number = 10,
    criteria?: string[],
    customInstructions?: string,
  ): Promise<any> {
    this.validateApiKey();

    const defaultCriteria = ['Content/Accuracy', 'Structure/Organization', 'Grammar/Writing Quality'];
    const rubricCriteria = criteria && criteria.length > 0 ? criteria : defaultCriteria;

    const systemPrompt = `You are an expert educational assessment specialist creating rubrics for essay questions.

Your task is to create a detailed rubric with performance criteria and levels.

Rules:
1. Distribute points across criteria based on importance
2. Define 4 performance levels: Excellent, Good, Satisfactory, Needs Improvement
3. Provide clear descriptions for each level
4. Ensure rubric is fair and measurable
5. Return ONLY valid JSON, no markdown code blocks

Output format:
{
  "criteria": [
    {
      "name": "Content/Accuracy",
      "description": "Assessment of factual accuracy and depth",
      "points": 4,
      "percentage": 40,
      "levels": [
        {
          "level": "Excellent",
          "description": "Comprehensive and accurate...",
          "pointRange": [3.5, 4]
        },
        {
          "level": "Good",
          "description": "Mostly accurate with minor gaps...",
          "pointRange": [2.8, 3.4]
        },
        {
          "level": "Satisfactory",
          "description": "Basic understanding with some errors...",
          "pointRange": [2, 2.7]
        },
        {
          "level": "Needs Improvement",
          "description": "Significant errors or missing content...",
          "pointRange": [0, 1.9]
        }
      ]
    }
  ]
}`;

    const userPrompt = `Essay Question:
"${question.text}"

${question.topic ? `Topic: ${question.topic}` : ''}
${question.difficulty ? `Difficulty: ${question.difficulty}` : ''}

Total Points: ${totalPoints}
Criteria to assess: ${rubricCriteria.join(', ')}

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Create a detailed rubric distributing ${totalPoints} points across the criteria.

Return ONLY the JSON object with the criteria array.`;

    try {
      const aiResponse = await this.chat(userPrompt, systemPrompt);
      const parsed = this.parseJsonResponse(aiResponse);
      
      this.logger.log('Successfully generated rubric');
      return parsed;
    } catch (error) {
      this.logger.error('Failed to generate rubric:', error);
      throw new HttpException(
        'Failed to generate rubric',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Chat with document (Q&A on uploaded resource)
   */
  async chatWithDocument(
    documentText: string,
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<{ response: string; suggestedFollowUps: string[] }> {
    this.validateApiKey();

    const systemPrompt = `You are an expert educational assistant helping teachers work with their uploaded course materials.

CRITICAL: You have the FULL DOCUMENT TEXT provided in the context below. Use it to answer questions accurately.

You can:
- Answer questions about the document content
- Generate additional questions BASED ON THE ACTUAL DOCUMENT TEXT
- Explain concepts found in the document
- Summarize sections from the document
- Create study materials from the document content
- Translate content from the document
- Adapt document content for different grade levels
- Create homework assignments using the document
- Generate revision notes from the document

IMPORTANT RULES FOR GENERATING QUESTIONS:
1. Always base your responses on the actual document content provided. Do NOT say you don't have the document.
2. When the document is an EXAM or contains exam questions with instructions/conseils, focus on the SUBJECT MATTER CONTENT (the actual exam questions about science, history, math, etc.), NOT on the exam format or instructions themselves.
3. When the document is a CORRIGÉ (answer key) or contains model answers, extract the SCIENTIFIC/ACADEMIC CONCEPTS being tested and create NEW similar questions on those SAME TOPICS.
4. Generate questions that test students on the ACADEMIC CONTENT (concepts, theories, facts, procedures, scientific processes), not on "how to take the exam" or "what the exam instructions say" or "how answers are graded".
5. If the document contains worked examples, problems, or questions, generate SIMILAR questions on the SAME TOPICS using the same academic content areas.
6. Questions should be in the SAME LANGUAGE as the document content (usually French or Arabic for Tunisian Bac).
7. Questions should be at the SAME ACADEMIC LEVEL as the document (e.g., if it's a Baccalaureate exam, generate Bac-level questions).

Example for a Biology/SVT Corrigé:
- Document contains: "Question about hormonal regulation of reproduction - Answer explains GnRH, LH, FSH cascade"
- BAD: "According to the answer key, what are the steps to answer a question about hormones?"
- GOOD: "Expliquez le rôle de la GnRH dans la régulation de la fonction testiculaire. Précisez les cellules cibles et les hormones impliquées."

- Document contains: "Exam instructions say to draw diagrams carefully"
- BAD: "What does the exam tell you about drawing diagrams?"
- GOOD: (Skip this content, focus on the actual biology topics)

Focus on extracting the SCIENTIFIC KNOWLEDGE (genetics, physiology, ecology, geology, etc.) and creating questions that assess understanding of those concepts.`;

    const documentContext = `===== COURSE MATERIAL DOCUMENT =====
${documentText.length > 8000 ? documentText.substring(0, 8000) + '\n\n[Text truncated for length, but you have the main content above...]' : documentText}
===== END OF DOCUMENT =====
`;

    try {
      // Build conversation with history if provided
      let fullPrompt: string;
      
      // Detect if user is asking for question generation
      const isQuestionRequest = /generat|create|make|produi|مزيد|أسئلة|questions?|quiz|exercice/i.test(userMessage);
      
      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map(msg => `${msg.role === 'user' ? 'Teacher' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        // ALWAYS include document context, even with history
        fullPrompt = `${documentContext}\n\n=== CONVERSATION HISTORY ===\n${historyText}\n\n=== CURRENT REQUEST ===\nTeacher: ${userMessage}`;
      } else {
        fullPrompt = `${documentContext}\n\nTeacher's Request:\n${userMessage}`;
      }
      
      // Add special instruction for question generation
      if (isQuestionRequest) {
        fullPrompt += `\n\n[CRITICAL INSTRUCTION FOR QUESTION GENERATION:
The teacher wants EXAM-STYLE QUESTIONS for students to practice on the SCIENTIFIC/ACADEMIC CONTENT found in the document.

What to do:
- Read through the document and identify the SCIENTIFIC CONCEPTS, THEORIES, BIOLOGICAL PROCESSES, and KNOWLEDGE being taught or tested
- Create NEW questions that test understanding of THOSE SAME CONCEPTS
- Questions should be similar in style, difficulty, and language to the original

What NOT to do:
- DO NOT create questions about "what the exam instructions say" or "how to take the test"
- DO NOT ask about point values, exam structure, or grading criteria
- DO NOT ask about the "conseils" or "recommandations" sections
- If you see exam metadata (instructions, grading rubrics), SKIP IT and focus on the actual subject matter

Example: If document discusses "regulation hormonale de la reproduction avec GnRH, LH, FSH", create questions testing that biological concept, NOT questions about how the exam question was structured.]`;
      }

      const response = await this.chat(fullPrompt, systemPrompt);

      // Generate suggested follow-ups
      const followUpPrompt = `Based on this conversation about course material, suggest 3 brief follow-up questions or actions the teacher might want to take next. Return as JSON array: {"followUps": ["question 1", "question 2", "question 3"]}`;
      
      let suggestedFollowUps: string[] = [];
      try {
        const followUpResponse = await this.chat(followUpPrompt, systemPrompt);
        const parsed = this.parseJsonResponse(followUpResponse);
        suggestedFollowUps = parsed.followUps || [];
      } catch (error) {
        // If follow-up generation fails, continue without them
        this.logger.warn('Failed to generate follow-ups, continuing without them');
      }

      return {
        response,
        suggestedFollowUps,
      };
    } catch (error) {
      this.logger.error('Failed to chat with document:', error);
      throw new HttpException(
        'Failed to process document chat',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate complete exam with answer key and mark scheme
   */
  async generateCompleteExam(
    dto: any, // GenerateExamDto
    userId: string,
  ): Promise<any> {
    this.validateApiKey();

    this.logger.log(`[generateCompleteExam] Starting exam generation for user ${userId}`);
    this.logger.log(`[generateCompleteExam] Config:`, JSON.stringify(dto));

    try {
      // Step 1: Fetch or generate questions based on source
      let questions: any[] = [];

      switch (dto.source) {
        case 'document':
          if (!dto.documentId) {
            throw new HttpException('Document ID required for document source', HttpStatus.BAD_REQUEST);
          }
          // Generate questions from document
          questions = await this.generateQuestionsFromDocument(dto.documentId, dto.totalQuestions, dto);
          break;

        case 'extracted':
          // Use already extracted questions
          questions = await this.fetchExtractedQuestions(userId, dto);
          break;

        case 'question-bank':
          // Use questions from user's question bank
          questions = await this.fetchQuestionBankQuestions(userId, dto);
          break;

        case 'mixed':
          // Mix from multiple sources
          questions = await this.fetchMixedQuestions(userId, dto);
          break;

        default:
          // Default to question bank
          questions = await this.fetchQuestionBankQuestions(userId, dto);
      }

      // Step 2: Filter by question types if specified
      if (dto.questionTypes) {
        questions = this.filterByQuestionTypes(questions, dto.questionTypes);
      }

      // Step 2.5: Remove duplicate questions based on text similarity
      const originalCount = questions.length;
      questions = this.removeDuplicateQuestions(questions);
      if (originalCount > questions.length) {
        this.logger.log(`[generateCompleteExam] Removed ${originalCount - questions.length} duplicate questions`);
      }

      // Step 3: Limit to requested number
      questions = questions.slice(0, dto.numQuestions || dto.totalQuestions || 20);

      // Step 4: Randomize if requested
      if (dto.randomizeQuestions) {
        questions = this.shuffleArray(questions);
      }

      // Step 5: Calculate points distribution
      const pointsPerQuestion = Math.floor((dto.totalMarks || 100) / questions.length);
      const remainder = (dto.totalMarks || 100) % questions.length;

      questions = questions.map((q, idx) => ({
        ...q,
        points: pointsPerQuestion + (idx < remainder ? 1 : 0),
        questionNumber: idx + 1,
      }));

      // Step 6: Generate answer key
      const answerKey = questions.map((q, idx) => ({
        questionNumber: idx + 1,
        questionId: q.id,
        correctAnswer: q.correctAnswer || q.answer,
        explanation: q.explanation || 'No explanation provided',
        points: q.points,
      }));

      // Step 7: Generate mark scheme
      const markScheme = {
        totalMarks: dto.totalMarks || 100,
        passingMarks: Math.ceil((dto.totalMarks || 100) * 0.5), // 50% pass mark
        questionBreakdown: questions.map((q, idx) => ({
          questionNumber: idx + 1,
          marks: q.points,
          markingCriteria: this.getMarkingCriteria(q),
        })),
      };

      // Step 8: Generate rubrics for essay questions if requested
      let rubrics: any[] = [];
      if (dto.generateRubric) {
        const essayQuestions = questions.filter(q => 
          q.questionType === 'essay' || q.type === 'essay'
        );
        
        rubrics = await Promise.all(
          essayQuestions.map(async (q, idx) => {
            const rubric = await this.generateRubric(q, q.points);
            return {
              questionNumber: questions.indexOf(q) + 1,
              ...rubric,
            };
          })
        );
      }

      this.logger.log(`[generateCompleteExam] Successfully generated exam with ${questions.length} questions`);

      // Return exam response
      return {
        examId: this.generateUUID(),
        title: dto.examTitle || 'AI Generated Exam',
        instructions: dto.examInstructions || 'Answer all questions to the best of your ability.',
        duration: dto.duration || dto.durationMinutes || 60,
        totalMarks: dto.totalMarks || 100,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text || q.questionText,
          type: q.type || q.questionType || 'mcq',
          options: q.options,
          correctAnswer: q.correctAnswer || q.answer,
          points: q.points,
          difficulty: q.difficulty || dto.difficulty || 'medium',
          bloomLevel: q.bloomLevel || dto.bloomLevel || 'understand',
          topic: q.topic,
          explanation: q.explanation,
        })),
        answerKey: dto.generateAnswerKey !== false ? answerKey : undefined,
        markScheme: dto.generateMarkScheme !== false ? markScheme : undefined,
        rubrics: rubrics.length > 0 ? rubrics : undefined,
        metadata: {
          source: dto.source,
          difficulty: dto.difficulty || 'mixed',
          bloomLevel: dto.bloomLevel || 'mixed',
          questionTypes: this.countQuestionTypes(questions),
          generatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('[generateCompleteExam] Failed:', error);
      throw new HttpException(
        `Failed to generate exam: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Helper: Generate questions from document
   */
  private async generateQuestionsFromDocument(
    documentId: string,
    count: number,
    config: any,
  ): Promise<any[]> {
    // This would fetch document OCR and generate questions
    // For now, return empty array - implement when document service is available
    this.logger.warn('generateQuestionsFromDocument not fully implemented yet');
    return [];
  }

  /**
   * Helper: Fetch extracted questions
   */
  private async fetchExtractedQuestions(userId: string, config: any): Promise<any[]> {
    try {
      // If specific questionIds are provided, fetch only those
      if (config.questionIds && config.questionIds.length > 0) {
        const questions = await this.questionRepository.find({
          where: {
            id: In(config.questionIds),
            deletedAt: IsNull(),
          },
        });
        
        this.logger.log(`Fetched ${questions.length} specific questions from database`);
        return questions;
      }
      
      // Otherwise fetch all questions (limit to 100)
      const questions = await this.questionRepository.find({
        where: {
          deletedAt: IsNull(),
        },
        take: 100,
        order: { createdAt: 'DESC' },
      });
      
      this.logger.log(`Fetched ${questions.length} extracted questions from database`);
      return questions;
    } catch (error) {
      this.logger.error('Failed to fetch extracted questions:', error);
      return [];
    }
  }

  /**
   * Helper: Fetch questions from question bank
   */
  private async fetchQuestionBankQuestions(userId: string, config: any): Promise<any[]> {
    try {
      // If specific questionIds are provided, fetch only those
      if (config.questionIds && config.questionIds.length > 0) {
        const questions = await this.questionRepository.find({
          where: {
            id: In(config.questionIds),
            deletedAt: IsNull(),
          },
        });
        
        this.logger.log(`Fetched ${questions.length} specific questions from question bank`);
        return questions;
      }
      
      // Otherwise fetch all available questions
      const questions = await this.questionRepository.find({
        where: {
          deletedAt: IsNull(),
        },
        take: 100,
        order: { createdAt: 'DESC' },
      });
      
      this.logger.log(`Fetched ${questions.length} questions from question bank`);
      return questions;
    } catch (error) {
      this.logger.error('Failed to fetch question bank questions:', error);
      return [];
    }
  }

  /**
   * Helper: Fetch mixed questions from multiple sources
   */
  private async fetchMixedQuestions(userId: string, config: any): Promise<any[]> {
    const questions: any[] = [];
    
    // Mix from extracted and question bank
    const extracted = await this.fetchExtractedQuestions(userId, config);
    const questionBank = await this.fetchQuestionBankQuestions(userId, config);
    
    questions.push(...extracted, ...questionBank);
    
    return questions;
  }

  /**
   * Helper: Filter questions by types
   */
  private filterByQuestionTypes(questions: any[], questionTypes: any): any[] {
    const enabledTypes: string[] = [];
    
    if (questionTypes.mcq) enabledTypes.push('mcq', 'multiple_choice');
    if (questionTypes.trueFalse) enabledTypes.push('true_false', 'boolean');
    if (questionTypes.shortAnswer) enabledTypes.push('short_answer', 'open');
    if (questionTypes.essay) enabledTypes.push('essay', 'long_answer');
    
    if (enabledTypes.length === 0) return questions;
    
    return questions.filter(q => 
      enabledTypes.includes(q.type) || enabledTypes.includes(q.questionType)
    );
  }

  /**
   * Helper: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Helper: Remove duplicate questions based on text similarity
   */
  private removeDuplicateQuestions(questions: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const question of questions) {
      // Get question text (handle both questionText and text properties)
      const questionText = question.questionText || question.text || '';
      
      // Normalize question text for comparison (lowercase, remove extra spaces, remove punctuation)
      const normalizedText = questionText
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim();
      
      // If we haven't seen this question text before, keep it
      if (!seen.has(normalizedText)) {
        seen.set(normalizedText, question);
      } else {
        // If duplicate found, keep the one with more complete data
        const existing = seen.get(normalizedText)!;
        const hasMoreData = 
          (question.options && question.options.length > (existing.options?.length || 0)) ||
          (question.correctAnswer && !existing.correctAnswer) ||
          (question.explanation && !existing.explanation);
        
        if (hasMoreData) {
          this.logger.log(`[Deduplication] Replacing duplicate with more complete version: ${question.id}`);
          seen.set(normalizedText, question);
        } else {
          this.logger.log(`[Deduplication] Skipping duplicate question: ${question.id}`);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Helper: Get marking criteria for question
   */
  private getMarkingCriteria(question: any): string {
    const type = question.type || question.questionType;
    
    switch (type) {
      case 'mcq':
      case 'multiple_choice':
        return 'Full marks for correct answer, 0 for incorrect';
      case 'true_false':
      case 'boolean':
        return 'Full marks for correct answer, 0 for incorrect';
      case 'short_answer':
      case 'open':
        return 'Award marks based on accuracy and completeness of answer';
      case 'essay':
      case 'long_answer':
        return 'Award marks based on content, structure, and coherence';
      default:
        return 'Award marks based on correctness';
    }
  }

  /**
   * Helper: Count question types
   */
  private countQuestionTypes(questions: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    questions.forEach(q => {
      const type = q.type || q.questionType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Helper: Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Helper: Parse JSON response from AI (handles markdown code blocks)
   */
  private parseJsonResponse(aiResponse: string): any {
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

    return JSON.parse(cleanedResponse);
  }

  private buildQuestionGenerationSystemPrompt(): string {
    return `You are an expert educational content creator specialized in generating high-quality exam questions.

Your task is to create exam questions based on provided course material.

Question Types to Generate:
1. Multiple Choice Questions (MCQ) - 4 options (A, B, C, D)
2. True/False Questions - 2 options
3. Short Answer Questions - No options, just question text
4. Fill-in-the-Blank Questions - Use _____ for blanks

Rules:
1. Questions must be clear, unambiguous, and educational
2. For MCQ: Provide exactly 4 options, mark correct answer
3. For True/False: Provide 2 options (True/False)
4. Ensure questions test understanding, not just memorization
5. Include explanations for correct answers
6. Vary question types for diversity
7. Questions should be appropriate for the specified difficulty level
8. Return ONLY valid JSON, no markdown code blocks

Output format:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"] or null,
      "correctAnswer": "A" or "option1" or null,
      "topic": "Topic/Subject",
      "difficulty": "easy|medium|hard",
      "explanation": "Why this is correct..."
    }
  ]
}`;
  }

  private buildQuestionGenerationUserPrompt(
    documentText: string,
    count: number,
    difficulty: string,
    topics?: string[],
    customInstructions?: string,
  ): string {
    let prompt = `Generate ${count} ${difficulty} exam questions from the following course material:\n\n`;
    
    if (topics && topics.length > 0) {
      prompt += `Focus on these topics: ${topics.join(', ')}\n\n`;
    }

    if (customInstructions) {
      prompt += `Additional instructions: ${customInstructions}\n\n`;
    }

    // Limit document text to avoid token limits (use first 8000 chars)
    const truncatedText = documentText.length > 8000 
      ? documentText.substring(0, 8000) + '\n\n[Text truncated...]'
      : documentText;

    prompt += `Course Material:\n${truncatedText}\n\n`;
    prompt += `Generate a diverse mix of question types (MCQ, True/False, Short Answer, Fill-in-the-Blank).\n`;
    prompt += `Return ONLY the JSON object with the questions array.`;

    return prompt;
  }

  private parseGeneratedQuestions(aiResponse: string): Array<{
    text: string;
    options: string[] | null;
    correctAnswer: string | null;
    topic: string | null;
    difficulty: string;
    explanation: string | null;
  }> {
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

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      return parsed.questions.map((q: any) => ({
        text: q.text || '',
        options: Array.isArray(q.options) ? q.options : null,
        correctAnswer: q.correctAnswer || null,
        topic: q.topic || null,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || null,
      }));
    } catch (error) {
      this.logger.error('Failed to parse generated questions:', error);
      throw new HttpException(
        'Failed to parse AI response',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
