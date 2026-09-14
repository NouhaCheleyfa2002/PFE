import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, VoteRatingDto } from './dto/rating.dto';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // Rate a resource
  @Post('resources/:resourceId')
  async rateResource(
    @Param('resourceId') resourceId: string,
    @Body() createRatingDto: CreateRatingDto,
    @Req() req: any,
  ) {
    const rating = await this.ratingsService.rateResource(
      resourceId,
      req.user.sub,
      createRatingDto,
    );
    return { message: 'Rating submitted successfully', rating };
  }

  // Get user's rating for a resource
  @Get('resources/:resourceId/my-rating')
  async getMyRating(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const rating = await this.ratingsService.getUserRating(resourceId, req.user.sub, 'document');
    const canRate = await this.ratingsService.canUserRate(resourceId, req.user.sub, 'document');
    return { rating, canRate };
  }

  // Get all ratings for a resource
  @Get('resources/:resourceId')
  async getResourceRatings(
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.ratingsService.getResourceRatings(
      resourceId,
      'document', // Default to document for backward compatibility
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  // Get rating statistics for a resource
  @Get('resources/:resourceId/stats')
  async getRatingStats(@Param('resourceId') resourceId: string) {
    return await this.ratingsService.getRatingStats(resourceId, 'document');
  }

  // Get popular tags for a resource
  @Get('resources/:resourceId/tags')
  async getPopularTags(@Param('resourceId') resourceId: string) {
    return await this.ratingsService.getPopularTags(resourceId, 'document');
  }

  // Vote on a rating
  @Post(':ratingId/vote')
  async voteOnRating(
    @Param('ratingId') ratingId: string,
    @Body() voteDto: VoteRatingDto,
    @Req() req: any,
  ) {
    const vote = await this.ratingsService.voteOnRating(
      ratingId,
      req.user.sub,
      voteDto.voteType,
    );
    return { message: 'Vote recorded', vote };
  }

  // Delete own rating
  @Delete(':ratingId')
  async deleteRating(
    @Param('ratingId') ratingId: string,
    @Req() req: any,
  ) {
    await this.ratingsService.deleteRating(ratingId, req.user.sub);
    return { message: 'Rating deleted successfully' };
  }

  // Track download
  @Post('resources/:resourceId/download')
  async trackDownload(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    await this.ratingsService.trackDownload(resourceId, req.user.sub, 'document');
    return { message: 'Download tracked' };
  }

  // Check if user has downloaded
  @Get('resources/:resourceId/has-downloaded')
  async hasDownloaded(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const hasDownloaded = await this.ratingsService.hasDownloaded(resourceId, req.user.sub, 'document');
    return { hasDownloaded };
  }

  // Bookmark resource
  @Post('resources/:resourceId/bookmark')
  async bookmarkResource(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const bookmark = await this.ratingsService.bookmarkResource(resourceId, req.user.sub, 'document');
    return { message: 'Resource bookmarked', bookmark };
  }

  // Remove bookmark
  @Delete('resources/:resourceId/bookmark')
  async removeBookmark(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    await this.ratingsService.removeBookmark(resourceId, req.user.sub, 'document');
    return { message: 'Bookmark removed' };
  }

  // Check if bookmarked
  @Get('resources/:resourceId/is-bookmarked')
  async isBookmarked(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const isBookmarked = await this.ratingsService.isBookmarked(resourceId, req.user.sub, 'document');
    return { isBookmarked };
  }

  // Get user's bookmarks
  @Get('my-bookmarks')
  async getMyBookmarks(@Req() req: any) {
    const bookmarks = await this.ratingsService.getUserBookmarks(req.user.sub);
    return { bookmarks };
  }
}

// ===== EXAM-SPECIFIC ENDPOINTS =====

@Controller('ratings/exams')
@UseGuards(JwtAuthGuard)
export class ExamRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  // Rate an exam
  @Post(':examId')
  async rateExam(
    @Param('examId') examId: string,
    @Body() createRatingDto: CreateRatingDto,
    @Req() req: any,
  ) {
    createRatingDto.resourceType = 'exam';
    const rating = await this.ratingsService.rateResource(
      examId,
      req.user.sub,
      createRatingDto,
    );
    return { message: 'Exam rating submitted successfully', rating };
  }

  // Get user's rating for an exam
  @Get(':examId/my-rating')
  async getMyExamRating(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    const rating = await this.ratingsService.getUserRating(examId, req.user.sub, 'exam');
    const canRate = await this.ratingsService.canUserRate(examId, req.user.sub, 'exam');
    return { rating, canRate };
  }

  // Get all ratings for an exam
  @Get(':examId/ratings')
  async getExamRatings(
    @Param('examId') examId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return await this.ratingsService.getResourceRatings(
      examId,
      'exam',
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  // Get rating statistics for an exam
  @Get(':examId/stats')
  async getExamRatingStats(@Param('examId') examId: string) {
    return await this.ratingsService.getRatingStats(examId, 'exam');
  }

  // Get popular tags for an exam
  @Get(':examId/tags')
  async getExamPopularTags(@Param('examId') examId: string) {
    return await this.ratingsService.getPopularTags(examId, 'exam');
  }

  // Track exam usage (view/download)
  @Post(':examId/usage')
  async trackExamUsage(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    try {
      await this.ratingsService.trackDownload(examId, req.user.sub, 'exam');
      return { message: 'Exam usage tracked', success: true };
    } catch (error) {
      console.error('[ExamRatingsController] Failed to track usage:', error);
      throw error;
    }
  }

  // Check if user has used exam
  @Get(':examId/has-used')
  async hasUsedExam(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    const hasUsed = await this.ratingsService.hasDownloaded(examId, req.user.sub, 'exam');
    return { hasUsed };
  }

  // Bookmark exam
  @Post(':examId/bookmark')
  async bookmarkExam(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    const bookmark = await this.ratingsService.bookmarkResource(examId, req.user.sub, 'exam');
    return { message: 'Exam bookmarked', bookmark };
  }

  // Remove exam bookmark
  @Delete(':examId/bookmark')
  async removeExamBookmark(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    await this.ratingsService.removeBookmark(examId, req.user.sub, 'exam');
    return { message: 'Exam bookmark removed' };
  }

  // Check if exam is bookmarked
  @Get(':examId/is-bookmarked')
  async isExamBookmarked(
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    const isBookmarked = await this.ratingsService.isBookmarked(examId, req.user.sub, 'exam');
    return { isBookmarked };
  }
}
