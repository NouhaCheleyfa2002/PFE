"use client";

import React, { useState, useEffect, useRef } from "react";
import QuestionEditingOverlay from "./QuestionEditingOverlay";
import CommentMarker from "./CommentMarker";
import CommentThreadPopover from "./CommentThreadPopover";
import { useElementEditing } from "@/hooks/useElementEditing";
import { useAnchoredComments } from "@/hooks/useAnchoredComments";

interface CollaborativeQuestionProps {
  examId: string;
  questionIndex: number;
  questionId?: string;
  children: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  onEditingChange?: (ref: { startEditing: () => void; stopEditing: () => void }) => void;
  isSelected?: boolean; // Whether this question is currently selected/focused
  hasCollaborators?: boolean; // Whether there are other collaborators in the session
}

export default function CollaborativeQuestion({
  examId,
  questionIndex,
  questionId,
  children,
  onFocus,
  onBlur,
  onEditingChange,
  isSelected = false,
  hasCollaborators = false,
}: CollaborativeQuestionProps) {
  const elementId = `question-${questionId || questionIndex}`;
  const [showComments, setShowComments] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);

  const { getEditingUser, startEditing, stopEditing } = useElementEditing(examId);
  const {
    addComment,
    replyToComment,
    resolveComment,
    getCommentsByElement,
    getUnresolvedCount,
  } = useAnchoredComments(examId);

  const editingUser = getEditingUser(elementId);
  const questionComments = getCommentsByElement(elementId);
  const unresolvedCount = getUnresolvedCount(elementId);

  // Debug logging
  useEffect(() => {
    console.log('[CollaborativeQuestion] State update:', {
      elementId,
      hasEditingUser: !!editingUser,
      editingUser: editingUser ? { userName: editingUser.userName, color: editingUser.color } : null,
    });
  }, [elementId, editingUser]);

  // Expose editing methods to parent
  useEffect(() => {
    if (onEditingChange) {
      console.log('[CollaborativeQuestion] Exposing editing methods for element:', elementId);
      onEditingChange({
        startEditing: () => {
          console.log('[CollaborativeQuestion] startEditing() method called for:', elementId);
          startEditing(elementId, 'question');
        },
        stopEditing: () => {
          console.log('[CollaborativeQuestion] stopEditing() method called for:', elementId);
          stopEditing(elementId);
        },
      });
    }
  }, [elementId, startEditing, stopEditing, onEditingChange]);

  // Don't auto-trigger startEditing on focus - let parent control it
  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only blur if focus is moving outside the question container
    if (!questionRef.current?.contains(e.relatedTarget as Node)) {
      onBlur?.();
    }
  };

  const handleAddComment = async (content: string) => {
    await addComment(content, elementId);
  };

  const handleReply = async (commentId: string, content: string) => {
    await replyToComment(commentId, content);
  };

  const handleResolve = async (commentId: string) => {
    await resolveComment(commentId);
  };

  return (
    <div 
      ref={questionRef}
      className="relative"
      data-element-id={elementId}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0} // Make it focusable
    >
      {/* Debug: Log element ID */}
      {process.env.NODE_ENV === 'development' && (
        <div className="hidden" data-debug-element-id={elementId}></div>
      )}
      
      <QuestionEditingOverlay 
        elementId={elementId}
        editingUser={editingUser}
      >
        {children}
      </QuestionEditingOverlay>

      {/* Comment Marker - Show on hover or when there are existing comments */}
      {(isHovered || questionComments.length > 0 || showComments) && (
        <CommentMarker
          elementId={elementId}
          commentCount={questionComments.length}
          unresolvedCount={unresolvedCount}
          onClick={() => setShowComments(!showComments)}
          position="bottom-right"
        />
      )}

      {/* Comment Thread Popover */}
      {showComments && (
        <CommentThreadPopover
          comments={questionComments}
          elementId={elementId}
          elementLabel={`Question ${questionIndex + 1}`}
          onClose={() => setShowComments(false)}
          onAddComment={handleAddComment}
          onReply={handleReply}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
