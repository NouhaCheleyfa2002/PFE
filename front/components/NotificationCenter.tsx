"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  Check,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Upload,
  FileText,
  DollarSign,
  Star,
  Shield,
  Brain,
  User,
  Users,
  Flag,
  BarChart3,
  Settings,
  Clock,
  ChevronRight,
  Filter,
  Trash2,
  Archive,
  MoreVertical,
} from "lucide-react";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: {
    resourceId?: string;
    resourceTitle?: string;
    verificationId?: string;
    userId?: string;
    revenue?: number;
    rating?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    actionUrl?: string;
    actionText?: string;
    [key: string]: any;
  };
  createdAt: string;
  readAt?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  userRole: 'teacher' | 'admin';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function NotificationCenter({
  notifications: propNotifications,
  unreadCount: propUnreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onArchive,
  userRole,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'today' | 'week'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<Notification[]>(propNotifications);
  const [unreadCount, setUnreadCount] = useState(propUnreadCount);

  useEffect(() => {
    setNotifications(propNotifications);
    setUnreadCount(propUnreadCount);
  }, [propNotifications, propUnreadCount]);

  // Get notification icon and color based on type and priority
  const getNotificationStyle = (notification: Notification) => {
    const priority = notification.metadata?.priority || 'low';
    const type = notification.type;

    // Priority-based colors and badge icons
    const priorityStyles = {
      critical: { 
        color: 'text-red-600', 
        bg: 'bg-red-100', 
        border: 'border-red-300', 
        badgeIcon: AlertCircle,
        badgeColor: 'text-red-600'
      },
      high: { 
        color: 'text-orange-600', 
        bg: 'bg-orange-100', 
        border: 'border-orange-300', 
        badgeIcon: AlertTriangle,
        badgeColor: 'text-orange-600'
      },
      medium: { 
        color: 'text-blue-600', 
        bg: 'bg-blue-100', 
        border: 'border-blue-300', 
        badgeIcon: Info,
        badgeColor: 'text-blue-600'
      },
      low: { 
        color: 'text-green-600', 
        bg: 'bg-green-100', 
        border: 'border-green-300', 
        badgeIcon: CheckCircle,
        badgeColor: 'text-green-600'
      },
    };

    // Type-based icons
    const typeIcons: { [key: string]: { icon: React.ElementType; defaultPriority: keyof typeof priorityStyles } } = {
      // Account & Verification
      account_created: { icon: User, defaultPriority: 'low' },
      verification_submitted: { icon: Shield, defaultPriority: 'medium' },
      verification_approved: { icon: CheckCircle, defaultPriority: 'low' },
      verification_rejected: { icon: AlertCircle, defaultPriority: 'high' },
      verification_request: { icon: Shield, defaultPriority: 'medium' },
      
      // Resources
      upload_started: { icon: Upload, defaultPriority: 'low' },
      upload_completed: { icon: CheckCircle, defaultPriority: 'low' },
      resource_submitted: { icon: FileText, defaultPriority: 'low' },
      resource_approved: { icon: CheckCircle, defaultPriority: 'low' },
      resource_changes_required: { icon: AlertTriangle, defaultPriority: 'medium' },
      resource_rejected: { icon: X, defaultPriority: 'high' },
      new_resource: { icon: FileText, defaultPriority: 'medium' },
      
      // AI Processing
      ai_processing_started: { icon: Brain, defaultPriority: 'low' },
      ai_processing_completed: { icon: Brain, defaultPriority: 'low' },
      ai_high_risk: { icon: AlertTriangle, defaultPriority: 'critical' },
      ai_pii_detected: { icon: AlertCircle, defaultPriority: 'critical' },
      ai_copyright: { icon: Flag, defaultPriority: 'high' },
      
      // Marketplace
      new_purchase: { icon: DollarSign, defaultPriority: 'low' },
      new_review: { icon: Star, defaultPriority: 'low' },
      new_rating: { icon: Star, defaultPriority: 'low' },
      
      // User Management (Admin)
      new_user: { icon: User, defaultPriority: 'low' },
      user_report: { icon: Flag, defaultPriority: 'high' },
      
      // Reports (Admin)
      resource_report: { icon: Flag, defaultPriority: 'high' },
      
      // System (Admin)
      system_alert: { icon: AlertTriangle, defaultPriority: 'critical' },
      daily_summary: { icon: BarChart3, defaultPriority: 'low' },
      
      // Security
      password_changed: { icon: Shield, defaultPriority: 'medium' },
      new_login: { icon: Info, defaultPriority: 'medium' },
      
      // Default
      default: { icon: Bell, defaultPriority: 'low' },
    };

    const iconConfig = typeIcons[type] || typeIcons.default;
    const style = priorityStyles[priority] || priorityStyles[iconConfig.defaultPriority];

    return {
      Icon: iconConfig.icon,
      ...style,
    };
  };

  // Get category for filtering
  const getCategory = (notification: Notification): string => {
    const type = notification.type;
    
    if (type.includes('verification')) return 'verification';
    if (type.includes('resource') || type.includes('upload')) return 'resources';
    if (type.includes('ai_')) return 'ai';
    if (type.includes('purchase') || type.includes('review') || type.includes('rating')) return 'marketplace';
    if (type.includes('password') || type.includes('login')) return 'security';
    if (type.includes('user') && userRole === 'admin') return 'users';
    if (type.includes('report') || type.includes('flag')) return 'reports';
    if (type.includes('system') || type.includes('summary')) return 'system';
    
    return 'other';
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    // Time filter
    if (filter === 'unread' && notif.read) return false;
    if (filter === 'today') {
      const today = new Date();
      const notifDate = new Date(notif.createdAt);
      if (notifDate.toDateString() !== today.toDateString()) return false;
    }
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (new Date(notif.createdAt) < weekAgo) return false;
    }
    
    // Category filter
    if (categoryFilter !== 'all' && getCategory(notif) !== categoryFilter) return false;
    
    return true;
  });

  // Get relative time
  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  // Get categories for current user role
  const categories = userRole === 'admin'
    ? [
        { key: 'all', label: 'All', icon: Bell },
        { key: 'users', label: 'Users', icon: Users },
        { key: 'verification', label: 'Verifications', icon: Shield },
        { key: 'resources', label: 'Resources', icon: FileText },
        { key: 'ai', label: 'AI Alerts', icon: Brain },
        { key: 'reports', label: 'Reports', icon: Flag },
        { key: 'system', label: 'System', icon: Settings },
      ]
    : [
        { key: 'all', label: 'All', icon: Bell },
        { key: 'verification', label: 'Verification', icon: Shield },
        { key: 'resources', label: 'Resources', icon: FileText },
        { key: 'ai', label: 'AI Processing', icon: Brain },
        { key: 'marketplace', label: 'Marketplace', icon: DollarSign },
        { key: 'security', label: 'Security', icon: Shield },
      ];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to action URL if provided
    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-[420px] max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-2">
                {['all', 'unread', 'today', 'week'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        categoryFilter === cat.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bell className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => {
                    const style = getNotificationStyle(notification);
                    const Icon = style.Icon;

                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50/30' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${style.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm text-gray-900">
                                {notification.title}
                              </h4>
                              {notification.metadata?.priority && notification.metadata.priority !== 'low' && (
                                <span className={`${style.badgeColor}`}>
                                  <style.badgeIcon className="w-4 h-4" />
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getRelativeTime(notification.createdAt)}
                              </span>

                              {notification.metadata?.actionText && (
                                <button
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (notification.metadata?.actionUrl) {
                                      window.location.href = notification.metadata.actionUrl;
                                    }
                                  }}
                                >
                                  {notification.metadata.actionText}
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Unread indicator */}
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    window.location.href = '/dashboard/notifications';
                    setIsOpen(false);
                  }}
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
