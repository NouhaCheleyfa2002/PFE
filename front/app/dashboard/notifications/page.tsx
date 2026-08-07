"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import {
  Bell,
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
  Check,
  CheckCheck,
  RefreshCw,
  Search,
  Download,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Notification {
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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<'teacher' | 'admin'>('teacher');

  useEffect(() => {
    const user = authService.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUserRole(user.role as 'teacher' | 'admin');
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = authService.getToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/user-notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationStyle = (notification: Notification) => {
    const priority = notification.metadata?.priority || 'low';
    
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

    return priorityStyles[priority] || priorityStyles.low;
  };

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

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return past.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (categoryFilter !== 'all' && getCategory(n) !== categoryFilter) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !n.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categories = userRole === 'admin'
    ? ['all', 'users', 'verification', 'resources', 'ai', 'reports', 'system']
    : ['all', 'verification', 'resources', 'ai', 'marketplace', 'security'];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {['all', 'unread', 'read'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No notifications found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const style = getNotificationStyle(notification);
            const BadgeIcon = style.badgeIcon;

            return (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Priority Badge */}
                  <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                    <BadgeIcon className={`w-5 h-5 ${style.badgeColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      <span className="text-sm text-gray-400 whitespace-nowrap">
                        {getRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>

                    <div className="flex items-center gap-3">
                      {notification.metadata?.actionUrl && notification.metadata?.actionText && (
                        <button
                          onClick={() => {
                            if (notification.metadata?.actionUrl) {
                              router.push(notification.metadata.actionUrl);
                            }
                          }}
                          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {notification.metadata.actionText}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
