import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceRating, RatingVote, ResourceBookmark, ResourceDownload } from './entities/rating.entity';
import { CreateRatingDto, UpdateRatingDto } from './dto/rating.dto';
import { DocumentsService } from '../documents/documents.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectRepository(ResourceRating)
    private ratingsRepository: Repository<ResourceRating>,
    @InjectRepository(RatingVote)
    private votesRepository: Repository<RatingVote>,
    @InjectRepository(ResourceBookmark)
    private bookmarksRepository: Repository<ResourceBookmark>,
    @InjectRepository(ResourceDownload)
    private downloadsRepository: Repository<ResourceDownload>,
    private documentsService: DocumentsService,
    private userNotificationsService: UserNotificationsService,
  ) {}

  // Check if user can rate (must have downloaded the resource)
  async canUserRate(resourceId: string, userId: string): Promise<boolean> {
    const download = await this.downloadsRepository.findOne({
      where: { resourceId, userId },
    });
    return !!download;
  }

  // Create or update rating
  async rateResource(
    resourceId: string,
    userId: string,
    createRatingDto: CreateRatingDto,
  ): Promise<ResourceRating> {
    // Check if user has downloaded the resource
    const hasDownloaded = await this.canUserRate(resourceId, userId);
    if (!hasDownloaded) {
      throw new ForbiddenException('You must download the resource before rating it');
    }

    // Check if rating already exists
    let rating = await this.ratingsRepository.findOne({
      where: { resourceId, teacherId: userId },
    });

    const isNewRating = !rating;

    if (rating) {
      // Update existing rating
      Object.assign(rating, createRatingDto);
      rating.updatedAt = new Date();
    } else {
      // Create new rating
      rating = this.ratingsRepository.create({
        resourceId,
        teacherId: userId,
        ...createRatingDto,
      });
    }

    const savedRating = await this.ratingsRepository.save(rating);

    // Send notification to resource owner for new ratings only
    if (isNewRating) {
      try {
        // Get document to find owner
        const document = await this.documentsService.findById(resourceId);
        if (document && document.userId !== userId) {
          // Don't notify if user rates their own resource
          await this.userNotificationsService.notifyNewReview(
            document.userId,
            resourceId,
            document.title || document.originalName,
            createRatingDto.overallRating,
            createRatingDto.review || 'No comment provided'
          );

          // Check if rating improved the average
          const stats = await this.getRatingStats(resourceId);
          if (stats.averageRating >= 4.5 && stats.totalRatings >= 5) {
            await this.userNotificationsService.notifyRatingIncreased(
              document.userId,
              stats.averageRating
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to send rating notification: ${error.message}`);
      }
    }

    return savedRating;
  }

  // Get user's rating for a resource
  async getUserRating(resourceId: string, userId: string): Promise<ResourceRating | null> {
    return await this.ratingsRepository.findOne({
      where: { resourceId, teacherId: userId },
      relations: ['teacher'],
    });
  }

  // Get all ratings for a resource
  async getResourceRatings(resourceId: string, limit = 50, offset = 0) {
    const [ratings, total] = await this.ratingsRepository.findAndCount({
      where: { resourceId },
      relations: ['teacher'],
      order: {
        helpfulVotes: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });

    return { ratings, total };
  }

  // Get rating statistics for a resource
  async getRatingStats(resourceId: string) {
    const ratings = await this.ratingsRepository.find({
      where: { resourceId },
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        averageQuality: 0,
        averageAccuracy: 0,
        averageUsability: 0,
        recommendPercentage: 0,
      };
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let qualitySum = 0, qualityCount = 0;
    let accuracySum = 0, accuracyCount = 0;
    let usabilitySum = 0, usabilityCount = 0;
    let recommendCount = 0, recommendTotal = 0;

    ratings.forEach((rating) => {
      distribution[rating.overallRating]++;
      
      if (rating.qualityRating) {
        qualitySum += rating.qualityRating;
        qualityCount++;
      }
      if (rating.accuracyRating) {
        accuracySum += rating.accuracyRating;
        accuracyCount++;
      }
      if (rating.usabilityRating) {
        usabilitySum += rating.usabilityRating;
        usabilityCount++;
      }
      if (rating.wouldRecommend !== null && rating.wouldRecommend !== undefined) {
        if (rating.wouldRecommend) recommendCount++;
        recommendTotal++;
      }
    });

    const averageRating = ratings.reduce((sum, r) => sum + r.overallRating, 0) / ratings.length;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      distribution,
      averageQuality: qualityCount > 0 ? Math.round((qualitySum / qualityCount) * 10) / 10 : 0,
      averageAccuracy: accuracyCount > 0 ? Math.round((accuracySum / accuracyCount) * 10) / 10 : 0,
      averageUsability: usabilityCount > 0 ? Math.round((usabilitySum / usabilityCount) * 10) / 10 : 0,
      recommendPercentage: recommendTotal > 0 ? Math.round((recommendCount / recommendTotal) * 100) : 0,
    };
  }

  // Vote on a rating (helpful/not helpful)
  async voteOnRating(
    ratingId: string,
    userId: string,
    voteType: 'helpful' | 'not_helpful',
  ): Promise<RatingVote> {
    // Check if vote already exists
    let vote = await this.votesRepository.findOne({
      where: { ratingId, voterId: userId },
    });

    if (vote) {
      // Update existing vote
      vote.voteType = voteType;
    } else {
      // Create new vote
      vote = this.votesRepository.create({
        ratingId,
        voterId: userId,
        voteType,
      });
    }

    return await this.votesRepository.save(vote);
  }

  // Track resource download
  async trackDownload(resourceId: string, userId: string): Promise<void> {
    // Check if already downloaded
    const existing = await this.downloadsRepository.findOne({
      where: { resourceId, userId },
    });
    
    if (!existing) {
      const download = this.downloadsRepository.create({
        resourceId,
        userId,
      });
      await this.downloadsRepository.save(download);
      
      // Also increment the downloads count in documents table
      await this.documentsService.incrementDownloads(resourceId);
    }
  }

  // Check if user has downloaded a resource
  async hasDownloaded(resourceId: string, userId: string): Promise<boolean> {
    const download = await this.downloadsRepository.findOne({
      where: { resourceId, userId },
    });
    return !!download;
  }

  // Bookmark resource
  async bookmarkResource(resourceId: string, userId: string): Promise<ResourceBookmark> {
    // Check if already bookmarked
    const existing = await this.bookmarksRepository.findOne({
      where: { resourceId, userId },
    });

    if (existing) {
      throw new BadRequestException('Resource already bookmarked');
    }

    const bookmark = this.bookmarksRepository.create({
      resourceId,
      userId,
    });

    return await this.bookmarksRepository.save(bookmark);
  }

  // Remove bookmark
  async removeBookmark(resourceId: string, userId: string): Promise<void> {
    await this.bookmarksRepository.delete({ resourceId, userId });
  }

  // Check if resource is bookmarked
  async isBookmarked(resourceId: string, userId: string): Promise<boolean> {
    const bookmark = await this.bookmarksRepository.findOne({
      where: { resourceId, userId },
    });
    return !!bookmark;
  }

  // Get user's bookmarks
  async getUserBookmarks(userId: string) {
    return await this.bookmarksRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // Delete rating
  async deleteRating(ratingId: string, userId: string): Promise<void> {
    const rating = await this.ratingsRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (rating.teacherId !== userId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    await this.ratingsRepository.delete(ratingId);
  }

  // Get common tags from all ratings
  async getPopularTags(resourceId: string) {
    const ratings = await this.ratingsRepository.find({
      where: { resourceId },
      select: ['tags'],
    });

    const tagCounts: Record<string, number> = {};
    ratings.forEach((rating) => {
      rating.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }
}
