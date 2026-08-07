import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationRequestEntity, VerificationStatus } from './entities/verification-request.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubmitVerificationDto, ReviewVerificationDto } from './dto/verification.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationRequestEntity)
    private verificationRepo: Repository<VerificationRequestEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private notificationsGateway: NotificationsGateway,
    private userNotificationsService: UserNotificationsService,
  ) {}

  /**
   * Generate a random verification code
   */
  generateVerificationCode(): string {
    const prefix = 'ICP';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  }

  /**
   * Submit a new verification request
   */
  async submitRequest(userId: string, dto: SubmitVerificationDto): Promise<VerificationRequestEntity> {
    // Check if user already has a pending request
    const existingRequest = await this.verificationRepo.findOne({
      where: { userId, status: VerificationStatus.PENDING },
    });

    if (existingRequest) {
      throw new ConflictException('You already have a pending verification request');
    }

    // Check if user is already verified
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.verified) {
      throw new ConflictException('Your account is already verified');
    }

    // Generate verification code if video provided
    const verificationCode = dto.verificationVideoUrl 
      ? this.generateVerificationCode() 
      : null;

    const request = this.verificationRepo.create({
      userId,
      fullName: dto.fullName,
      institution: dto.institution,
      teachingLevel: dto.teachingLevel,
      subjects: dto.subjects,
      documentUrls: dto.documentUrls,
      verificationVideoUrl: dto.verificationVideoUrl || null,
      verificationCode: verificationCode,
      status: VerificationStatus.PENDING,
    });

    const savedRequest = await this.verificationRepo.save(request);

    // Send real-time notification to all admins
    this.notificationsGateway.sendToAdmins({
      message: `New verification request from ${dto.fullName}`,
      type: 'verification_request',
      link: `/dashboard/admin/verification`,
      timestamp: new Date(),
      data: {
        requestId: savedRequest.id,
        teacherName: dto.fullName,
        institution: dto.institution,
      },
    });

    // Also create persistent notification in database for admins
    try {
      await this.userNotificationsService.create({
        userId: 'admin', // This is a placeholder - should be actual admin IDs
        message: `New verification request from ${dto.fullName}`,
        title: 'New Verification Request',
        type: 'verification_request',
        link: `/dashboard/admin/verification`,
        data: {
          requestId: savedRequest.id,
          teacherName: dto.fullName,
        },
      });
    } catch (error) {
      // Silently fail database notification - WebSocket is primary
      console.error('Failed to create database notification:', error);
    }

    return savedRequest;
  }

  /**
   * Get user's verification request
   */
  async getMyRequest(userId: string): Promise<{
    request: VerificationRequestEntity | null;
    canReapply: boolean;
    verificationCode?: string;
  }> {
    const request = await this.verificationRepo.findOne({
      where: { userId },
      order: { submittedAt: 'DESC' },
      relations: ['reviewer'],
    });

    if (!request) {
      return { request: null, canReapply: true };
    }

    // Can reapply if rejected and 7 days have passed
    const canReapply = 
      request.status === VerificationStatus.REJECTED &&
      this.daysSince(request.reviewedAt) >= 7;

    return {
      request,
      canReapply,
      verificationCode: request.status === VerificationStatus.PENDING && request.verificationCode 
        ? request.verificationCode 
        : undefined,
    };
  }

  /**
   * Get all verification requests (Admin)
   */
  async getAllRequests(status?: VerificationStatus): Promise<VerificationRequestEntity[]> {
    const query = this.verificationRepo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.user', 'user')
      .leftJoinAndSelect('vr.reviewer', 'reviewer');

    if (status) {
      query.where('vr.status = :status', { status });
    }

    return query.orderBy('vr.submittedAt', 'DESC').getMany();
  }

  /**
   * Get verification request by ID (Admin)
   */
  async getRequestById(id: string): Promise<VerificationRequestEntity> {
    const request = await this.verificationRepo.findOne({
      where: { id },
      relations: ['user', 'reviewer'],
    });

    if (!request) {
      throw new NotFoundException('Verification request not found');
    }

    return request;
  }

  /**
   * Review verification request (Admin)
   */
  async reviewRequest(
    requestId: string,
    reviewerId: string,
    dto: ReviewVerificationDto,
  ): Promise<VerificationRequestEntity> {
    const request = await this.getRequestById(requestId);

    if (request.status !== VerificationStatus.PENDING && request.status !== VerificationStatus.MORE_INFO_NEEDED) {
      throw new BadRequestException('This request has already been reviewed');
    }

    // Update request
    request.status = dto.status;
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes || null;
    request.rejectionReason = dto.rejectionReason || null;

    await this.verificationRepo.save(request);

    // If approved, update user's verification status
    if (dto.status === VerificationStatus.APPROVED) {
      await this.userRepo.update(request.userId, {
        verified: true,
        verificationStatus: 'verified',
        verificationCompletedAt: new Date(),
      });
    }

    // Send real-time notification to the teacher
    const notificationMessage = 
      dto.status === VerificationStatus.APPROVED 
        ? '🎉 Your verification request has been approved!'
        : dto.status === VerificationStatus.REJECTED
        ? '❌ Your verification request was rejected'
        : 'ℹ️ More information needed for your verification';

    this.notificationsGateway.sendToUser(request.userId, {
      message: notificationMessage,
      type: 'verification_status',
      link: '/dashboard/profile',
      timestamp: new Date(),
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
      },
    });

    // Create persistent notification in database
    try {
      await this.userNotificationsService.create({
        userId: request.userId,
        message: notificationMessage,
        title: 'Verification Status Update',
        type: 'verification_status',
        link: '/dashboard/profile',
        data: {
          status: dto.status,
          reviewNotes: dto.reviewNotes,
        },
      });
    } catch (error) {
      console.error('Failed to create database notification:', error);
    }

    return request;
  }

  /**
   * Get verification statistics (Admin)
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    moreInfoNeeded: number;
  }> {
    const [total, pending, approved, rejected, moreInfoNeeded] = await Promise.all([
      this.verificationRepo.count(),
      this.verificationRepo.count({ where: { status: VerificationStatus.PENDING } }),
      this.verificationRepo.count({ where: { status: VerificationStatus.APPROVED } }),
      this.verificationRepo.count({ where: { status: VerificationStatus.REJECTED } }),
      this.verificationRepo.count({ where: { status: VerificationStatus.MORE_INFO_NEEDED } }),
    ]);

    return { total, pending, approved, rejected, moreInfoNeeded };
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date | null): number {
    if (!date) return Infinity;
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
