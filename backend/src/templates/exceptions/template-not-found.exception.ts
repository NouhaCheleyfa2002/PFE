import { NotFoundException } from '@nestjs/common';

/**
 * Exception thrown when a requested template does not exist.
 * This includes scenarios such as:
 * - Attempting to retrieve a non-existent template by ID
 * - Accessing a template that was deleted
 * - Referencing a template that belongs to another user
 * 
 * HTTP Status Code: 404 Not Found
 */
export class TemplateNotFoundException extends NotFoundException {
  constructor(templateId: string) {
    super({
      statusCode: 404,
      error: 'Template Not Found',
      message: `Template with ID ${templateId} does not exist`,
      templateId,
    });
  }
}
