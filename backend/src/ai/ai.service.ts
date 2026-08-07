import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

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

  constructor(private readonly configService: ConfigService) {
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
