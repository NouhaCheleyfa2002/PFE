"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  MessageCircle, 
  Activity, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  CheckCircle,
  Clock,
  Pencil
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";
import { useAnchoredComments } from "@/hooks/useAnchoredComments";
import { useElementEditing } from "@/hooks/useElementEditing";

interface CollaborationSidebarProps {
  examId: string;
  onNavigateToElement?: (elementId: string) => void;
  questions?: any[]; // Array of questions to get proper numbering
}

interface ActiveUser {
  userId: string;
  userName: string;
  color: string;
  editingElementId?: string;
  editingElementType?: string;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  actionType: string;
  actionData: any;
  createdAt: Date;
}

export default function CollaborationSidebar({ 
  examId,
  onNavigateToElement,
  questions = [],
}: CollaborationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'comments' | 'activity'>('users');
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  const { socket, isConnected } = useWebSocket();
  const { comments, getCommentsByElement } = useAnchoredComments(examId);
  const { editingUsers } = useElementEditing(examId);

  // Listen for ALL real-time events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // === PRESENCE EVENTS ===
    const handlePresence = (data: any) => {
      console.log('[CollaborationSidebar] exam:presence ->', data);
      if (data.users && Array.isArray(data.users)) {
        const users = data.users.map((u: any) => ({
          userId: u.userId,
          userName: u.userName || 'User',
          color: getUserColor(u.userId),
          editingElementId: u.editingElementId,
          editingElementType: u.editingElementType,
        }));
        setActiveUsers(users);
      }
    };

    const handlePresenceJoin = (data: any) => {
      console.log('[CollaborationSidebar] presence:join ->', data);
      addActivity({
        userId: data.userId,
        userName: data.userName || 'User',
        actionType: 'join_session',
        actionData: data,
        createdAt: new Date(data.timestamp),
      });
    };

    const handlePresenceLeave = (data: any) => {
      console.log('[CollaborationSidebar] presence:leave ->', data);
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
      addActivity({
        userId: data.userId,
        userName: data.userName || 'User',
        actionType: 'leave_session',
        actionData: data,
        createdAt: new Date(data.timestamp),
      });
    };

    // === MAIN ACTIVITY EVENT ===
    const handleExamActivity = (data: any) => {
      console.log('[CollaborationSidebar] exam:activity ->', data);
      addActivity({
        userId: data.userId,
        userName: data.userName || 'User',
        actionType: data.type,
        actionData: data.data || {},
        createdAt: new Date(data.timestamp),
      });
    };

    // === EDITING EVENTS ===
    const handleElementEditing = (data: any) => {
      console.log('[CollaborationSidebar] exam:element_editing ->', data);
      
      setActiveUsers(prev => prev.map(u => {
        if (u.userId === data.userId) {
          if (data.action === 'start') {
            return {
              ...u,
              editingElementId: data.elementId,
              editingElementType: data.elementType,
            };
          } else if (data.action === 'stop') {
            return {
              ...u,
              editingElementId: undefined,
              editingElementType: undefined,
            };
          }
        }
        return u;
      }));

      if (data.action === 'start') {
        addActivity({
          userId: data.userId,
          userName: data.userName || 'User',
          actionType: 'start_editing',
          actionData: { elementId: data.elementId, elementType: data.elementType },
          createdAt: new Date(data.timestamp),
        });
      }
    };

    // Register all listeners
    // NOTE: exam:activity handles most activities, individual events only for UI updates
    socket.on('exam:presence', handlePresence);
    socket.on('presence:join', handlePresenceJoin);
    socket.on('presence:leave', handlePresenceLeave);
    socket.on('exam:activity', handleExamActivity); // Main activity source
    socket.on('exam:element_editing', handleElementEditing);
    // Comment events handled by exam:activity, only keep for UI updates if needed

    return () => {
      socket.off('exam:presence', handlePresence);
      socket.off('presence:join', handlePresenceJoin);
      socket.off('presence:leave', handlePresenceLeave);
      socket.off('exam:activity', handleExamActivity);
      socket.off('exam:element_editing', handleElementEditing);
    };
  }, [socket, isConnected]);

  // Helper to add activity
  const addActivity = (activity: Omit<ActivityItem, 'id'>) => {
    const newActivity: ActivityItem = {
      id: `activity-${Date.now()}-${Math.random()}`,
      ...activity,
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50
  };

  const getUserColor = (userId: string): string => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getElementLabel = (elementId: string): string => {
    if (elementId.startsWith('question-')) {
      // Extract question ID from element ID (format: question-<questionId>)
      const questionId = elementId.replace('question-', '');
      
      // Find the question index in the questions array
      const questionIndex = questions.findIndex(q => q.id === questionId);
      
      if (questionIndex !== -1) {
        return `Question ${questionIndex + 1}`;
      }
      
      // Fallback: just return "Question"
      return 'Question';
    }
    if (elementId === 'header') return 'Header';
    if (elementId === 'instructions') return 'Instructions';
    return elementId;
  };

  const formatTimeAgo = (date: Date) => {
    const now = Date.now();
    const activityTime = new Date(date).getTime();
    const seconds = Math.floor((now - activityTime) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(seconds / 3600);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(seconds / 86400);
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    
    return new Date(date).toLocaleDateString();
  };

  const groupCommentsByElement = () => {
    const grouped = new Map<string, any[]>();
    
    comments.forEach(comment => {
      if (comment.elementId) {
        const existing = grouped.get(comment.elementId) || [];
        existing.push(comment);
        grouped.set(comment.elementId, existing);
      }
    });

    return Array.from(grouped.entries()).map(([elementId, elementComments]) => ({
      elementId,
      elementLabel: getElementLabel(elementId),
      comments: elementComments,
      unresolvedCount: elementComments.filter(c => !c.resolved).length,
      latestComment: elementComments[elementComments.length - 1],
    }));
  };

  const formatActivityMessage = (activity: ActivityItem) => {
    const data = activity.actionData;
    
    // Helper to get question number from index or ID
    const getQuestionNumber = () => {
      if (data.questionIndex !== undefined) {
        return `Question ${data.questionIndex + 1}`;
      }
      return 'a question';
    };
    
    switch (activity.actionType) {
      case 'join_session':
        return 'joined the session';
      
      case 'leave_session':
        return 'left the session';
      
      case 'start_editing':
        return `started editing ${getElementLabel(data.elementId || '')}`;
      
      case 'save_question':
        return `saved ${getQuestionNumber()}`;
      
      case 'update_question':
        return `updated ${getQuestionNumber()}`;
      
      case 'add_question':
        return `added ${getQuestionNumber()}`;
      
      case 'remove_question':
        return `removed ${getQuestionNumber()}`;
      
      case 'duplicate_question':
        return `duplicated ${getQuestionNumber()}`;
      
      case 'reorder_questions':
        return 'reordered questions';
      
      case 'update_metadata':
        if (data.field === 'title') return `updated exam title to "${data.value}"`;
        if (data.field === 'subject') return `changed subject to "${data.value}"`;
        if (data.field === 'duration') return `set duration to ${data.value} minutes`;
        return `updated ${data.field}`;
      
      case 'add_comment':
        return 'added a comment';
      
      case 'reply_comment':
        return 'replied to a comment';
      
      case 'resolve_comment':
        return data.resolved ? 'resolved a comment' : 'reopened a comment';
      
      default:
        return activity.actionType.replace(/_/g, ' ').toLowerCase();
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed right-0 top-32 bg-white border-l border-t border-b border-gray-200 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 transition-colors z-40"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Collaboration
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Active ({activeUsers.length})
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comments
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'activity'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Active Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {activeUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No active collaborators</p>
              </div>
            ) : (
              activeUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.userName.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {user.userName}
                    </p>
                    {user.editingElementId ? (
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Pencil className="w-3 h-3" />
                        <span>Editing: {getElementLabel(user.editingElementId)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Viewing</p>
                    )}
                  </div>
                  
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-2">
            {groupCommentsByElement().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No comments yet</p>
              </div>
            ) : (
              groupCommentsByElement().map((group) => (
                <button
                  key={group.elementId}
                  onClick={() => onNavigateToElement?.(group.elementId)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {group.elementLabel}
                    </span>
                    {group.unresolvedCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {group.unresolvedCount}
                      </span>
                    )}
                  </div>
                  
                  {group.latestComment && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">{group.latestComment.userName}:</span>
                      {' '}
                      <span className="line-clamp-1">{group.latestComment.content}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {group.comments.length}
                    </span>
                    {group.unresolvedCount === 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        All resolved
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
