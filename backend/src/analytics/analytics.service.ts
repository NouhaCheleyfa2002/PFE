import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityLogEntity } from './entities/activity-log.entity';
import { TimeRangeEnum } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly activityLogRepo: Repository<ActivityLogEntity>,
  ) {}

  /**
   * Log an activity
   */
  async logActivity(
    userId: string,
    activityType: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const log = this.activityLogRepo.create({
        userId,
        activityType,
        resourceType,
        resourceId,
        metadata,
      });
      await this.activityLogRepo.save(log);
    } catch (error) {
      this.logger.error('Failed to log activity:', error);
      // Don't throw - logging should not break main functionality
    }
  }

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(range: TimeRangeEnum = TimeRangeEnum.MONTH) {
    const { startDate, endDate } = this.getDateRange(range);

    try {
      // Total users
      const totalUsersQuery = `
        SELECT COUNT(DISTINCT id) as total
        FROM users
        WHERE created_at BETWEEN $1 AND $2
      `;

      // Total documents
      const totalDocsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_verified = true) as verified,
          COUNT(*) FILTER (WHERE verification_status = 'pending') as pending
        FROM documents
        WHERE created_at BETWEEN $1 AND $2
      `;

      // Activity breakdown - safe query
      const activityBreakdownQuery = `
        SELECT 
          activity_type as type,
          COUNT(*) as count
        FROM activity_logs
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY activity_type
        ORDER BY count DESC
      `;

      const [usersResult, docsResult, activityResult] = await Promise.all([
        this.activityLogRepo.query(totalUsersQuery, [startDate, endDate]).catch(() => [{ total: '0' }]),
        this.activityLogRepo.query(totalDocsQuery, [startDate, endDate]).catch(() => [{ total: '0', verified: '0', pending: '0' }]),
        this.activityLogRepo.query(activityBreakdownQuery, [startDate, endDate]).catch(() => []),
      ]);

      // Try to get optional data (these tables might not exist)
      let questionsResult = [{ total: '0' }];
      let searchesResult = [{ total: '0' }];
      let verificationsResult = [{ total: '0', approved: '0', pending: '0', rejected: '0' }];

      try {
        const totalQuestionsQuery = `
          SELECT COUNT(*) as total
          FROM exam_questions
          WHERE created_at BETWEEN $1 AND $2
        `;
        questionsResult = await this.activityLogRepo.query(totalQuestionsQuery, [startDate, endDate]);
      } catch (error) {
        this.logger.warn('exam_questions table not found or query failed');
      }

      try {
        const totalSearchesQuery = `
          SELECT COUNT(*) as total
          FROM search_history
          WHERE created_at BETWEEN $1 AND $2
        `;
        searchesResult = await this.activityLogRepo.query(totalSearchesQuery, [startDate, endDate]);
      } catch (error) {
        this.logger.warn('search_history table not found or query failed');
      }

      try {
        const verificationRequestsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'approved') as approved,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected
          FROM verification_requests
          WHERE created_at BETWEEN $1 AND $2
        `;
        verificationsResult = await this.activityLogRepo.query(verificationRequestsQuery, [startDate, endDate]);
      } catch (error) {
        this.logger.warn('verification_requests table not found or query failed');
      }

      return {
        timeRange: { range, startDate, endDate },
        users: {
          total: parseInt(usersResult[0]?.total || '0', 10),
        },
        documents: {
          total: parseInt(docsResult[0]?.total || '0', 10),
          verified: parseInt(docsResult[0]?.verified || '0', 10),
          pending: parseInt(docsResult[0]?.pending || '0', 10),
        },
        questions: {
          total: parseInt(questionsResult[0]?.total || '0', 10),
        },
        searches: {
          total: parseInt(searchesResult[0]?.total || '0', 10),
        },
        verifications: {
          total: parseInt(verificationsResult[0]?.total || '0', 10),
          approved: parseInt(verificationsResult[0]?.approved || '0', 10),
          pending: parseInt(verificationsResult[0]?.pending || '0', 10),
          rejected: parseInt(verificationsResult[0]?.rejected || '0', 10),
        },
        activityBreakdown: activityResult.map((row: any) => ({
          type: row.type,
          count: parseInt(row.count, 10),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get platform stats:', error);
      // Return empty stats instead of throwing
      return {
        timeRange: { range, startDate, endDate },
        users: { total: 0 },
        documents: { total: 0, verified: 0, pending: 0 },
        questions: { total: 0 },
        searches: { total: 0 },
        verifications: { total: 0, approved: 0, pending: 0, rejected: 0 },
        activityBreakdown: [],
      };
    }
  }

  /**
   * Get contribution leaderboard
   */
  async getLeaderboard(
    category: string = 'all',
    limit: number = 10,
    range: TimeRangeEnum = TimeRangeEnum.MONTH,
  ) {
    const { startDate, endDate } = this.getDateRange(range);

    let query = '';

    switch (category) {
      case 'uploads':
        query = `
          SELECT 
            u.id,
            u.email,
            u.role,
            COUNT(d.id) as score,
            COUNT(d.id) FILTER (WHERE d.is_verified = true) as verified_count
          FROM users u
          LEFT JOIN documents d ON d.uploader_id = u.id 
            AND d.created_at BETWEEN $1 AND $2
          GROUP BY u.id, u.email, u.role
          HAVING COUNT(d.id) > 0
          ORDER BY score DESC
          LIMIT $3
        `;
        break;

      case 'questions':
        query = `
          SELECT 
            u.id,
            u.email,
            u.role,
            COUNT(DISTINCT al.id) as score
          FROM users u
          LEFT JOIN activity_logs al ON al.user_id = u.id 
            AND al.activity_type = 'question_generated'
            AND al.created_at BETWEEN $1 AND $2
          GROUP BY u.id, u.email, u.role
          HAVING COUNT(DISTINCT al.id) > 0
          ORDER BY score DESC
          LIMIT $3
        `;
        break;

      case 'verifications':
        query = `
          SELECT 
            u.id,
            u.email,
            u.role,
            COUNT(d.id) as score
          FROM users u
          LEFT JOIN documents d ON d.verified_by = u.id 
            AND d.verified_at BETWEEN $1 AND $2
          GROUP BY u.id, u.email, u.role
          HAVING COUNT(d.id) > 0
          ORDER BY score DESC
          LIMIT $3
        `;
        break;

      default: // 'all'
        query = `
          SELECT 
            u.id,
            u.email,
            u.role,
            (
              COALESCE(uploads.count, 0) * 10 +
              COALESCE(questions.count, 0) * 5 +
              COALESCE(verifications.count, 0) * 3 +
              COALESCE(searches.count, 0)
            ) as score,
            COALESCE(uploads.count, 0) as uploads_count,
            COALESCE(questions.count, 0) as questions_count,
            COALESCE(verifications.count, 0) as verifications_count,
            COALESCE(searches.count, 0) as searches_count
          FROM users u
          LEFT JOIN (
            SELECT uploader_id, COUNT(*) as count
            FROM documents
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY uploader_id
          ) uploads ON uploads.uploader_id = u.id
          LEFT JOIN (
            SELECT user_id, COUNT(*) as count
            FROM activity_logs
            WHERE activity_type = 'question_generated'
              AND created_at BETWEEN $1 AND $2
            GROUP BY user_id
          ) questions ON questions.user_id = u.id
          LEFT JOIN (
            SELECT verified_by, COUNT(*) as count
            FROM documents
            WHERE verified_at BETWEEN $1 AND $2
            GROUP BY verified_by
          ) verifications ON verifications.verified_by = u.id
          LEFT JOIN (
            SELECT user_id, COUNT(*) as count
            FROM search_history
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY user_id
          ) searches ON searches.user_id = u.id
          WHERE (
            uploads.count > 0 OR 
            questions.count > 0 OR 
            verifications.count > 0 OR 
            searches.count > 0
          )
          ORDER BY score DESC
          LIMIT $3
        `;
        break;
    }

    const results = await this.activityLogRepo.query(query, [
      startDate,
      endDate,
      limit,
    ]);

    return {
      category,
      timeRange: { range, startDate, endDate },
      leaderboard: results.map((row: any, index: number) => ({
        rank: index + 1,
        userId: row.id,
        email: row.email,
        role: row.role,
        score: parseInt(row.score, 10),
        details:
          category === 'all'
            ? {
                uploads: parseInt(row.uploads_count || '0', 10),
                questions: parseInt(row.questions_count || '0', 10),
                verifications: parseInt(row.verifications_count || '0', 10),
                searches: parseInt(row.searches_count || '0', 10),
              }
            : category === 'uploads'
              ? {
                  verified: parseInt(row.verified_count || '0', 10),
                }
              : undefined,
      })),
    };
  }

  /**
   * Get activity chart data
   */
  async getActivityChart(
    activityType?: string,
    groupBy: string = 'day',
    range: TimeRangeEnum = TimeRangeEnum.MONTH,
  ) {
    const { startDate, endDate } = this.getDateRange(range);

    // Determine the date truncation based on groupBy
    const dateTrunc = this.getDateTruncation(groupBy);

    let query = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', created_at) as period,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at BETWEEN $1 AND $2
    `;

    const params: any[] = [startDate, endDate];

    if (activityType) {
      query += ` AND activity_type = $3`;
      params.push(activityType);
    }

    query += `
      GROUP BY period
      ORDER BY period ASC
    `;

    const results = await this.activityLogRepo.query(query, params);

    return {
      activityType: activityType || 'all',
      groupBy,
      timeRange: { range, startDate, endDate },
      data: results.map((row: any) => ({
        period: row.period,
        count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Get activity trends (comparison with previous period)
   */
  async getActivityTrends(range: TimeRangeEnum = TimeRangeEnum.MONTH) {
    const { startDate, endDate } = this.getDateRange(range);
    const {
      startDate: prevStartDate,
      endDate: prevEndDate,
    } = this.getPreviousPeriod(startDate, endDate);

    const query = `
      SELECT 
        activity_type,
        COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2) as current_count,
        COUNT(*) FILTER (WHERE created_at BETWEEN $3 AND $4) as previous_count
      FROM activity_logs
      WHERE created_at BETWEEN $3 AND $2
      GROUP BY activity_type
    `;

    const results = await this.activityLogRepo.query(query, [
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
    ]);

    return {
      timeRange: {
        current: { startDate, endDate },
        previous: { startDate: prevStartDate, endDate: prevEndDate },
      },
      trends: results.map((row: any) => {
        const current = parseInt(row.current_count, 10);
        const previous = parseInt(row.previous_count, 10);
        const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;

        return {
          activityType: row.activity_type,
          current,
          previous,
          change: parseFloat(change.toFixed(2)),
          trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        };
      }),
    };
  }

  /**
   * Get user activity report
   */
  async getUserActivityReport(userId: string, range: TimeRangeEnum = TimeRangeEnum.MONTH) {
    const { startDate, endDate } = this.getDateRange(range);

    const activities = await this.activityLogRepo.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });

    const activityByType = activities.reduce((acc: any, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {});

    return {
      userId,
      timeRange: { range, startDate, endDate },
      totalActivities: activities.length,
      activityBreakdown: Object.entries(activityByType).map(([type, count]) => ({
        type,
        count,
      })),
      recentActivities: activities.slice(0, 20).map((a) => ({
        id: a.id,
        type: a.activityType,
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Helper: Get date range based on TimeRangeEnum
   */
  private getDateRange(range: TimeRangeEnum): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case TimeRangeEnum.TODAY:
        startDate.setHours(0, 0, 0, 0);
        break;
      case TimeRangeEnum.WEEK:
        startDate.setDate(endDate.getDate() - 7);
        break;
      case TimeRangeEnum.MONTH:
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case TimeRangeEnum.YEAR:
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case TimeRangeEnum.ALL:
        startDate = new Date('2020-01-01'); // Platform start date
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Helper: Get previous period for comparison
   */
  private getPreviousPeriod(
    startDate: Date,
    endDate: Date,
  ): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);

    return { startDate: prevStartDate, endDate: prevEndDate };
  }

  /**
   * Helper: Get date truncation SQL
   */
  private getDateTruncation(groupBy: string): string {
    switch (groupBy) {
      case 'hour':
        return 'hour';
      case 'day':
        return 'day';
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      default:
        return 'day';
    }
  }
}
