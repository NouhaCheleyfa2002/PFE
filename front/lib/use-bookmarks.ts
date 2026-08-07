import { useState, useCallback } from 'react';
import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleBookmark = useCallback(async (documentId: string): Promise<boolean> => {
    const token = authService.getToken();
    if (!token) return false;

    const isCurrentlyBookmarked = bookmarkedIds.has(documentId);

    try {
      setLoading(true);

      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const response = await fetch(`${API_URL}/bookmarks/${documentId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setBookmarkedIds(prev => {
            const next = new Set(prev);
            next.delete(documentId);
            return next;
          });
          return false;
        }
      } else {
        // Add bookmark
        const response = await fetch(`${API_URL}/bookmarks/${documentId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setBookmarkedIds(prev => new Set(prev).add(documentId));
          return true;
        }
      }
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
    } finally {
      setLoading(false);
    }

    return isCurrentlyBookmarked;
  }, [bookmarkedIds]);

  const checkBookmark = useCallback(async (documentId: string): Promise<boolean> => {
    const token = authService.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/bookmarks/check/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isBookmarked) {
          setBookmarkedIds(prev => new Set(prev).add(documentId));
        }
        return data.isBookmarked;
      }
    } catch (error) {
      console.error('Check bookmark failed:', error);
    }

    return false;
  }, []);

  const fetchBookmarks = useCallback(async () => {
    const token = authService.getToken();
    if (!token) return [];

    try {
      const response = await fetch(`${API_URL}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        return data.bookmarks || [];
      }
    } catch (error) {
      console.error('Fetch bookmarks failed:', error);
    }

    return [];
  }, []);

  const isBookmarked = useCallback((documentId: string) => {
    return bookmarkedIds.has(documentId);
  }, [bookmarkedIds]);

  return {
    toggleBookmark,
    checkBookmark,
    fetchBookmarks,
    isBookmarked,
    loading,
  };
}
