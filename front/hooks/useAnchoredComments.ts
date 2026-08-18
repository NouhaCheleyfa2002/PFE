"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-context";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  elementId: string;
  elementType: string;
  questionId?: string;
  parentId?: string;
  resolved: boolean;
  createdAt: Date;
  replies?: Comment[];
}

export function useAnchoredComments(examId: string, elementId?: string) {
  const { socket, isConnected } = useWebSocket();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!examId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const url = elementId
        ? `http://localhost:3000/collaboration/exams/${examId}/comments?elementId=${elementId}`
        : `http://localhost:3000/collaboration/exams/${examId}/comments`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const commentsWithDates = data.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          replies: comment.replies?.map((reply: any) => ({
            ...reply,
            createdAt: new Date(reply.createdAt),
          })) || [],
        }));
        setComments(commentsWithDates);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  }, [examId, elementId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewComment = (data: any) => {
      if (data.examId === examId && (!elementId || data.elementId === elementId)) {
        const newComment: Comment = {
          id: data.id,
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          elementId: data.elementId,
          elementType: data.elementType,
          questionId: data.questionId,
          resolved: false,
          createdAt: new Date(data.timestamp),
          replies: [],
        };

        setComments(prev => [...prev, newComment]);
      }
    };

    socket.on('exam:comment', handleNewComment);

    return () => {
      socket.off('exam:comment', handleNewComment);
    };
  }, [socket, isConnected, examId, elementId]);

  const addComment = useCallback(async (content: string, targetElementId?: string) => {
    if (!examId || !content.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/collaboration/exams/${examId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          elementId: targetElementId || elementId,
          elementType: 'question',
        }),
      });

      if (response.ok) {
        // Comment will be added via WebSocket event
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [examId, elementId]);

  const replyToComment = useCallback(async (commentId: string, content: string) => {
    if (!examId || !content.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/collaboration/exams/${examId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          parentId: commentId,
          elementId,
          elementType: 'question',
        }),
      });

      if (response.ok) {
        await fetchComments(); // Refresh to get replies
      }
    } catch (error) {
      console.error('Failed to reply to comment:', error);
      throw error;
    }
  }, [examId, elementId, fetchComments]);

  const resolveComment = useCallback(async (commentId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/collaboration/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolved: true,
        }),
      });

      if (response.ok) {
        setComments(prev =>
          prev.map(comment =>
            comment.id === commentId ? { ...comment, resolved: true } : comment
          )
        );
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      throw error;
    }
  }, []);

  const getCommentsByElement = useCallback((targetElementId: string) => {
    return comments.filter(c => c.elementId === targetElementId);
  }, [comments]);

  const getUnresolvedCount = useCallback((targetElementId: string) => {
    return comments.filter(c => c.elementId === targetElementId && !c.resolved).length;
  }, [comments]);

  return {
    comments,
    loading,
    addComment,
    replyToComment,
    resolveComment,
    getCommentsByElement,
    getUnresolvedCount,
    refetch: fetchComments,
  };
}
