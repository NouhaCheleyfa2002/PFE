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
}
