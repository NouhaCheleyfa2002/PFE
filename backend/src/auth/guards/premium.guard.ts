import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PremiumRequiredException } from '../../templates/exceptions/premium-required.exception';

/**
 * PremiumGuard - Checks if the user has premium access.
 * For the current implementation, all 'teacher' role users are treated as premium.
 * This can be updated when a real subscription system is added.
 * 
 * Requirements: 17.1, 17.2
 */
@Injectable()
export class PremiumGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new PremiumRequiredException('Authentication required');
    }

    // Teachers and admins have premium access
    if (user.role === 'teacher' || user.role === 'admin') {
      return true;
    }

    throw new PremiumRequiredException(
      'Template Builder is a premium feature. Upgrade your account to create and manage exam templates.',
    );
  }
}
