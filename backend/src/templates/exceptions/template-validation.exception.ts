import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when template validation fails.
 * This includes validation errors such as:
 * - Template name too short/long
 * - Invalid file format
 * - File size exceeds limit
 * - Required field missing
 * 
 * HTTP Status Code: 400 Bad Request
 */
export class TemplateValidationException extends BadRequestException {
  constructor(field: string, message: string) {
    super({
      statusCode: 400,
      error: 'Validation Error',
      field,
      message,
    });
  }
}
