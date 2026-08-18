"use client";

import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { Lock, AlertCircle } from "lucide-react";

interface QuestionLockIndicatorProps {
  examId: string;
  questionId: string;
  currentUserId: string;
}

interface LockData {
  userId: string;
  userName: string;
  lockedAt: Date;
}

export default function QuestionLockIndicator({ 
  examId, 
  questionId, 
  currentUserId 
}: QuestionLockIndicatorProps) {
  const { socket, isConnected } = useWebSocket();
  const [lock, setLock] = useState<LockData | null>(null);
  const [attemptedEdit, setAttemptedEdit] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected || !examId) return;

    const handleLocked = (data: any) => {
      if (data.questionId === questionId && data.userId !== currentUserId) {
        setLock({
          userId: data.userId,
          userName: data.userName,
          lockedAt: new Date(data.timestamp),
        });
      }
    };

    const handleUnlocked = (data: any) => {
      if (data.questionId === questionId) {
        setLock(null);
        setAttemptedEdit(false);
      }
    };

    socket.on('question:locked', handleLocked);
    socket.on('question:unlocked', handleUnlocked);

    return () => {
      socket.off('question:locked', handleLocked);
      socket.off('question:unlocked', handleUnlocked);
    };
  }, [socket, isConnected, examId, questionId, currentUserId]);

  const handleRequestLock = () => {
    if (socket && isConnected) {
      socket.emit('question:lock', { examId, questionId }, (response: any) => {
        if (!response.success) {
          setAttemptedEdit(true);
          setTimeout(() => setAttemptedEdit(false), 5000);
        }
      });
    }
  };

  if (!lock) return null;

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg border-2 border-orange-300">
      <div className="text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-orange-600" />
          <span className="font-semibold text-orange-900">{lock.userName} is editing</span>
        </div>
        {attemptedEdit && (
          <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-lg mt-2">
            <AlertCircle className="w-4 h-4" />
            <span>Please wait for {lock.userName} to finish editing</span>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          This question is temporarily locked to prevent conflicts
        </p>
      </div>
    </div>
  );
}
