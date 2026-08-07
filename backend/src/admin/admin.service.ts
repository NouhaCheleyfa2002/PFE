import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { UserEntity } from '../auth/entities/user.entity';
import { ResourceRating } from '../ratings/entities/rating.entity';
import { BanUserDto, RestrictUserDto, UpdateUserRoleDto, ModerateRatingDto, DeleteUserDto } from './dto/admin.dto';
import { AiService } from '../ai/ai.service';

export interface TaskInfo {
  id: string | undefined;
  name: string;
  data: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: number;
  processedAt: number | undefined;
  finishedAt: number | undefined;
  failedReason: string | undefined;
}

const JOB_TYPES: JobType[] = ['waiting', 'active', 'delayed', 'completed', 'failed'];

@Injectable()
export class AdminService {
  constructor(
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ResourceRating)
    private readonly ratingRepository: Repository<ResourceRating>,
    private readonly aiService: AiService,
  ) {}

  async getTasks(): Promise<TaskInfo[]> {
    const allJobs = await this.notificationQueue.getJobs(JOB_TYPES);

    const tasks: TaskInfo[] = await Promise.all(
      allJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id,
          name: job.name,
          data: job.data as Record<string, unknown>,
          status: state,
          attempts: job.attemptsMade,
          createdAt: job.timestamp,
          processedAt: job.processedOn,
          finishedAt: job.finishedOn,
          failedReason: job.failedReason,
        };
      }),
    );

    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getTaskStats(): Promise<Record<string, number>> {
    const [active, completed, failed, waiting, delayed] = await Promise.all([
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getDelayedCount(),
    ]);
    return { active, completed, failed, waiting, delayed };
  }

  async getAllUsers(): Promise<Omit<UserEntity, 'password'>[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    // Remove passwords from response
    return users.map(({ password, ...user }) => user);
  }

  async getUserById(id: string): Promise<Omit<UserEntity, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async banUser(userId: string, banUserDto: BanUserDto, adminId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot ban admin users');
    }

    user.banned = true;
    user.bannedAt = new Date();
    user.bannedReason = banUserDto.reason;
    user.bannedBy = adminId;

    return await this.userRepository.save(user);
  }

  async unbanUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.banned = false;
    user.bannedAt = undefined;
    user.bannedReason = undefined;
    user.bannedBy = undefined;

    return await this.userRepository.save(user);
  }

  async restrictUser(userId: string, restrictUserDto: RestrictUserDto, adminId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot restrict admin users');
    }

    user.restricted = true;
    user.restrictedAt = new Date();
    user.restrictedReason = restrictUserDto.reason;
    user.restrictedBy = adminId;
    user.restrictionType = restrictUserDto.restrictionType;

    return await this.userRepository.save(user);
  }

  async unrestrictUser(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.restricted = false;
    user.restrictedAt = undefined;
    user.restrictedReason = undefined;
    user.restrictedBy = undefined;
    user.restrictionType = undefined;

    return await this.userRepository.save(user);
  }

  async updateUserRole(userId: string, updateUserRoleDto: UpdateUserRoleDto): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = updateUserRoleDto.role as 'admin' | 'teacher' | 'student';
    return await this.userRepository.save(user);
  }

  async deleteUser(userId: string, deleteUserDto: DeleteUserDto, adminId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'admin') {
      throw new ForbiddenException('Cannot delete admin users');
    }

    // Log the deletion reason (you might want to store this in an audit log table)
    console.log(`User ${userId} deleted by admin ${adminId}. Reason: ${deleteUserDto.reason}`);

    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  // Rating Moderation
  async getFlaggedRatings() {
    const ratings = await this.ratingRepository.find({
      where: { flagged: true },
      relations: ['teacher'],
      order: { flaggedAt: 'DESC' },
    });

    return ratings.map(rating => ({
      ...rating,
      teacher: rating.teacher ? { id: rating.teacher.id, fullName: rating.teacher.fullName, email: rating.teacher.email } : null,
    }));
  }

  async getPendingRatings() {
    const ratings = await this.ratingRepository.find({
      where: { 
        moderationStatus: 'pending',
        deletedAt: IsNull(), // Exclude soft-deleted ratings
      },
      relations: ['teacher'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    // Auto-moderate with AI
    for (const rating of ratings) {
      if (rating.review && !rating.aiModerationScore) {
        await this.autoModerateRating(rating);
      }
    }

    return ratings.map(rating => ({
      ...rating,
      teacher: rating.teacher ? { id: rating.teacher.id, fullName: rating.teacher.fullName, email: rating.teacher.email } : null,
    }));
  }

  private async autoModerateRating(rating: ResourceRating): Promise<void> {
    try {
      const moderationPrompt = `Analyze this review for inappropriate content. Rate from 0.00 (safe) to 1.00 (highly problematic).
Look for: toxic language, spam, offensive content, harassment, misinformation.

Review: "${rating.review}"

Respond in JSON format:
{
  "score": 0.00,
  "flags": ["toxic", "spam", "offensive"],
  "explanation": "brief explanation"
}`;

      const response = await this.aiService.chat(moderationPrompt);
      const result = JSON.parse(response);

      rating.aiModerationScore = result.score;
      rating.aiModerationFlags = result.flags || [];

      // Auto-flag if score is high
      if (result.score >= 0.7) {
        rating.flagged = true;
        rating.flaggedAt = new Date();
        rating.flaggedReason = `AI detected: ${result.explanation}`;
      } else if (result.score >= 0.4) {
        // Moderate threshold - flag for review but don't hide
        rating.moderationStatus = 'pending';
      } else {
        // Low risk - auto-approve
        rating.moderationStatus = 'approved';
      }

      await this.ratingRepository.save(rating);
    } catch (error) {
      console.error('AI moderation failed:', error);
      // Don't throw - just skip AI moderation
    }
  }

  async moderateRating(ratingId: string, moderateRatingDto: ModerateRatingDto, adminId: string): Promise<ResourceRating> {
    const rating = await this.ratingRepository.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    rating.moderationStatus = moderateRatingDto.status;
    rating.moderatedAt = new Date();
    rating.moderatedBy = adminId;

    if (moderateRatingDto.status === 'rejected') {
      rating.flagged = true;
      rating.flaggedReason = moderateRatingDto.reason || 'Rejected by moderator';
    } else {
      rating.flagged = false;
      rating.flaggedReason = undefined;
    }

    return await this.ratingRepository.save(rating);
  }

  /**
   * Soft delete a rating (mark as deleted without removing from database)
   */
  async deleteRating(ratingId: string, adminId: string): Promise<{ message: string }> {
    const rating = await this.ratingRepository.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if already deleted
    if (rating.deletedAt) {
      throw new BadRequestException('Rating has already been deleted');
    }

    // Soft delete: mark as deleted without removing from database
    rating.deletedAt = new Date();
    rating.deletedBy = adminId;
    rating.deletionReason = 'Deleted by admin';
    rating.moderationStatus = 'rejected'; // Also mark as rejected

    await this.ratingRepository.save(rating);

    console.log(`Rating ${ratingId} soft deleted by admin ${adminId}`);
    return { message: 'Rating deleted successfully' };
  }

  async getModerationStats() {
    // Exclude soft-deleted ratings from all stats
    const [total, flagged, pending, approved, rejected] = await Promise.all([
      this.ratingRepository.count({ where: { deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { flagged: true, deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { moderationStatus: 'pending', deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { moderationStatus: 'approved', deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { moderationStatus: 'rejected', deletedAt: IsNull() } }),
    ]);

    return { total, flagged, pending, approved, rejected };
  }
}
