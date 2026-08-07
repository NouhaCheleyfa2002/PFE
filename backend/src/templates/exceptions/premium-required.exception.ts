import { ForbiddenException } from '@nestjs/common';

/**
 * Exception thrown when a non-premium user attempts to access premium features.
 * This includes scenarios such as:
 * - Non-premium user attempting to create templates
 * - Template limit reached for premium users
 * - Accessing premium-only template features
 * 
 * HTTP Status Code: 403 Forbidden
 */
export class PremiumRequiredException extends ForbiddenException {
  constructor(message?: string) {
    super({
      statusCode: 403,
      error: 'Premium Required',
      message: message || 'This feature requires a premium subscription',
      upgradeUrl: '/subscription/upgrade',
    });
  }
}
