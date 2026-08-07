import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookmarkEntity } from './entities/bookmark.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(BookmarkEntity)
    private readonly bookmarkRepository: Repository<BookmarkEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
  ) {}

  /**
   * Add a bookmark
   */
  async addBookmark(userId: string, documentId: string): Promise<BookmarkEntity> {
    // Check if document exists
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if already bookmarked
    const existing = await this.bookmarkRepository.findOne({
      where: { userId, documentId },
    });

    if (existing) {
      throw new ConflictException('Document already bookmarked');
    }

    // Create bookmark
    const bookmark = this.bookmarkRepository.create({
      userId,
      documentId,
    });

    return this.bookmarkRepository.save(bookmark);
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, documentId: string): Promise<void> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { userId, documentId },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.remove(bookmark);
  }

  /**
   * Check if user has bookmarked a document
   */
  async isBookmarked(userId: string, documentId: string): Promise<boolean> {
    const count = await this.bookmarkRepository.count({
      where: { userId, documentId },
    });
    return count > 0;
  }

  /**
   * Get all bookmarks for a user with document details
   */
  async getUserBookmarks(userId: string): Promise<any[]> {
    const bookmarks = await this.bookmarkRepository.find({
      where: { userId },
      relations: ['document'],
      order: { createdAt: 'DESC' },
    });

    // Transform to include document details
    return bookmarks.map(bookmark => ({
      id: bookmark.id,
      bookmarkedAt: bookmark.createdAt,
      document: {
        id: bookmark.document.id,
        title: bookmark.document.title,
        originalName: bookmark.document.originalName,
        subject: bookmark.document.subject,
        classLevel: bookmark.document.classLevel,
        resourceType: bookmark.document.resourceType,
        storageUrl: bookmark.document.storageUrl,
        mimeType: bookmark.document.mimeType,
        views: bookmark.document.views,
        downloads: bookmark.document.downloads,
        createdAt: bookmark.document.createdAt,
      },
    }));
  }

  /**
   * Get bookmark count for a document
   */
  async getDocumentBookmarkCount(documentId: string): Promise<number> {
    return this.bookmarkRepository.count({ where: { documentId } });
  }
}
