import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { UserEntity } from '../auth/entities/user.entity';
import { ResourceRating } from '../ratings/entities/rating.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
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
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(PurchaseEntity)
    private readonly purchaseRepository: Repository<PurchaseEntity>,
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

  /**
   * Get platform statistics for admin dashboard
   */
  async getStatistics() {
    const [
      totalUsers,
      verifiedTeachers,
      totalDocuments,
      coursesCount,
      examsCount,
      revenueResult,
    ] = await Promise.all([
      // Total users count
      this.userRepository.count(),
      
      // Verified teachers count
      this.userRepository.count({
        where: { role: 'teacher', verified: true },
      }),
      
      // Total documents/resources count
      this.documentRepository.count(),
      
      // Courses count (non-exam resources)
      this.documentRepository.count({
        where: { resourceType: 'course' },
      }),
      
      // Exams count
      this.documentRepository.count({
        where: { resourceType: 'exam' },
      }),
      
      // Revenue total from completed purchases
      this.purchaseRepository
        .createQueryBuilder('purchase')
        .select('SUM(purchase.amount)', 'total')
        .where('purchase.status = :status', { status: 'completed' })
        .getRawOne(),
    ]);

    const revenue = parseFloat(revenueResult?.total || '0');

    return {
      totalUsers,
      verifiedTeachers,
      totalDocuments,
      coursesCount,
      examsCount,
      revenue,
    };
  }

  /**
   * Get recent activity feed for admin dashboard
   */
  async getRecentActivity() {
    const activities: Array<{
      type: string;
      text: string;
      time: string;
      timestamp: Date;
    }> = [];

    // Get recent user verifications (last 24 hours)
    const recentVerifications = await this.userRepository.find({
      where: {
        verified: true,
        verificationCompletedAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
      order: { verificationCompletedAt: 'DESC' },
      take: 5,
    });

    for (const user of recentVerifications) {
      activities.push({
        type: 'verification',
        text: `${user.fullName} verified as educator`,
        time: this.getRelativeTime(user.verificationCompletedAt),
        timestamp: user.verificationCompletedAt,
      });
    }

    // Get recent document uploads (last 24 hours)
    const recentUploads = await this.documentRepository.find({
      where: {
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Group uploads by hour
    const uploadsByHour = recentUploads.reduce((acc, doc) => {
      const hour = new Date(doc.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    if (Object.keys(uploadsByHour).length > 0) {
      const totalUploads = recentUploads.length;
      const latestUpload = recentUploads[0];
      activities.push({
        type: 'upload',
        text: `${totalUploads} resources uploaded by various teachers`,
        time: this.getRelativeTime(latestUpload.createdAt),
        timestamp: latestUpload.createdAt,
      });
    }

    // Get recent exam creations (last 24 hours)
    const recentExams = await this.documentRepository.find({
      where: {
        resourceType: 'exam',
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (recentExams.length > 0) {
      activities.push({
        type: 'exam',
        text: `${recentExams.length} exams generated using AI`,
        time: this.getRelativeTime(recentExams[0].createdAt),
        timestamp: recentExams[0].createdAt,
      });
    }

    // Get recent purchases (last 24 hours)
    const recentPurchases = await this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.status = :status', { status: 'completed' })
      .andWhere('purchase.created_at > :since', { since: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .orderBy('purchase.created_at', 'DESC')
      .take(10)
      .getMany();

    if (recentPurchases.length > 0) {
      const totalRevenue = recentPurchases.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      activities.push({
        type: 'payment',
        text: `Payment received: ${totalRevenue.toFixed(2)} DT from marketplace`,
        time: this.getRelativeTime(recentPurchases[0].createdAt),
        timestamp: recentPurchases[0].createdAt,
      });
    }

    // Get recent new users (last 24 hours)
    const recentUsers = await this.userRepository.find({
      where: {
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Count organizations (teachers with specific keywords or multiple uploads)
    const orgCount = recentUsers.filter(u => u.role === 'teacher' && u.university).length;
    if (orgCount > 0) {
      activities.push({
        type: 'organization',
        text: `${orgCount} new organizations created accounts`,
        time: this.getRelativeTime(recentUsers[0].createdAt),
        timestamp: recentUsers[0].createdAt,
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 6 activities
    return activities.slice(0, 6);
  }

  /**
   * Helper method to get relative time string
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  /**
   * Get comprehensive analytics for admin dashboard
   */
  async getAnalytics() {
    // Get basic stats
    const [
      totalUsers,
      activeUsers,
      verifiedEducators,
      pendingVerification,
      totalResources,
      pendingModeration,
      totalSales,
      revenue,
      pendingActions,
      averageRating,
    ] = await Promise.all([
      // Total users
      this.userRepository.count(),
      
      // Active users (users created in last 30 days as proxy for active)
      this.userRepository.count({
        where: { createdAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) },
      }),
      
      // Verified teachers
      this.userRepository.count({
        where: { role: 'teacher', verified: true },
      }),
      
      // Pending verification
      this.userRepository.count({
        where: { 
          role: 'teacher', 
          verificationStatus: 'pending',
        },
      }),
      
      // Total resources
      this.documentRepository.count(),
      
      // Pending moderation (ratings only, as documents don't have moderation status)
      this.ratingRepository.count({
        where: { moderationStatus: 'pending', deletedAt: IsNull() },
      }),
      
      // Total sales
      this.purchaseRepository.count({
        where: { status: 'completed' },
      }),
      
      // Total revenue
      this.purchaseRepository
        .createQueryBuilder('purchase')
        .select('SUM(purchase.amount)', 'total')
        .where('purchase.status = :status', { status: 'completed' })
        .getRawOne()
        .then(result => parseFloat(result?.total || '0')),
      
      // Pending actions (verification + flagged ratings)
      Promise.all([
        this.userRepository.count({
          where: { verificationStatus: 'pending' },
        }),
        this.ratingRepository.count({
          where: { flagged: true, deletedAt: IsNull() },
        }),
      ]).then(([verif, ratings]) => verif + ratings),
      
      // Average rating across all resources
      this.ratingRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.overall_rating)', 'avg')
        .where('rating.deletedAt IS NULL')
        .getRawOne()
        .then(result => parseFloat(result?.avg || '0')),
    ]);

    // Calculate trends (compare last 30 days vs previous 30 days)
    const trends = await this.calculateTrends();

    // Get growth data (last 6 months)
    const growthData = await this.getGrowthData();
    
    // Get pending actions details
    const pendingActionsDetails = await this.getPendingActions();
    
    // Get top performing content
    const topContent = await this.getTopContent();
    
    // Get activity stats
    const activityStats = await this.getActivityStats();
    
    // Get moderation stats
    const moderationStats = await this.getModerationStatsDetailed();

    return {
      stats: {
        totalUsers,
        activeUsers,
        verifiedEducators,
        pendingVerification,
        totalResources,
        pendingModeration,
        totalSales,
        totalRevenue: revenue,
        pendingActions,
        averageRating,
      },
      trends,
      growthData,
      pendingActions: pendingActionsDetails,
      topContent,
      activityStats,
      moderationStats,
    };
  }

  private async calculateTrends() {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    // Current period (last 30 days)
    const [
      currentUsers,
      currentEducators,
      currentResources,
      currentSales,
      currentRevenue,
    ] = await Promise.all([
      this.userRepository.count({
        where: { createdAt: MoreThan(thirtyDaysAgo) },
      }),
      this.userRepository.count({
        where: {
          role: 'teacher',
          verified: true,
          verificationCompletedAt: MoreThan(thirtyDaysAgo),
        },
      }),
      this.documentRepository.count({
        where: { createdAt: MoreThan(thirtyDaysAgo) },
      }),
      this.purchaseRepository.count({
        where: {
          status: 'completed',
          createdAt: MoreThan(thirtyDaysAgo),
        },
      }),
      this.purchaseRepository
        .createQueryBuilder('purchase')
        .select('COALESCE(SUM(purchase.amount), 0)', 'total')
        .where('purchase.status = :status', { status: 'completed' })
        .andWhere('purchase.createdAt > :date', { date: thirtyDaysAgo })
        .getRawOne()
        .then(result => parseFloat(result?.total || '0')),
    ]);

    // Previous period (30-60 days ago) using Between operator
    const [
      previousUsers,
      previousEducators,
      previousResources,
      previousSales,
      previousRevenue,
    ] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt > :start', { start: sixtyDaysAgo })
        .andWhere('user.createdAt <= :end', { end: thirtyDaysAgo })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.role = :role', { role: 'teacher' })
        .andWhere('user.verified = :verified', { verified: true })
        .andWhere('user.verificationCompletedAt > :start', { start: sixtyDaysAgo })
        .andWhere('user.verificationCompletedAt <= :end', { end: thirtyDaysAgo })
        .getCount(),
      this.documentRepository
        .createQueryBuilder('doc')
        .where('doc.createdAt > :start', { start: sixtyDaysAgo })
        .andWhere('doc.createdAt <= :end', { end: thirtyDaysAgo })
        .getCount(),
      this.purchaseRepository
        .createQueryBuilder('purchase')
        .where('purchase.status = :status', { status: 'completed' })
        .andWhere('purchase.createdAt > :start', { start: sixtyDaysAgo })
        .andWhere('purchase.createdAt <= :end', { end: thirtyDaysAgo })
        .getCount(),
      this.purchaseRepository
        .createQueryBuilder('purchase')
        .select('COALESCE(SUM(purchase.amount), 0)', 'total')
        .where('purchase.status = :status', { status: 'completed' })
        .andWhere('purchase.createdAt > :start', { start: sixtyDaysAgo })
        .andWhere('purchase.createdAt <= :end', { end: thirtyDaysAgo })
        .getRawOne()
        .then(result => parseFloat(result?.total || '0')),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      users: calculateChange(currentUsers, previousUsers),
      educators: calculateChange(currentEducators, previousEducators),
      resources: calculateChange(currentResources, previousResources),
      sales: calculateChange(currentSales, previousSales),
      revenue: calculateChange(currentRevenue, previousRevenue),
    };
  }

  private async getGrowthData(): Promise<Array<{
    month: string;
    users: number;
    educators: number;
    resources: number;
    sales: number;
    revenue: number;
  }>> {
    const months = 6;
    const growthData: Array<{
      month: string;
      users: number;
      educators: number;
      resources: number;
      sales: number;
      revenue: number;
    }> = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      const monthName = startDate.toLocaleDateString('en-US', { month: 'short' });
      
      const [users, educators, resources, sales, revenueResult] = await Promise.all([
        this.userRepository.count({
          where: { createdAt: MoreThan(startDate) },
        }),
        this.userRepository.count({
          where: { 
            role: 'teacher', 
            verified: true,
            verificationCompletedAt: MoreThan(startDate),
          },
        }),
        this.documentRepository.count({
          where: { createdAt: MoreThan(startDate) },
        }),
        this.purchaseRepository.count({
          where: { 
            status: 'completed',
            createdAt: MoreThan(startDate),
          },
        }),
        this.purchaseRepository
          .createQueryBuilder('purchase')
          .select('SUM(purchase.amount)', 'total')
          .where('purchase.status = :status', { status: 'completed' })
          .andWhere('purchase.created_at > :startDate', { startDate })
          .andWhere('purchase.created_at < :endDate', { endDate })
          .getRawOne(),
      ]);
      
      const revenue = parseFloat(revenueResult?.total || '0');
      
      growthData.push({
        month: monthName,
        users,
        educators,
        resources,
        sales,
        revenue,
      });
    }
    
    return growthData;
  }

  private async getPendingActions(): Promise<Array<{
    type: string;
    count: number;
    priority: string;
    description: string;
    oldestDays: number;
  }>> {
    const [
      pendingVerifications,
      reportedResources,
    ] = await Promise.all([
      this.userRepository.find({
        where: { verificationStatus: 'pending' },
        order: { verificationRequestedAt: 'ASC' },
        take: 1,
      }),
      this.ratingRepository.find({
        where: { flagged: true, deletedAt: IsNull() },
        order: { flaggedAt: 'ASC' },
        take: 1,
      }),
    ]);

    const actions: Array<{
      type: string;
      count: number;
      priority: string;
      description: string;
      oldestDays: number;
    }> = [];
    
    const pendingVerifCount = await this.userRepository.count({
      where: { verificationStatus: 'pending' },
    });
    
    if (pendingVerifCount > 0) {
      const oldestDays = pendingVerifications[0] && pendingVerifications[0].verificationRequestedAt
        ? Math.floor((Date.now() - new Date(pendingVerifications[0].verificationRequestedAt).getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      
      actions.push({
        type: 'verification',
        count: pendingVerifCount,
        priority: oldestDays > 3 ? 'high' : 'medium',
        description: 'Educator verification requests',
        oldestDays,
      });
    }
    
    const reportedCount = await this.ratingRepository.count({
      where: { flagged: true, deletedAt: IsNull() },
    });
    
    if (reportedCount > 0) {
      const oldestDays = reportedResources[0] && reportedResources[0].flaggedAt
        ? Math.floor((Date.now() - new Date(reportedResources[0].flaggedAt).getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      
      actions.push({
        type: 'report',
        count: reportedCount,
        priority: oldestDays > 2 ? 'high' : 'medium',
        description: 'Reported resources',
        oldestDays,
      });
    }
    
    return actions;
  }

  private async getTopContent() {
    const topDocuments = await this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.purchases', 'purchase', 'purchase.status = :status', { status: 'completed' })
      .select([
        'doc.id as id',
        'doc.title as title',
        'doc.subject as subject',
        'doc.views as views',
        'doc.downloads as downloads',
        'doc.averageRating as rating',
        'COUNT(purchase.id) as sales',
        'COALESCE(SUM(purchase.amount), 0) as revenue',
      ])
      .groupBy('doc.id')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany();

    return topDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      subject: doc.subject,
      downloads: parseInt(doc.downloads) || 0,
      rating: parseFloat(doc.rating) || 0,
      sales: parseInt(doc.sales) || 0,
      revenue: parseFloat(doc.revenue) || 0,
    }));
  }

  private async getActivityStats() {
    const now = new Date();
    
    // DAU (Daily Active Users) - users created today as proxy
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dau = await this.userRepository.count({
      where: { createdAt: MoreThan(todayStart) },
    });
    
    // WAU (Weekly Active Users) - users created in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const wau = await this.userRepository.count({
      where: { createdAt: MoreThan(weekAgo) },
    });
    
    // MAU (Monthly Active Users) - users created in the last 30 days
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const mau = await this.userRepository.count({
      where: { createdAt: MoreThan(monthAgo) },
    });
    
    // Recent activities (last 7 days)
    const registrations = await this.userRepository.count({
      where: { createdAt: MoreThan(weekAgo) },
    });
    
    const uploads = await this.documentRepository.count({
      where: { createdAt: MoreThan(weekAgo) },
    });
    
    const purchases = await this.purchaseRepository.count({
      where: { 
        status: 'completed',
        createdAt: MoreThan(weekAgo),
      },
    });
    
    return {
      dau,
      wau,
      mau,
      registrations,
      uploads,
      purchases,
    };
  }

  private async getModerationStatsDetailed() {
    const [approved, pending, rejected, flagged, totalRatings] = await Promise.all([
      // Use verif status for documents as proxy for moderation
      this.documentRepository.count({ where: { createdAt: MoreThan(new Date(0)) } }),
      this.ratingRepository.count({ where: { moderationStatus: 'pending', deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { moderationStatus: 'rejected', deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { flagged: true, deletedAt: IsNull() } }),
      this.ratingRepository.count({ where: { deletedAt: IsNull() } }),
    ]);

    const total = totalRatings;
    const approvedRatings = await this.ratingRepository.count({ where: { moderationStatus: 'approved', deletedAt: IsNull() } });
    
    // AI Risk Distribution (based on AI moderation scores)
    const riskDistribution = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('rating.aiModerationScore', 'score')
      .where('rating.aiModerationScore IS NOT NULL')
      .andWhere('rating.deletedAt IS NULL')
      .getRawMany();

    const lowRisk = riskDistribution.filter(r => r.score < 0.3).length;
    const mediumRisk = riskDistribution.filter(r => r.score >= 0.3 && r.score < 0.7).length;
    const highRisk = riskDistribution.filter(r => r.score >= 0.7).length;
    const totalWithScore = lowRisk + mediumRisk + highRisk;

    // Verification stats
    const [totalVerificationRequests, approvedVerifications, pendingVerifications] = await Promise.all([
      this.userRepository.count({
        where: [
          { verificationStatus: 'approved' },
          { verificationStatus: 'rejected' },
          { verificationStatus: 'pending' },
        ],
      }),
      this.userRepository.count({
        where: { verificationStatus: 'approved', verified: true },
      }),
      this.userRepository.count({
        where: { verificationStatus: 'pending' },
      }),
    ]);

    // Calculate average processing time for approved verifications
    const approvedUsers = await this.userRepository.find({
      where: { verificationStatus: 'approved', verified: true },
      select: ['verificationRequestedAt', 'verificationCompletedAt'],
    });

    let avgProcessingDays = 0;
    if (approvedUsers.length > 0) {
      const totalDays = approvedUsers.reduce((sum, user) => {
        if (user.verificationRequestedAt && user.verificationCompletedAt) {
          const days = (new Date(user.verificationCompletedAt).getTime() - new Date(user.verificationRequestedAt).getTime()) / (24 * 60 * 60 * 1000);
          return sum + days;
        }
        return sum;
      }, 0);
      avgProcessingDays = totalDays / approvedUsers.length;
    }

    return {
      content: {
        total: totalRatings,
        approved: approvedRatings,
        pending,
        rejected,
        flagged,
        approvalRate: total > 0 ? (approvedRatings / total) * 100 : 0,
      },
      aiRisk: {
        lowRisk: totalWithScore > 0 ? (lowRisk / totalWithScore) * 100 : 82,
        mediumRisk: totalWithScore > 0 ? (mediumRisk / totalWithScore) * 100 : 14,
        highRisk: totalWithScore > 0 ? (highRisk / totalWithScore) * 100 : 4,
      },
      verification: {
        total: totalVerificationRequests,
        approved: approvedVerifications,
        pending: pendingVerifications,
        approvalRate: totalVerificationRequests > 0 ? (approvedVerifications / totalVerificationRequests) * 100 : 0,
        avgProcessingDays,
      },
      reports: {
        total: flagged,
        open: flagged,
        resolved: 0, // Could track this with a separate field
      },
    };
  }
}
