"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Check, Reply, MoreVertical } from "lucide-react";

interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
  replies?: CommentReply[];
}

interface CommentThreadPopoverProps {
  comments: Comment[];
  elementId: string;
  elementLabel?: string;
  onClose: () => void;
  onAddComment: (content: string) => Promise<void>;
  onReply: (commentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
}

export default function CommentThreadPopover({
  comments,
  elementId,
  elementLabel,
  onClose,
  onAddComment,
  onReply,
  onResolve,
}: CommentThreadPopoverProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment("");
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onReply(commentId, replyContent);
      setReplyContent("");
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setIsSubmitting(false);
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
    <div 
      ref={popoverRef}
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white shadow-2xl rounded-xl border border-gray-200 z-[100] max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h4 className="font-bold text-sm text-gray-900">Comments</h4>
          {elementLabel && (
            <p className="text-xs text-gray-500 mt-0.5">{elementLabel}</p>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No comments yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the conversation</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div 
              key={comment.id} 
              className={`p-3 rounded-lg border ${
                comment.resolved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {comment.userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{comment.userName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</p>
                  </div>
                </div>
                
                {comment.resolved && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" />
                    Resolved
                  </span>
                )}
              </div>

              {/* Comment Content */}
              <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-300">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-white p-2 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                          {reply.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-900">{reply.userName}</span>
                        <span className="text-xs text-gray-500">{formatTimeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id ? (
                <div className="mt-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full border rounded p-2 text-xs resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(comment.id);
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyContent.trim() || isSubmitting}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                      className="text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Actions */
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                  
                  {!comment.resolved && (
                    <button
                      onClick={() => onResolve(comment.id)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Sending...' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
