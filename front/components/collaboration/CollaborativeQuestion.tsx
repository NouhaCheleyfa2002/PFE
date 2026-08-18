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
}

export default function CollaborativeQuestion({
  examId,
  questionIndex,
  questionId,
  children,
  onFocus,
  onBlur,
  onEditingChange,
}: CollaborativeQuestionProps) {
  const elementId = `question-${questionId || questionIndex}`;
  const [showComments, setShowComments] = useState(false);
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

  // Expose editing methods to parent
  useEffect(() => {
    if (onEditingChange) {
      onEditingChange({
        startEditing: () => startEditing(elementId, 'question'),
        stopEditing: () => stopEditing(elementId),
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

      {/* Comment Marker - Always visible */}
      <CommentMarker
        elementId={elementId}
        commentCount={questionComments.length}
        unresolvedCount={unresolvedCount}
        onClick={() => setShowComments(!showComments)}
        position="bottom-right"
      />

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
