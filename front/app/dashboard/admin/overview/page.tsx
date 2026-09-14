"use client";

import { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import { adminApi, AdminStatistics, RecentActivity } from "@/lib/api/admin";
import { useRouter } from "next/navigation";
import {
  Users,
  BadgeCheck,
  BookOpen,
  FileText,
  FileQuestion,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  Flag,
  Database,
  Megaphone,
  Upload,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";


export default function AdminOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser || currentUser.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setLoading(false);

    // Fetch statistics
    fetchStatistics();
    fetchRecentActivity();
  }, [router]);

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      const stats = await adminApi.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const activity = await adminApi.getRecentActivity();
      setRecentActivity(activity);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

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

  // Get activity icon and color based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'verification':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-600' };
      case 'upload':
        return { icon: <Upload className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' };
      case 'exam':
        return { icon: <FileQuestion className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' };
      case 'payment':
        return { icon: <DollarSign className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' };
      case 'organization':
        return { icon: <Users className="w-4 h-4" />, color: 'bg-indigo-100 text-indigo-600' };
      default:
        return { icon: <Activity className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' };
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
        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : statistics ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KPICard
              title="Total Users"
              value={statistics.totalUsers.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
              color="bg-blue-100 text-blue-600"
            />
            <KPICard
              title="Verified Teachers"
              value={statistics.verifiedTeachers.toLocaleString()}
              icon={<BadgeCheck className="w-5 h-5" />}
              color="bg-green-100 text-green-600"
            />
            <KPICard
              title="Courses"
              value={statistics.coursesCount.toLocaleString()}
              icon={<BookOpen className="w-5 h-5" />}
              color="bg-purple-100 text-purple-600"
            />
            <KPICard
              title="Resources"
              value={statistics.totalDocuments.toLocaleString()}
              icon={<FileText className="w-5 h-5" />}
              color="bg-indigo-100 text-indigo-600"
            />
            <KPICard
              title="Exams Created"
              value={statistics.examsCount.toLocaleString()}
              icon={<FileQuestion className="w-5 h-5" />}
              color="bg-orange-100 text-orange-600"
            />
            <KPICard
              title="Revenue"
              value={`${statistics.revenue.toLocaleString()} DT`}
              icon={<DollarSign className="w-5 h-5" />}
              color="bg-emerald-100 text-emerald-600"
            />
          </div>
        ) : (
          <div className="text-center py-12 text-[#8899bb]">
            Failed to load statistics
          </div>
        )}
      </div>

      {/* Recent Activity Feed & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Recent Activity Feed</h2>
          <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
            {activityLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const { icon, color } = getActivityIcon(activity.type);
                  return (
                    <div key={index} className="flex items-start gap-3 pb-4 border-b border-[#f4f6fc] last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[#0d1b3e]">{activity.text}</p>
                        <p className="text-xs text-[#8899bb] mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-[#8899bb]">
                No recent activity in the last 24 hours
              </div>
            )}
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
                onClick={() => router.push('/dashboard/admin/analytics')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-left"
              >
                <Activity className="w-5 h-5 flex-shrink-0" />
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
function KPICard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#edf0f7] p-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[#0d1b3e]">{value}</p>
      <p className="text-xs text-[#8899bb] mt-1">{title}</p>
    </div>
  );
}

