import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Exception thrown when AI metadata extraction fails.
 * This includes scenarios such as:
 * - DeepSeek AI API timeout
 * - Rate limit exceeded
 * - Invalid AI response format
 * - OCR processing failure
 * - Document format not supported by AI
 * 
 * HTTP Status Code: 503 Service Unavailable
 */
export class AiExtractionException extends ServiceUnavailableException {
  constructor(reason: string) {
    super({
      statusCode: 503,
      error: 'AI Extraction Failed',
      message: 'Unable to extract metadata from document',
      reason,
      fallbackMessage: 'You can manually enter institutional information',
    });
  }
}
