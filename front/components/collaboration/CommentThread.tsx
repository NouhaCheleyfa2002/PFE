"use client";

import React, { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { MessageCircle, Send, Check, X } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  questionId?: string;
  mentions?: string[];
  resolved?: boolean;
  createdAt: Date;
}

interface CommentThreadProps {
  examId: string;
  questionId?: string;
  currentUserId: string;
  currentUserName: string;
}

export default function CommentThread({ 
  examId, 
  questionId, 
  currentUserId,
  currentUserName 
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showThread, setShowThread] = useState(false);
  const { socket, isConnected, addComment, resolveComment } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for comment events
    const handleCommentAdded = (data: { 
      comment: Comment;
      userName: string;
      timestamp: Date;
    }) => {
      // Only add if it's for this question or exam-level
      if (data.comment.questionId === questionId || (!data.comment.questionId && !questionId)) {
        setComments(prev => [...prev, {
          ...data.comment,
          createdAt: new Date(data.timestamp),
        }]);
      }
    };

    const handleCommentResolved = (data: { 
      commentId: string; 
      resolved: boolean;
      timestamp: Date;
    }) => {
      setComments(prev => prev.map(c => 
        c.id === data.commentId ? { ...c, resolved: data.resolved } : c
      ));
    };

    socket.on('comment:added', handleCommentAdded);
    socket.on('comment:resolved', handleCommentResolved);

    return () => {
      socket.off('comment:added', handleCommentAdded);
      socket.off('comment:resolved', handleCommentResolved);
    };
  }, [socket, isConnected, questionId]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    addComment(examId, {
      content: newComment,
      userId: currentUserId,
      userName: currentUserName,
      questionId: questionId,
      mentions: [], // TODO: Parse @mentions from content
    });

    setNewComment("");
  };

  const handleResolve = (commentId: string, resolved: boolean) => {
    resolveComment(examId, commentId, resolved);
  };

  const unresolvedComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  return (
    <div className="relative">
      {/* Comment Button */}
      <button
        onClick={() => setShowThread(!showThread)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Comments</span>
        {unresolvedComments.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
            {unresolvedComments.length}
          </span>
        )}
      </button>

      {/* Comment Thread Panel */}
      {showThread && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Comments</h3>
              <button
                onClick={() => setShowThread(false)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {unresolvedComments.length === 0 && resolvedComments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No comments yet. Start a discussion!
              </p>
            ) : (
              <>
                {/* Unresolved Comments */}
                {unresolvedComments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{comment.userName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleResolve(comment.id, true)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Resolve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}

                {/* Resolved Comments */}
                {resolvedComments.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      {resolvedComments.length} resolved comment{resolvedComments.length !== 1 ? 's' : ''}
                    </summary>
                    <div className="mt-2 space-y-2">
                      {resolvedComments.map((comment) => (
                        <div key={comment.id} className="bg-green-50 rounded-lg p-3 space-y-2 opacity-60">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{comment.userName}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>

          {/* Add Comment Input */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
