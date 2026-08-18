"use client";

import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { Loader2 } from "lucide-react";

interface TypingIndicatorProps {
  examId: string;
  questionId?: string;
  currentUserId: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: Date;
}

export default function TypingIndicator({ 
  examId, 
  questionId, 
  currentUserId 
}: TypingIndicatorProps) {
  const { socket, isConnected } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());

  useEffect(() => {
    if (!socket || !isConnected || !examId) return;

    const handleTypingStarted = (data: any) => {
      // Filter by questionId if specified
      if (questionId && data.questionId !== questionId) return;
      if (data.userId === currentUserId) return;

      setTypingUsers(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          timestamp: new Date(data.timestamp),
        });
        return next;
      });
    };

    const handleTypingStopped = (data: any) => {
      if (questionId && data.questionId !== questionId) return;
      
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('typing:started', handleTypingStarted);
    socket.on('typing:stopped', handleTypingStopped);

    // Auto-clear old typing indicators after 5 seconds
    const interval = setInterval(() => {
      const now = new Date();
      setTypingUsers(prev => {
        const next = new Map(prev);
        let hasChanges = false;
        
        next.forEach((user, userId) => {
          if (now.getTime() - user.timestamp.getTime() > 5000) {
            next.delete(userId);
            hasChanges = true;
          }
        });
        
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => {
      socket.off('typing:started', handleTypingStarted);
      socket.off('typing:stopped', handleTypingStopped);
      clearInterval(interval);
    };
  }, [socket, isConnected, examId, questionId, currentUserId]);

  if (typingUsers.size === 0) return null;

  const names = Array.from(typingUsers.values()).map(u => u.userName);
  const displayText = names.length === 1 
    ? `${names[0]} is typing...`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing...`
    : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>{displayText}</span>
    </div>
  );
}
