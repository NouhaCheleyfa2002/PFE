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

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationPayload[];
  unreadCount: number;
  markAsRead: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
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
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Register for notifications
      newSocket.emit('register');
    });

    newSocket.on('connected', (data) => {
      console.log('Connected to notification service:', data);
    });

    newSocket.on('registered', (data) => {
      console.log('Registered for notifications:', data);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
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

  const value: WebSocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
