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
    const rating = await this.ratingsService.getUserRating(resourceId, req.user.sub);
    const canRate = await this.ratingsService.canUserRate(resourceId, req.user.sub);
    return { rating, canRate };
  }

  // Get all ratings for a resource
  @Get('resources/:resourceId')
  async getResourceRatings(
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.ratingsService.getResourceRatings(
      resourceId,
      limit ? parseInt(limit.toString()) : 50,
      offset ? parseInt(offset.toString()) : 0,
    );
  }

  // Get rating statistics for a resource
  @Get('resources/:resourceId/stats')
  async getRatingStats(@Param('resourceId') resourceId: string) {
    return await this.ratingsService.getRatingStats(resourceId);
  }

  // Get popular tags for a resource
  @Get('resources/:resourceId/tags')
  async getPopularTags(@Param('resourceId') resourceId: string) {
    return await this.ratingsService.getPopularTags(resourceId);
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
    await this.ratingsService.trackDownload(resourceId, req.user.sub);
    return { message: 'Download tracked' };
  }

  // Check if user has downloaded
  @Get('resources/:resourceId/has-downloaded')
  async hasDownloaded(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const hasDownloaded = await this.ratingsService.hasDownloaded(resourceId, req.user.sub);
    return { hasDownloaded };
  }

  // Bookmark resource
  @Post('resources/:resourceId/bookmark')
  async bookmarkResource(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const bookmark = await this.ratingsService.bookmarkResource(resourceId, req.user.sub);
    return { message: 'Resource bookmarked', bookmark };
  }

  // Remove bookmark
  @Delete('resources/:resourceId/bookmark')
  async removeBookmark(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    await this.ratingsService.removeBookmark(resourceId, req.user.sub);
    return { message: 'Bookmark removed' };
  }

  // Check if bookmarked
  @Get('resources/:resourceId/is-bookmarked')
  async isBookmarked(
    @Param('resourceId') resourceId: string,
    @Req() req: any,
  ) {
    const isBookmarked = await this.ratingsService.isBookmarked(resourceId, req.user.sub);
    return { isBookmarked };
  }

  // Get user's bookmarks
  @Get('my-bookmarks')
  async getMyBookmarks(@Req() req: any) {
    const bookmarks = await this.ratingsService.getUserBookmarks(req.user.sub);
    return { bookmarks };
  }
}
