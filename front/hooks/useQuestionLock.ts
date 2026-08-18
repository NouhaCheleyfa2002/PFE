"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket-context";

interface LockState {
  isLocked: boolean;
  lockedBy: string | null;
  lockedByName: string | null;
}

export function useQuestionLock(examId: string, questionId: string, currentUserId: string) {
  const { socket, isConnected } = useWebSocket();
  const [lockState, setLockState] = useState<LockState>({
    isLocked: false,
    lockedBy: null,
    lockedByName: null,
  });
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Request lock when user starts editing
  const requestLock = useCallback(() => {
    if (!socket || !isConnected) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      socket.emit('question:lock', { examId, questionId }, (response: any) => {
        if (response.success) {
          setLockState({
            isLocked: true,
            lockedBy: currentUserId,
            lockedByName: 'You',
          });
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }, [socket, isConnected, examId, questionId, currentUserId]);

  // Release lock when user stops editing
  const releaseLock = useCallback(() => {
    if (!socket || !isConnected) return;

    socket.emit('question:unlock', { examId, questionId });
    setLockState({
      isLocked: false,
      lockedBy: null,
      lockedByName: null,
    });
  }, [socket, isConnected, examId, questionId]);

  // Emit typing start
  const startTyping = useCallback(() => {
    if (!socket || !isConnected || isTyping) return;

    socket.emit('typing:start', { examId, questionId });
    setIsTyping(true);

    // Auto-stop typing after 3 seconds of no activity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, isConnected, examId, questionId, isTyping]);

  // Emit typing stop
  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !isTyping) return;

    socket.emit('typing:stop', { examId, questionId });
    setIsTyping(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, isConnected, examId, questionId, isTyping]);

  // Listen for lock events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleLocked = (data: any) => {
      if (data.questionId === questionId && data.userId !== currentUserId) {
        setLockState({
          isLocked: true,
          lockedBy: data.userId,
          lockedByName: data.userName,
        });
      }
    };

    const handleUnlocked = (data: any) => {
      if (data.questionId === questionId) {
        setLockState({
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
        });
      }
    };

    socket.on('question:locked', handleLocked);
    socket.on('question:unlocked', handleUnlocked);

    return () => {
      socket.off('question:locked', handleLocked);
      socket.off('question:unlocked', handleUnlocked);
    };
  }, [socket, isConnected, questionId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockState.lockedBy === currentUserId) {
        releaseLock();
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, []);

  return {
    lockState,
    requestLock,
    releaseLock,
    startTyping,
    stopTyping,
    isLockedByOther: lockState.isLocked && lockState.lockedBy !== currentUserId,
  };
}
