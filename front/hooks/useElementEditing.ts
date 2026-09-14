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

  // Get current user ID from token
  const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub || payload.id;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!socket || !isConnected || !examId) {
      console.log('[useElementEditing] Not ready:', { hasSocket: !!socket, isConnected, examId });
      return;
    }

    console.log('[useElementEditing] Setting up listeners for exam:', examId);
    const currentUserId = getCurrentUserId();
    console.log('[useElementEditing] Current user ID:', currentUserId);

    const handleElementEditing = (data: any) => {
      console.log('[useElementEditing] Received element_editing event:', data);
      
      // Filter out our own editing events (so you don't see your own indicator)
      if (currentUserId && data.userId === currentUserId) {
        console.log('[useElementEditing] Ignoring own editing event');
        return;
      }
      
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
          console.log('[useElementEditing] Added editing user:', { elementId: data.elementId, userName: data.userName, totalEditors: next.size });
          return next;
        });
      } else if (data.action === 'stop') {
        setEditingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.elementId);
          console.log('[useElementEditing] Removed editing user:', { elementId: data.elementId, totalEditors: next.size });
          return next;
        });
      }
    };

    socket.on('exam:element_editing', handleElementEditing);

    return () => {
      console.log('[useElementEditing] Cleaning up listeners');
      socket.off('exam:element_editing', handleElementEditing);
    };
  }, [socket, isConnected, examId]);

  const startEditing = useCallback((elementId: string, elementType: string) => {
    console.log('[useElementEditing] startEditing called:', { elementId, elementType, hasSocket: !!socket, isConnected, examId });
    if (socket && isConnected) {
      socket.emit('exam:start_editing_element', {
        examId,
        elementId,
        elementType,
      });
      console.log('[useElementEditing] Emitted start_editing_element event');
    } else {
      console.warn('[useElementEditing] Cannot start editing - socket not ready');
    }
  }, [socket, isConnected, examId]);

  const stopEditing = useCallback((elementId: string) => {
    console.log('[useElementEditing] stopEditing called:', { elementId, hasSocket: !!socket, isConnected, examId });
    if (socket && isConnected) {
      socket.emit('exam:stop_editing_element', {
        examId,
        elementId,
      });
      console.log('[useElementEditing] Emitted stop_editing_element event');
    } else {
      console.warn('[useElementEditing] Cannot stop editing - socket not ready');
    }
  }, [socket, isConnected, examId]);

  const getEditingUser = useCallback((elementId: string): EditingUser | null => {
    const user = editingUsers.get(elementId) || null;
    if (user) {
      console.log('[useElementEditing] getEditingUser found:', { elementId, userName: user.userName });
    }
    return user;
  }, [editingUsers]);

  return {
    editingUsers,
    startEditing,
    stopEditing,
    getEditingUser,
  };
}
