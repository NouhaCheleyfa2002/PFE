"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ICONS } from "@/components/icons";
import { authService, User } from "@/lib/auth";
import { useWebSocket } from "@/lib/websocket-context";
import NotificationCenter, { Notification } from "@/components/NotificationCenter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/library": "Library",
  "/dashboard/resources": "My Resources",
  "/dashboard/questions": "Question Bank",
  "/dashboard/upload": "Upload Course",
  "/dashboard/exam-builder": "Exam Builder",
  "/dashboard/ai-generator": "AI Generator",
  "/dashboard/questions": "Question Bank",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

export default function Navbar() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use WebSocket for real-time notifications
  const { isConnected, unreadCount: wsUnreadCount, markAsRead: wsMarkAsRead } = useWebSocket();

  // Get user info
  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  }, []);

  // Fetch notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = authService.getToken();
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/user-notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      wsMarkAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const handleDelete = async (notificationId: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/user-notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Archive notification (placeholder - not implemented yet)
  const handleArchive = async (notificationId: string) => {
    console.log('Archive functionality not yet implemented:', notificationId);
  };

  const dbUnreadCount = notifications.filter((n) => !n.read).length;
  const unreadCount = dbUnreadCount;
  const pageTitle = PAGE_TITLES[pathname] || "Dashboard";

  // Get user initials
  const getUserInitials = () => {
    if (!user?.fullName) return "U";
    const names = user.fullName.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-7 bg-white border-b border-[#edf0f7] gap-5">

      {/* ── Left: page title + search ── */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <h1
          style={{ fontFamily: "var(--font-heading), sans-serif" }}
          className="text-[18px] font-bold text-[#0d1b3e] whitespace-nowrap"
        >
          {pageTitle}
        </h1>

        {/* search */}
        <div className="relative max-w-95 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aab4cc] text-[15px] pointer-events-none select-none">
            <ICONS.search className="w-4 h-4" />
          </span>
          <input
            type="search"
            placeholder="Search courses, exams, questions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                window.location.href = `/dashboard/library?search=${encodeURIComponent(searchQuery.trim())}`;
              }
            }}
            className="w-full pl-9 pr-14 py-2.5 rounded-[10px] border-[1.5px] border-[#edf0f7] bg-[#f6f8ff]
                       text-[13.5px] text-[#0d1b3e] placeholder:text-[#aab4cc] outline-none
                       focus:border-[#63b3ed] focus:bg-white focus:ring-2 focus:ring-[rgba(99,179,237,0.12)]
                       transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#edf0f7] font-mono text-[10px] text-[#aab4cc] pointer-events-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* NotificationCenter Component */}
        <div className="relative">
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDelete={handleDelete}
            onArchive={handleArchive}
            userRole={(user?.role as 'teacher' | 'admin') || 'teacher'}
          />
          {/* WebSocket connection indicator */}
          {isConnected && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-white" 
                  title="Real-time notifications active" />
          )}
        </div>

        {/* user card with full name and verified status */}
        <Link 
          href="/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border-[1.5px] border-[#edf0f7] bg-white hover:border-[#63b3ed] hover:bg-[rgba(99,179,237,0.02)] transition-all cursor-pointer"
        >
          <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center text-xs font-bold text-white shrink-0 ${user?.role === 'admin' ? "bg-gradient-to-br from-[#f6ad55] to-[#ed8936]" : "bg-gradient-to-br from-[#63b3ed] to-[#a78bfa]"}`}>
            {getUserInitials()}
          </div>
          <div className="overflow-hidden">
            <p className="text-[13px] font-semibold text-[#0d1b3e] truncate max-w-[140px]">{user?.fullName || "Loading..."}</p>
            <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${user?.role === 'admin' ? "text-[#f6ad55]" : "text-[#3d8b3d]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user?.role === 'admin' ? "bg-[#f6ad55]" : "bg-[#48bb78]"}`} />
              {user?.role === 'admin' ? "Administrator" : "Verified Educator"}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}