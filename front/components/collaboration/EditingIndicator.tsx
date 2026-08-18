"use client";

import React from "react";
import { Edit3 } from "lucide-react";

interface EditingIndicatorProps {
  userName: string;
  color: string;
  section?: string; // e.g., "Question 3", "Title", etc.
}

export default function EditingIndicator({ userName, color, section }: EditingIndicatorProps) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium animate-pulse"
      style={{
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color }}
      >
        {userName.charAt(0).toUpperCase()}
      </div>
      <span style={{ color }}>
        {userName} is editing{section ? ` ${section}` : ''}
      </span>
      <Edit3 className="w-3 h-3" style={{ color }} />
    </div>
  );
}
