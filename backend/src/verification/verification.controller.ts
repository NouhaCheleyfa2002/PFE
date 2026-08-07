import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto, ReviewVerificationDto } from './dto/verification.dto';
import { VerificationStatus } from './entities/verification-request.entity';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Generate a verification code for video recording
   */
  @Get('generate-code')
  @HttpCode(HttpStatus.OK)
  generateCode() {
    return {
      code: this.verificationService.generateVerificationCode(),
      instructions: 'Please record a video showing your face, ID card, and read this code aloud',
    };
  }

  /**
   * Submit verification request
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(@Request() req: any, @Body() dto: SubmitVerificationDto) {
    const request = await this.verificationService.submitRequest(req.user.sub, dto);
    return {
      success: true,
      message: 'Verification request submitted successfully',
      requestId: request.id,
      status: request.status,
      verificationCode: request.verificationCode,
    };
  }

  /**
   * Get my verification request
   */
  @Get('my-request')
  async getMyRequest(@Request() req: any) {
    const result = await this.verificationService.getMyRequest(req.user.sub);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get all verification requests (Admin only)
   */
  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllRequests(@Query('status') status?: VerificationStatus) {
    const requests = await this.verificationService.getAllRequests(status);
    return {
      success: true,
      requests,
      total: requests.length,
    };
  }

  /**
   * Get verification request by ID (Admin only)
   */
  @Get('requests/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getRequestById(@Param('id') id: string) {
    const request = await this.verificationService.getRequestById(id);
    return {
      success: true,
      request,
    };
  }

  /**
   * Review verification request (Admin only)
   */
  @Patch('requests/:id/review')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async reviewRequest(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReviewVerificationDto,
  ) {
    const request = await this.verificationService.reviewRequest(
      id,
      req.user.sub,
      dto,
    );

    return {
      success: true,
      message: `Verification request ${dto.status}`,
      request,
    };
  }

  /**
   * Get verification statistics (Admin only)
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getStats() {
    const stats = await this.verificationService.getStats();
    return {
      success: true,
      stats,
    };
  }
}
