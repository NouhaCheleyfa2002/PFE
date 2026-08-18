"use client";

import React, { useState, useEffect } from "react";
import { Users, User } from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

interface ActiveUser {
  userId: string;
  userName: string;
  color: string;
  editingSection?: string; // What they're currently editing
  lastActivity: Date;
}

interface LivePresenceBadgeProps {
  examId: string;
}

// Generate consistent colors for users
const getUserColor = (userId: string): string => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function LivePresenceBadge({ examId }: LivePresenceBadgeProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const { socket, isConnected, joinExamSession, leaveExamSession } = useWebSocket();
  const currentUserId = localStorage.getItem('user_id');

  useEffect(() => {
    if (socket && isConnected && examId) {
      // Join the exam session
      joinExamSession?.(examId);

      // Listen for presence updates
      socket.on('exam:presence', (data: any) => {
        const users: ActiveUser[] = data.users.map((user: any) => ({
          userId: user.userId,
          userName: user.userName,
          color: getUserColor(user.userId),
          editingSection: user.editingSection,
          lastActivity: new Date(user.lastActivity),
        }));
        
        // Filter out current user
        const otherUsers = users.filter(u => u.userId !== currentUserId);
        setActiveUsers(otherUsers);
      });

      // Listen for user editing events
      socket.on('exam:user_editing', (data: any) => {
        if (data.userId !== currentUserId) {
          setActiveUsers(prev => 
            prev.map(user => 
              user.userId === data.userId 
                ? { ...user, editingSection: data.section, lastActivity: new Date() }
                : user
            )
          );
        }
      });

      return () => {
        socket.off('exam:presence');
        socket.off('exam:user_editing');
        leaveExamSession?.(examId);
      };
    }
  }, [socket, isConnected, examId]);

  if (!isConnected || activeUsers.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Presence Indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm hover:shadow-md transition-all"
      >
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 3).map((user, index) => (
            <div
              key={user.userId}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
              style={{ 
                backgroundColor: user.color,
                zIndex: 10 - index,
              }}
              title={user.userName}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        
        {activeUsers.length > 3 && (
          <span className="text-sm font-medium text-gray-600">
            +{activeUsers.length - 3}
          </span>
        )}
        
        <Users className="w-4 h-4 text-gray-600" />
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 z-50">
          <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Collaborators ({activeUsers.length})
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.userName}
                  </p>
                  {user.editingSection ? (
                    <p className="text-xs text-gray-500 truncate">
                      Editing: {user.editingSection}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Viewing</p>
                  )}
                </div>
                
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
