"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket-context";

interface EditingUser {
  userId: string;
  userName: string;
  color: string;
  elementId: string;
  elementType: string;
}

export function useElementEditing(examId: string) {
  const { socket, isConnected } = useWebSocket();
  const [editingUsers, setEditingUsers] = useState<Map<string, EditingUser>>(new Map());

  useEffect(() => {
    if (!socket || !isConnected || !examId) return;

    const handleElementEditing = (data: any) => {
      if (data.action === 'start') {
        setEditingUsers(prev => {
          const next = new Map(prev);
          next.set(data.elementId, {
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            elementId: data.elementId,
            elementType: data.elementType,
          });
          return next;
        });
      } else if (data.action === 'stop') {
        setEditingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.elementId);
          return next;
        });
      }
    };

    socket.on('exam:element_editing', handleElementEditing);

    return () => {
      socket.off('exam:element_editing', handleElementEditing);
    };
  }, [socket, isConnected, examId]);

  const startEditing = useCallback((elementId: string, elementType: string) => {
    if (socket && isConnected) {
      socket.emit('exam:start_editing_element', {
        examId,
        elementId,
        elementType,
      });
    }
  }, [socket, isConnected, examId]);

  const stopEditing = useCallback((elementId: string) => {
    if (socket && isConnected) {
      socket.emit('exam:stop_editing_element', {
        examId,
        elementId,
      });
    }
  }, [socket, isConnected, examId]);

  const getEditingUser = useCallback((elementId: string): EditingUser | null => {
    return editingUsers.get(elementId) || null;
  }, [editingUsers]);

  return {
    editingUsers,
    startEditing,
    stopEditing,
    getEditingUser,
  };
}
