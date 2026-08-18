"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

interface LiveCommentsProps {
  examId: string;
  questionId?: string;
}

export default function LiveComments({ examId, questionId }: LiveCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    fetchComments();
  }, [examId, questionId]);

  useEffect(() => {
    // Listen for new comments via WebSocket
    if (socket && isConnected) {
      const handleNewComment = (data: any) => {
        if (data.examId === examId && (!questionId || data.questionId === questionId)) {
          const comment: Comment = {
            id: data.id,
            userId: data.userId,
            userName: data.userName,
            content: data.content,
            createdAt: new Date(data.timestamp),
          };
          
          setComments(prev => [...prev, comment]);
          
          // Increment unread count if panel is closed
          if (!isOpen) {
            setUnreadCount(prev => prev + 1);
          }
        }
      };

      socket.on('exam:comment', handleNewComment);

      return () => {
        socket.off('exam:comment', handleNewComment);
      };
    }
  }, [socket, isConnected, examId, questionId, isOpen]);

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const url = questionId 
        ? `http://localhost:3000/collaboration/exams/${examId}/comments?questionId=${questionId}`
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
        }));
        setComments(commentsWithDates);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/collaboration/exams/${examId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          questionId: questionId || undefined,
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setNewComment("");
        
        // Comment will be added via WebSocket event
        // But add it immediately for better UX
        const newCommentItem: Comment = {
          id: comment.id,
          userId: comment.userId,
          userName: comment.userName || 'You',
          content: comment.content,
          createdAt: new Date(),
        };
        setComments(prev => [...prev, newCommentItem]);
      }
    } catch (error) {
      console.error('Failed to send comment:', error);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // Clear unread when opening
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={togglePanel}
          className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
          aria-label="Open comments"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Comments Panel */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 flex flex-col" style={{ height: '500px' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Comments
              {isConnected && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h3>
            <button
              onClick={togglePanel}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs text-gray-400 mt-1">Start a conversation</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{comment.userName}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                placeholder="Type a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
