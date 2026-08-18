"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface CommentMarkerProps {
  elementId: string;
  commentCount: number;
  unresolvedCount: number;
  onClick: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function CommentMarker({ 
  elementId, 
  commentCount, 
  unresolvedCount,
  onClick,
  position = 'top-right'
}: CommentMarkerProps) {
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  return (
    <button
      onClick={onClick}
      className={`absolute ${positionClasses[position]} bg-white border-2 ${
        unresolvedCount > 0 ? 'border-blue-500' : 'border-gray-300'
      } rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10`}
      title={`${commentCount} comment${commentCount !== 1 ? 's' : ''} (${unresolvedCount} unresolved)`}
    >
      <MessageCircle 
        className={`w-4 h-4 ${unresolvedCount > 0 ? 'text-blue-500' : 'text-gray-400'}`}
      />
      {commentCount > 0 && (
        <span 
          className={`absolute -top-1 -right-1 ${
            unresolvedCount > 0 ? 'bg-blue-500' : 'bg-gray-400'
          } text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold`}
        >
          {commentCount > 9 ? '9+' : commentCount}
        </span>
      )}
    </button>
  );
}
