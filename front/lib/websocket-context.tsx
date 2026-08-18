'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

interface NotificationPayload {
  message: string;
  type: string;
  link?: string;
  timestamp: Date;
  data?: any;
}

// Collaboration types
interface Participant {
  userId: string;
  userName: string;
  status: 'active' | 'idle';
  joinedAt: Date;
}

interface QuestionLock {
  questionId: string;
  userId: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  questionId?: string;
  mentions?: string[];
  createdAt: Date;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationPayload[];
  unreadCount: number;
  markAsRead: () => void;
  // Collaboration methods
  joinExam: (examId: string, userName: string) => void;
  leaveExam: (examId: string) => void;
  lockQuestion: (examId: string, questionId: string, callback?: (response: any) => void) => void;
  unlockQuestion: (examId: string, questionId: string) => void;
  updateQuestion: (examId: string, questionId: string, changes: any) => void;
  addComment: (examId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  resolveComment: (examId: string, commentId: string, resolved: boolean) => void;
  startTyping: (examId: string, questionId: string) => void;
  stopTyping: (examId: string, questionId: string) => void;
  getParticipants: (examId: string, callback: (response: { participants: Participant[] }) => void) => void;
  getLocks: (examId: string, callback: (response: { locks: QuestionLock[] }) => void) => void;
  savedQuestion: (examId: string, questionId: string, questionIndex?: number) => void;
  startEditing: (examId: string, elementId: string, elementType: string) => void;
  stopEditing: (examId: string, elementId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  // Collaboration defaults
  joinExam: () => {},
  leaveExam: () => {},
  lockQuestion: () => {},
  unlockQuestion: () => {},
  updateQuestion: () => {},
  addComment: () => {},
  resolveComment: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  getParticipants: () => {},
  getLocks: () => {},
  savedQuestion: () => {},
  startEditing: () => {},
  stopEditing: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No token found, skipping WebSocket connection');
      return;
    }

    // Create socket connection
    const newSocket = io('http://localhost:3000/notifications', {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Register for notifications
      newSocket.emit('register');
    });

    newSocket.on('connected', (data) => {
      console.log('✅ Connected to notification service:', data);
    });

    newSocket.on('registered', (data) => {
      console.log('✅ Registered for notifications:', data);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected. Reason:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected the client, reconnect manually
        console.log('🔄 Server disconnected us, attempting reconnect...');
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      toast.error('Lost connection to server. Please refresh the page.');
    });

    // Notification handler
    newSocket.on('notification', (payload: NotificationPayload) => {
      console.log('Received notification:', payload);
      
      // Add to notifications list
      setNotifications(prev => [payload, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Show toast notification with custom styling based on type
      const notificationStyle = {
        verification_request: {
          icon: '🔔',
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        },
        verification_status: {
          icon: payload.data?.status === 'approved' ? '🎉' : 
                payload.data?.status === 'rejected' ? '❌' : 'ℹ️',
          style: {
            background: payload.data?.status === 'approved' ? '#10B981' : 
                       payload.data?.status === 'rejected' ? '#EF4444' : '#F59E0B',
            color: '#fff',
          },
        },
        announcement: {
          icon: '📢',
          style: {
            background: '#8B5CF6',
            color: '#fff',
          },
        },
        default: {
          icon: '🔔',
          style: {
            background: '#6B7280',
            color: '#fff',
          },
        },
      };

      const config = notificationStyle[payload.type as keyof typeof notificationStyle] || notificationStyle.default;

      toast(payload.message, {
        icon: config.icon,
        style: config.style,
        duration: 5000,
        position: 'top-right',
      });

      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (error) {
        console.log('Notification sound not available');
      }
    });

    // Ping/pong for connection health
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000); // Every 30 seconds

    newSocket.on('pong', (data) => {
      console.log('Pong received:', data);
    });

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  // Collaboration methods
  const joinExam = (examId: string, userName: string) => {
    if (socket?.connected) {
      socket.emit('exam:join', { examId, userName });
      console.log(`Joining exam: ${examId}`);
    }
  };

  const leaveExam = (examId: string) => {
    if (socket?.connected) {
      socket.emit('exam:leave', { examId });
      console.log(`Leaving exam: ${examId}`);
    }
  };

  const lockQuestion = (examId: string, questionId: string, callback?: (response: any) => void) => {
    if (socket?.connected) {
      socket.emit('question:lock', { examId, questionId }, callback);
      console.log(`Locking question: ${questionId}`);
    }
  };

  const unlockQuestion = (examId: string, questionId: string) => {
    if (socket?.connected) {
      socket.emit('question:unlock', { examId, questionId });
      console.log(`Unlocking question: ${questionId}`);
    }
  };

  const updateQuestion = (examId: string, questionId: string, changes: any) => {
    if (socket?.connected) {
      socket.emit('question:update', { examId, questionId, changes });
      console.log(`Updating question: ${questionId}`);
    }
  };

  const addComment = (examId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => {
    if (socket?.connected) {
      socket.emit('comment:add', { examId, comment });
      console.log(`Adding comment to exam: ${examId}`);
    }
  };

  const resolveComment = (examId: string, commentId: string, resolved: boolean) => {
    if (socket?.connected) {
      socket.emit('comment:resolve', { examId, commentId, resolved });
      console.log(`Resolving comment: ${commentId}`);
    }
  };

  const startTyping = (examId: string, questionId: string) => {
    if (socket?.connected) {
      socket.emit('typing:start', { examId, questionId });
    }
  };

  const stopTyping = (examId: string, questionId: string) => {
    if (socket?.connected) {
      socket.emit('typing:stop', { examId, questionId });
    }
  };

  const getParticipants = (examId: string, callback: (response: { participants: Participant[] }) => void) => {
    if (socket?.connected) {
      socket.emit('exam:participants', { examId }, callback);
    }
  };

  const getLocks = (examId: string, callback: (response: { locks: QuestionLock[] }) => void) => {
    if (socket?.connected) {
      socket.emit('exam:locks', { examId }, callback);
    }
  };

  const savedQuestion = (examId: string, questionId: string, questionIndex?: number) => {
    if (socket?.connected) {
      socket.emit('question:saved', { examId, questionId, questionIndex });
      console.log(`Broadcasting question saved: ${questionId} at index ${questionIndex}`);
    }
  };

  const startEditing = (examId: string, elementId: string, elementType: string) => {
    if (socket?.connected) {
      socket.emit('exam:start_editing_element', { examId, elementId, elementType });
      console.log(`Broadcasting start editing: ${elementId}`);
    }
  };

  const stopEditing = (examId: string, elementId: string) => {
    if (socket?.connected) {
      socket.emit('exam:stop_editing_element', { examId, elementId });
      console.log(`Broadcasting stop editing: ${elementId}`);
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    joinExam,
    leaveExam,
    lockQuestion,
    unlockQuestion,
    updateQuestion,
    addComment,
    resolveComment,
    startTyping,
    stopTyping,
    getParticipants,
    getLocks,
    savedQuestion,
    startEditing,
    stopEditing,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
