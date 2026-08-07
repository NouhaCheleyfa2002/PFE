"use client";

import React, { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Users,
  BadgeCheck,
  BookOpen,
  FileText,
  FileQuestion,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Flag,
  Database,
  Megaphone,
  Upload,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser || currentUser.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  // Handler for broadcast announcement
  const handleBroadcastAnnouncement = async () => {
    const message = prompt('Enter announcement message to broadcast to all users:');
    if (!message || message.trim() === '') return;

    const token = authService.getToken();
    if (!token) {
      alert('Not authenticated');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/user-notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          type: 'announcement',
        }),
      });

      if (response.ok) {
        alert('Announcement sent successfully to all users!');
      } else {
        const error = await response.json();
        alert(`Failed to send announcement: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to broadcast announcement:', error);
      alert('Failed to send announcement. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b3e]">Admin Overview</h1>
          <p className="text-sm text-[#8899bb] mt-1">
            Platform management dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8899bb]">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 1. Platform Overview - Top KPI Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Platform Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            title="Total Users"
            value="12,486"
            icon={<Users className="w-5 h-5" />}
            color="bg-blue-100 text-blue-600"
            trend="+12.5%"
          />
          <KPICard
            title="Verified Teachers"
            value="8,974"
            icon={<BadgeCheck className="w-5 h-5" />}
            color="bg-green-100 text-green-600"
            trend="+8.2%"
          />
          <KPICard
            title="Courses"
            value="1,256"
            icon={<BookOpen className="w-5 h-5" />}
            color="bg-purple-100 text-purple-600"
            trend="+15.3%"
          />
          <KPICard
            title="Resources"
            value="34,529"
            icon={<FileText className="w-5 h-5" />}
            color="bg-indigo-100 text-indigo-600"
            trend="+22.1%"
          />
          <KPICard
            title="Exams Created"
            value="18,743"
            icon={<FileQuestion className="w-5 h-5" />}
            color="bg-orange-100 text-orange-600"
            trend="+18.9%"
          />
          <KPICard
            title="Revenue"
            value="24,300 DT"
            icon={<DollarSign className="w-5 h-5" />}
            color="bg-emerald-100 text-emerald-600"
            trend="+31.2%"
          />
        </div>
      </div>

      {/* Recent Activity Feed & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Recent Activity Feed</h2>
          <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
            <div className="space-y-4">
              {mockRecentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-4 border-b border-[#f4f6fc] last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#0d1b3e]">{activity.text}</p>
                    <p className="text-xs text-[#8899bb] mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions - 1 column */}
        <div>
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Quick Actions</h2>
          <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/dashboard/admin/verification')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors text-left"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Approve Teachers</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/admin/users')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-left"
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Manage Users</span>
              </button>
              <button 
                onClick={() => alert('Reports feature coming soon')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors text-left"
              >
                <Flag className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">View Reports</span>
              </button>
              <button 
                onClick={handleBroadcastAnnouncement}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors text-left"
              >
                <Megaphone className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Broadcast Announcement</span>
              </button>
              <button 
                onClick={() => alert('Database backup functionality would be implemented on the backend')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors text-left"
              >
                <Database className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Backup Database</span>
              </button>
              <button 
                onClick={() => router.push('/dashboard/analytics')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-left"
              >
                <FileText className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">View Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component: KPI Card
function KPICard({ title, value, icon, color, trend }: any) {
  return (
    <div className="bg-white rounded-xl border border-[#edf0f7] p-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[#0d1b3e]">{value}</p>
      <p className="text-xs text-[#8899bb] mt-1">{title}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-xs text-green-600 font-semibold">{trend}</span>
        </div>
      )}
    </div>
  );
}

// Mock Data
const mockRecentActivity = [
  {
    text: "Ahmed Ben Ali verified as educator",
    time: "2 minutes ago",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "bg-green-100 text-green-600",
  },
  {
    text: "52 resources uploaded by various teachers",
    time: "15 minutes ago",
    icon: <Upload className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-600",
  },
  {
    text: "14 exams generated using AI",
    time: "1 hour ago",
    icon: <Sparkles className="w-4 h-4" />,
    color: "bg-purple-100 text-purple-600",
  },
  {
    text: "3 new organizations created accounts",
    time: "2 hours ago",
    icon: <Users className="w-4 h-4" />,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    text: "Payment received: 847 DT from marketplace",
    time: "3 hours ago",
    icon: <DollarSign className="w-4 h-4" />,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    text: "Teacher Sarah Khalil approved after review",
    time: "4 hours ago",
    icon: <BadgeCheck className="w-4 h-4" />,
    color: "bg-green-100 text-green-600",
  },
];
