import { Controller, Get, Patch, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  ProfileWithStatsDto,
  ProfileResponseDto,
} from './dto/profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /profile
   * Get current user's profile with statistics
   */
  @Get()
  async getProfile(@Request() req): Promise<ProfileWithStatsDto> {
    return this.profileService.getProfile(req.user.userId);
  }

  /**
   * PATCH /profile
   * Update current user's profile
   */
  @Patch()
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ message: string; user: ProfileResponseDto }> {
    const user = await this.profileService.updateProfile(req.user.userId, dto);
    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  /**
   * POST /profile/change-password
   * Change current user's password
   * 
   * Returns 204 No Content on success.
   * User should be logged out on the client side after this.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.profileService.changePassword(req.user.userId, dto);
    // Password changed successfully - client should logout user
  }
}
