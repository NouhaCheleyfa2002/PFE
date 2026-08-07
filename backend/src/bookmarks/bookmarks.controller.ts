import { Controller, Post, Delete, Get, Param, Request, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  /**
   * Add a bookmark
   */
  @Post(':documentId')
  async addBookmark(@Param('documentId') documentId: string, @Request() req: any) {
    const userId = req.user.sub;
    const bookmark = await this.bookmarksService.addBookmark(userId, documentId);
    return {
      message: 'Bookmark added successfully',
      bookmark,
    };
  }

  /**
   * Remove a bookmark
   */
  @Delete(':documentId')
  @HttpCode(200)
  async removeBookmark(@Param('documentId') documentId: string, @Request() req: any) {
    const userId = req.user.sub;
    await this.bookmarksService.removeBookmark(userId, documentId);
    return {
      message: 'Bookmark removed successfully',
    };
  }

  /**
   * Check if document is bookmarked
   */
  @Get('check/:documentId')
  async checkBookmark(@Param('documentId') documentId: string, @Request() req: any) {
    const userId = req.user.sub;
    const isBookmarked = await this.bookmarksService.isBookmarked(userId, documentId);
    return {
      isBookmarked,
    };
  }

  /**
   * Get all user's bookmarks
   */
  @Get()
  async getUserBookmarks(@Request() req: any) {
    const userId = req.user.sub;
    const bookmarks = await this.bookmarksService.getUserBookmarks(userId);
    return {
      bookmarks,
      total: bookmarks.length,
    };
  }
}
