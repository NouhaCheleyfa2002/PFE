"use client";

import React, { useState, useEffect } from "react";
import { Activity, FileEdit, MessageCircle, Users, Clock, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  actionType: string;
  actionData: any;
  createdAt: Date;
}

interface ActivityFeedProps {
  resourceId: string;
  resourceType: 'document' | 'exam';
}

export default function ActivityFeed({ resourceId, resourceType }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    fetchActivities();
  }, [resourceId, resourceType]);

  useEffect(() => {
    // Listen for real-time activity updates
    if (socket && isConnected && resourceType === 'exam') {
      const handleExamActivity = (data: any) => {
        console.log('Real-time activity received:', data);
        
        // Add new activity to the beginning of the list
        const newActivity: ActivityItem = {
          id: `realtime-${Date.now()}`,
          userId: data.userId,
          userName: data.userName || 'Unknown User',
          actionType: data.type === 'exam_updated' ? 'update_exam' : data.type,
          actionData: {
            changes: data.changes,
            detailedChanges: data.detailedChanges,
            ...data,
          },
          createdAt: new Date(data.timestamp),
        };

        setActivities(prev => [newActivity, ...prev]);
      };

      socket.on('exam:activity', handleExamActivity);

      return () => {
        socket.off('exam:activity', handleExamActivity);
      };
    }
  }, [socket, isConnected, resourceType]);

  const fetchActivities = async () => {
    try {
      const endpoint = resourceType === 'document' 
        ? `/collaboration/resources/${resourceId}/activity`
        : `/collaboration/exams/${resourceId}/activity`;
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Convert createdAt strings to Date objects
        const activitiesWithDates = data.map((activity: any) => ({
          ...activity,
          createdAt: new Date(activity.createdAt),
        }));
        setActivities(activitiesWithDates);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    const icons: Record<string, JSX.Element> = {
      edit: <FileEdit className="w-4 h-4" />,
      update_exam: <FileEdit className="w-4 h-4" />,
      comment: <MessageCircle className="w-4 h-4" />,
      invite: <Users className="w-4 h-4" />,
      accept: <Users className="w-4 h-4" />,
      version: <Clock className="w-4 h-4" />,
      export: <Download className="w-4 h-4" />,
    };
    return icons[actionType] || <Activity className="w-4 h-4" />;
  };

  const getActivityColor = (actionType: string) => {
    const colors: Record<string, string> = {
      edit: 'bg-blue-100 text-blue-700',
      update_exam: 'bg-blue-100 text-blue-700',
      comment: 'bg-green-100 text-green-700',
      invite: 'bg-purple-100 text-purple-700',
      accept: 'bg-purple-100 text-purple-700',
      version: 'bg-yellow-100 text-yellow-700',
      export: 'bg-gray-100 text-gray-700',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-700';
  };

  const formatActivityMessage = (activity: ActivityItem) => {
    const messages: Record<string, (data: any) => string> = {
      edit: (data) => `edited ${data.field || 'the content'}`,
      update_exam: (data) => {
        if (Array.isArray(data.changes) && data.changes.length > 0) {
          // Join changes into a readable format
          const changesList = data.changes.join(', ');
          return `updated ${changesList}`;
        }
        if (Array.isArray(data) && data.length > 0) {
          return `updated ${data.join(', ')}`;
        }
        return 'updated the exam';
      },
      comment: (data) => `added a comment`,
      invite_collaborator: (data) => `invited a collaborator`,
      accept_invitation: (data) => `accepted the invitation`,
      version: (data) => `saved version ${data.versionNumber || ''}`,
      save_version: (data) => `saved a new version`,
      export: (data) => `exported the ${resourceType}`,
      metadata_update: (data) => `updated metadata`,
      upload_version: (data) => `uploaded a new version`,
      join_session: (data) => `joined the editing session`,
      leave_session: (data) => `left the editing session`,
    };
    
    const formatter = messages[activity.actionType];
    return formatter ? formatter(activity.actionData) : activity.actionType.replace(/_/g, ' ');
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date().getTime();
    const activityTime = new Date(date).getTime();
    const seconds = Math.floor((now - activityTime) / 1000);
    
    // Debug logging
    console.log('Time calculation:', {
      now: new Date(now).toISOString(),
      activityTime: new Date(activityTime).toISOString(),
      seconds,
      rawDate: date
    });
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    
    const hours = Math.floor(seconds / 3600);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    
    const days = Math.floor(seconds / 86400);
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
          </h3>
          {resourceType === 'exam' && isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <>
          {/* Activities List */}
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Activity will appear here as collaborators work
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.actionType)}`}>
                    {getActivityIcon(activity.actionType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                    
                    {/* Additional Data */}
                    {activity.actionData?.description && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        "{activity.actionData.description}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
