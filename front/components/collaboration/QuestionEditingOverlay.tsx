"use client";

import React, { useEffect } from "react";
import { Edit3 } from "lucide-react";

interface EditingUser {
  userName: string;
  color: string;
}

interface QuestionEditingOverlayProps {
  elementId: string;
  editingUser?: EditingUser | null;
  children: React.ReactNode;
}

export default function QuestionEditingOverlay({ 
  elementId, 
  editingUser, 
  children 
}: QuestionEditingOverlayProps) {
  // Debug logging
  useEffect(() => {
    if (editingUser) {
      console.log('[QuestionEditingOverlay] Rendering overlay for:', {
        elementId,
        userName: editingUser.userName,
        color: editingUser.color,
      });
    }
  }, [elementId, editingUser]);

  return (
    <div className="relative">
      {/* Colored outline when someone else is editing */}
      {editingUser && (
        <>
          <div className="hidden">DEBUG: Editing user present - {editingUser.userName}</div>
          {/* Outer glow effect */}
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none animate-pulse"
            style={{ 
              border: `2px solid ${editingUser.color}`,
              boxShadow: `0 0 0 4px ${editingUser.color}20, 0 0 20px ${editingUser.color}40`,
              zIndex: 5,
            }}
          />
          
          {/* Name badge */}
          <div 
            className="absolute -top-3 left-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg z-10 animate-pulse"
            style={{ 
              backgroundColor: editingUser.color,
              color: 'white'
            }}
          >
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white"
              style={{ backgroundColor: editingUser.color }}
            >
              {editingUser.userName.charAt(0).toUpperCase()}
            </div>
            <span>{editingUser.userName} is editing</span>
            <Edit3 className="w-3 h-3 animate-bounce" />
          </div>
        </>
      )}
      
      {/* Actual content */}
      {children}
    </div>
  );
}
