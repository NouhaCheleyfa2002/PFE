import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  TimeRangeDto,
  LeaderboardDto,
  ActivityChartDto,
  ExportReportDto,
  ExportFormatEnum,
} from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get platform-wide statistics
   * Accessible by: Admin only
   */
  @Get('platform-stats')
  @Roles('admin')
  async getPlatformStats(@Query() timeRangeDto: TimeRangeDto) {
    const stats = await this.analyticsService.getPlatformStats(
      timeRangeDto.range,
    );

    return {
      success: true,
      stats,
    };
  }

  /**
   * Get contribution leaderboard
   * Accessible by: Admin and verified teachers
   */
  @Get('leaderboard')
  @Roles('admin', 'teacher')
  async getLeaderboard(@Query() leaderboardDto: LeaderboardDto) {
    const { category, limit, range } = leaderboardDto;

    const leaderboard = await this.analyticsService.getLeaderboard(
      category,
      limit,
      range,
    );

    return {
      success: true,
      ...leaderboard,
    };
  }

  /**
   * Get activity chart data
   * Accessible by: Admin only
   */
  @Get('activity-chart')
  @Roles('admin')
  async getActivityChart(@Query() activityChartDto: ActivityChartDto) {
    const { activityType, groupBy, range } = activityChartDto;

    const chartData = await this.analyticsService.getActivityChart(
      activityType,
      groupBy,
      range,
    );

    return {
      success: true,
      ...chartData,
    };
  }

  /**
   * Get activity trends (comparison with previous period)
   * Accessible by: Admin only
   */
  @Get('trends')
  @Roles('admin')
  async getActivityTrends(@Query() timeRangeDto: TimeRangeDto) {
    const trends = await this.analyticsService.getActivityTrends(
      timeRangeDto.range,
    );

    return {
      success: true,
      ...trends,
    };
  }

  /**
   * Get user activity report
   * Accessible by: Admin and the user themselves
   */
  @Get('user/:userId')
  async getUserActivityReport(
    @Param('userId') userId: string,
    @Query() timeRangeDto: TimeRangeDto,
  ) {
    const report = await this.analyticsService.getUserActivityReport(
      userId,
      timeRangeDto.range,
    );

    return {
      success: true,
      ...report,
    };
  }

  /**
   * Export analytics report
   * Accessible by: Admin only
   */
  @Get('export')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async exportReport(
    @Query() exportDto: ExportReportDto,
    @Res() res: Response,
  ) {
    const { format, reportType = 'overview', range } = exportDto;

    // Get the data based on report type
    let data: any;
    switch (reportType) {
      case 'overview':
        data = await this.analyticsService.getPlatformStats(range);
        break;
      case 'leaderboard':
        data = await this.analyticsService.getLeaderboard('all', 100, range);
        break;
      case 'trends':
        data = await this.analyticsService.getActivityTrends(range);
        break;
      default:
        data = await this.analyticsService.getPlatformStats(range);
    }

    // Format the response based on requested format
    if (format === ExportFormatEnum.CSV) {
      const csv = this.convertToCSV(data, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=analytics-${reportType}-${Date.now()}.csv`,
      );
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=analytics-${reportType}-${Date.now()}.json`,
      );
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        reportType,
        data,
      });
    }
  }

  /**
   * Helper: Convert data to CSV format
   */
  private convertToCSV(data: any, reportType: string): string {
    let csvLines: string[] = [];

    switch (reportType) {
      case 'overview':
        csvLines.push('Metric,Value');
        csvLines.push(`Total Users,${data.users.total}`);
        csvLines.push(`Total Documents,${data.documents.total}`);
        csvLines.push(`Verified Documents,${data.documents.verified}`);
        csvLines.push(`Pending Documents,${data.documents.pending}`);
        csvLines.push(`Total Questions,${data.questions.total}`);
        csvLines.push(`Total Searches,${data.searches.total}`);
        csvLines.push(`Total Verifications,${data.verifications.total}`);
        csvLines.push(`Approved Verifications,${data.verifications.approved}`);
        csvLines.push(`Pending Verifications,${data.verifications.pending}`);
        csvLines.push(`Rejected Verifications,${data.verifications.rejected}`);
        break;

      case 'leaderboard':
        csvLines.push('Rank,User ID,Email,Role,Score,Uploads,Questions,Verifications,Searches');
        data.leaderboard.forEach((entry: any) => {
          csvLines.push(
            `${entry.rank},${entry.userId},${entry.email},${entry.role},${entry.score},` +
              `${entry.details?.uploads || 0},${entry.details?.questions || 0},` +
              `${entry.details?.verifications || 0},${entry.details?.searches || 0}`,
          );
        });
        break;

      case 'trends':
        csvLines.push('Activity Type,Current,Previous,Change %,Trend');
        data.trends.forEach((trend: any) => {
          csvLines.push(
            `${trend.activityType},${trend.current},${trend.previous},${trend.change},${trend.trend}`,
          );
        });
        break;

      default:
        csvLines.push('Data');
        csvLines.push(JSON.stringify(data));
    }

    return csvLines.join('\n');
  }
}
