"use client";

import { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Users,
  BadgeCheck,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  Star,
  Flag,
  Shield,
  Zap,
  Activity,
  BarChart3,
  Calendar,
  FileDown,
  ArrowRight,
  RefreshCw,
  Award,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  verifiedEducators: number;
  pendingVerification: number;
  totalResources: number;
  pendingModeration: number;
  totalSales: number;
  totalRevenue: number;
  pendingActions: number;
  averageRating: number;
}

interface GrowthData {
  month: string;
  users: number;
  educators: number;
  resources: number;
  sales: number;
  revenue: number;
}

interface PendingAction {
  type: 'verification' | 'moderation' | 'report' | 'payment';
  count: number;
  priority: 'high' | 'medium' | 'low';
  description: string;
  oldestDays: number;
}

interface TopContent {
  id: string;
  title: string;
  subject: string;
  downloads: number;
  rating: number;
  sales: number;
  revenue: number;
}

interface ActivityStats {
  dau: number;
  wau: number;
  mau: number;
  registrations: number;
  uploads: number;
  purchases: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [topContent, setTopContent] = useState<TopContent[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [moderationStats, setModerationStats] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['users', 'resources']);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser || currentUser.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchAdminAnalytics();
  }, [router]);

  const fetchAdminAnalytics = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      if (!token) return;

      // Fetch comprehensive analytics data from the new endpoint
      const response = await fetch(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set stats from real data
        setStats({
          totalUsers: data.stats.totalUsers,
          activeUsers: data.stats.activeUsers,
          verifiedEducators: data.stats.verifiedEducators,
          pendingVerification: data.stats.pendingVerification,
          totalResources: data.stats.totalResources,
          pendingModeration: data.stats.pendingModeration,
          totalSales: data.stats.totalSales,
          totalRevenue: data.stats.totalRevenue,
          pendingActions: data.stats.pendingActions,
          averageRating: data.stats.averageRating,
        });

        // Set trends from real data
        setTrends(data.trends);

        // Set growth data from real data
        setGrowthData(data.growthData);

        // Set pending actions from real data
        setPendingActions(data.pendingActions);

        // Set top content from real data
        setTopContent(data.topContent);

        // Set activity stats from real data
        setActivityStats(data.activityStats);

        // Store moderation stats for use in the UI
        setModerationStats(data.moderationStats);
      }
    } catch (error) {
      console.error('Failed to fetch admin analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const exportAdminReport = () => {
    if (!stats) return;

    // Prepare CSV content
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('EduShare Platform Analytics Report');
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push('');

    // Platform Statistics
    csvRows.push('PLATFORM STATISTICS');
    csvRows.push('Metric,Value,Trend (%)');
    csvRows.push(`Total Users,${stats.totalUsers},${trends?.users?.toFixed(1) || '0.0'}`);
    csvRows.push(`Active Users,${stats.activeUsers},`);
    csvRows.push(`Verified Educators,${stats.verifiedEducators},${trends?.educators?.toFixed(1) || '0.0'}`);
    csvRows.push(`Pending Verification,${stats.pendingVerification},`);
    csvRows.push(`Total Resources,${stats.totalResources},${trends?.resources?.toFixed(1) || '0.0'}`);
    csvRows.push(`Pending Moderation,${stats.pendingModeration},`);
    csvRows.push(`Total Sales,${stats.totalSales},${trends?.sales?.toFixed(1) || '0.0'}`);
    csvRows.push(`Total Revenue (TND),${stats.totalRevenue},${trends?.revenue?.toFixed(1) || '0.0'}`);
    csvRows.push(`Average Rating,${stats.averageRating.toFixed(2)},`);
    csvRows.push(`Pending Actions,${stats.pendingActions},`);
    csvRows.push('');

    // Growth Data
    if (growthData && growthData.length > 0) {
      csvRows.push('PLATFORM GROWTH (Last 6 Months)');
      csvRows.push('Month,Users,Educators,Resources,Sales,Revenue');
      growthData.forEach(month => {
        csvRows.push(`${month.month},${month.users},${month.educators},${month.resources},${month.sales},${month.revenue.toFixed(2)}`);
      });
      csvRows.push('');
    }

    // Pending Actions
    if (pendingActions && pendingActions.length > 0) {
      csvRows.push('PENDING ACTIONS');
      csvRows.push('Type,Count,Priority,Description,Oldest (Days)');
      pendingActions.forEach(action => {
        csvRows.push(`${action.type},${action.count},${action.priority},"${action.description}",${action.oldestDays}`);
      });
      csvRows.push('');
    }

    // Top Content
    if (topContent && topContent.length > 0) {
      csvRows.push('TOP PERFORMING CONTENT');
      csvRows.push('Title,Subject,Downloads,Rating,Sales,Revenue');
      topContent.forEach(content => {
        csvRows.push(`"${content.title}",${content.subject},${content.downloads},${content.rating.toFixed(1)},${content.sales},${content.revenue.toFixed(2)}`);
      });
      csvRows.push('');
    }

    // Activity Stats
    if (activityStats) {
      csvRows.push('USER ACTIVITY');
      csvRows.push('Metric,Value');
      csvRows.push(`Daily Active Users (DAU),${activityStats.dau}`);
      csvRows.push(`Weekly Active Users (WAU),${activityStats.wau}`);
      csvRows.push(`Monthly Active Users (MAU),${activityStats.mau}`);
      csvRows.push(`Registrations (Last 7 Days),${activityStats.registrations}`);
      csvRows.push(`Uploads (Last 7 Days),${activityStats.uploads}`);
      csvRows.push(`Purchases (Last 7 Days),${activityStats.purchases}`);
      csvRows.push('');
    }

    // Moderation Stats
    if (moderationStats) {
      csvRows.push('CONTENT MODERATION');
      csvRows.push('Status,Count,Percentage');
      csvRows.push(`Total,${moderationStats.content.total},100%`);
      csvRows.push(`Approved,${moderationStats.content.approved},${moderationStats.content.approvalRate.toFixed(1)}%`);
      csvRows.push(`Pending,${moderationStats.content.pending},${moderationStats.content.total > 0 ? ((moderationStats.content.pending / moderationStats.content.total) * 100).toFixed(1) : '0.0'}%`);
      csvRows.push(`Rejected,${moderationStats.content.rejected},`);
      csvRows.push(`Flagged,${moderationStats.content.flagged},`);
      csvRows.push('');

      csvRows.push('AI RISK DISTRIBUTION');
      csvRows.push('Risk Level,Percentage');
      csvRows.push(`Low Risk,${moderationStats.aiRisk.lowRisk.toFixed(1)}%`);
      csvRows.push(`Medium Risk,${moderationStats.aiRisk.mediumRisk.toFixed(1)}%`);
      csvRows.push(`High Risk,${moderationStats.aiRisk.highRisk.toFixed(1)}%`);
      csvRows.push('');

      csvRows.push('VERIFICATION STATISTICS');
      csvRows.push('Metric,Value');
      csvRows.push(`Total Requests,${moderationStats.verification.total}`);
      csvRows.push(`Approved,${moderationStats.verification.approved}`);
      csvRows.push(`Pending,${moderationStats.verification.pending}`);
      csvRows.push(`Approval Rate,${moderationStats.verification.approvalRate.toFixed(1)}%`);
      csvRows.push(`Average Processing Time,${moderationStats.verification.avgProcessingDays.toFixed(1)} days`);
    }

    // Create CSV file and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const platformHealthScore = stats ? Math.round(
    (Math.min(100, (stats.activeUsers / stats.totalUsers) * 120) +
    Math.min(100, (stats.verifiedEducators / stats.totalUsers) * 800) +
    Math.min(100, (stats.averageRating / 5) * 100) +
    Math.min(100, ((stats.totalResources - stats.pendingModeration) / stats.totalResources) * 100)) / 4
  ) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading platform analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Analytics</h3>
            <p className="text-slate-600 text-sm mb-4">Unable to fetch platform analytics data</p>
            <button
              onClick={fetchAdminAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-[28px] font-bold text-slate-900">Platform Analytics</h1>
              <p className="text-slate-600">Monitor EduShare health, growth, and performance</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAdminAnalytics}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportAdminReport}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Platform KPIs */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <PlatformKPI
            icon={<Users className="w-5 h-5" />}
            label="Users"
            value={stats.totalUsers.toLocaleString()}
            subValue={`${stats.activeUsers.toLocaleString()} active`}
            trend={trends?.users || 0}
            color="blue"
          />
          <PlatformKPI
            icon={<BadgeCheck className="w-5 h-5" />}
            label="Educators"
            value={stats.verifiedEducators.toLocaleString()}
            subValue={`${stats.pendingVerification} pending`}
            trend={trends?.educators || 0}
            color="green"
          />
          <PlatformKPI
            icon={<FileText className="w-5 h-5" />}
            label="Resources"
            value={stats.totalResources.toLocaleString()}
            subValue={`${stats.pendingModeration} pending`}
            trend={trends?.resources || 0}
            color="indigo"
          />
          <PlatformKPI
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Sales"
            value={stats.totalSales.toLocaleString()}
            subValue="this month"
            trend={trends?.sales || 0}
            color="emerald"
          />
          <PlatformKPI
            icon={<DollarSign className="w-5 h-5" />}
            label="Revenue"
            value={`${stats.totalRevenue.toLocaleString()} TND`}
            subValue="total earned"
            trend={trends?.revenue || 0}
            color="green"
          />
          <PlatformKPI
            icon={<AlertCircle className="w-5 h-5" />}
            label="Alerts"
            value={stats.pendingActions.toString()}
            subValue="need attention"
            trend={0}
            color="orange"
            isAlert
          />
        </div>

        {/* Needs Attention + Platform Health */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Needs Attention */}
          <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-orange-500" />
                <h3 className="text-[17px] font-semibold text-slate-900">Needs Your Attention</h3>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {pendingActions.map((action, index) => (
                <ActionItem key={index} action={action} />
              ))}
            </div>
          </div>

          {/* Platform Health Score */}
          <div className="col-span-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Platform Health</h3>
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e0e7ff"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#healthGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(platformHealthScore / 100) * 351.86} 351.86`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">{platformHealthScore}</div>
                    <div className="text-xs text-slate-600">/ 100</div>
                  </div>
                </div>
              </div>
              <div className="text-lg font-semibold text-blue-900">
                {platformHealthScore >= 90 ? 'Excellent' : platformHealthScore >= 75 ? 'Good' : platformHealthScore >= 60 ? 'Fair' : 'Needs Attention'}
              </div>
            </div>
            <div className="space-y-3">
              <HealthMetric label="User Growth" score={94} color="blue" />
              <HealthMetric label="Content Quality" score={92} color="indigo" />
              <HealthMetric label="Marketplace" score={89} color="emerald" />
              <HealthMetric label="System Reliability" score={97} color="green" />
            </div>
          </div>
        </div>

        {/* Platform Growth Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[17px] font-semibold text-slate-900">Platform Growth</h3>
            <div className="flex items-center gap-2">
              {(['users', 'educators', 'resources', 'sales'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    selectedMetrics.includes(metric)
                      ? metric === 'users' ? 'bg-blue-100 text-blue-700' :
                        metric === 'educators' ? 'bg-green-100 text-green-700' :
                        metric === 'resources' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEducators" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResources" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                {selectedMetrics.includes('users') && (
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorUsers)" name="Users" />
                )}
                {selectedMetrics.includes('educators') && (
                  <Area type="monotone" dataKey="educators" stroke="#10b981" strokeWidth={2.5} fill="url(#colorEducators)" name="Educators" />
                )}
                {selectedMetrics.includes('resources') && (
                  <Area type="monotone" dataKey="resources" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorResources)" name="Resources" />
                )}
                {selectedMetrics.includes('sales') && (
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2.5} fill="url(#colorSales)" name="Sales" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketplace Performance + User Activity */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Marketplace Performance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Marketplace Performance</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-emerald-600">{stats.totalRevenue.toLocaleString()} TND</div>
                {trends && (
                  <div className="flex items-center gap-1 mt-1">
                    {trends.revenue >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${trends.revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {trends.revenue >= 0 ? '+' : ''}{trends.revenue.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Total Sales</div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalSales.toLocaleString()}</div>
                {trends && (
                  <div className="flex items-center gap-1 mt-1">
                    {trends.sales >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${trends.sales >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {trends.sales >= 0 ? '+' : ''}{trends.sales.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Avg. Order Value</span>
                <span className="font-semibold text-slate-900">
                  {stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : '0.00'} TND
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Conversion Rate</span>
                <span className="font-semibold text-slate-900">
                  {stats.totalResources > 0 ? ((stats.totalSales / stats.totalResources) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" name="Revenue (TND)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">User Activity</h3>
            {activityStats && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{activityStats.dau}</div>
                    <div className="text-xs text-slate-600 mt-1">DAU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{activityStats.wau.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">WAU</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{activityStats.mau.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">MAU</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ActivityBar label="Registrations" value={activityStats.registrations} max={200} color="blue" />
                  <ActivityBar label="Uploads" value={activityStats.uploads} max={200} color="indigo" />
                  <ActivityBar label="Purchases" value={activityStats.purchases} max={200} color="emerald" />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Monthly Active Rate</span>
                    <span className="font-semibold text-slate-900">
                      {((activityStats.mau / stats.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Content + Content Moderation */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top Content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-amber-500" />
                <h3 className="text-[17px] font-semibold text-slate-900">Top Performing Content</h3>
              </div>
            </div>
            <div className="space-y-3">
              {topContent.map((content, index) => (
                <div
                  key={content.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{content.title}</div>
                    <div className="text-xs text-slate-600">{content.subject}</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{content.downloads.toLocaleString()}</div>
                      <div className="text-xs text-slate-600">downloads</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-emerald-600">{content.revenue.toLocaleString()} TND</div>
                      <div className="text-xs text-slate-600">revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Moderation */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-500" />
              <h3 className="text-[17px] font-semibold text-slate-900">Content Moderation</h3>
            </div>
            {moderationStats && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{moderationStats.content.approvalRate.toFixed(1)}%</div>
                    <div className="text-xs text-green-600 mt-1">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {moderationStats.content.total > 0 ? ((moderationStats.content.pending / moderationStats.content.total) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-xs text-blue-600 mt-1">Pending</div>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Approved</span>
                    <span className="font-semibold text-green-600">{moderationStats.content.approved.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Pending</span>
                    <span className="font-semibold text-blue-600">{moderationStats.content.pending.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Rejected</span>
                    <span className="font-semibold text-red-600">{moderationStats.content.rejected.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Flagged</span>
                    <span className="font-semibold text-orange-600">{moderationStats.content.flagged.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-sm font-medium text-slate-700 mb-3">AI Risk Distribution</div>
                  <div className="space-y-2">
                    <RiskBar label="Low Risk" percentage={moderationStats.aiRisk.lowRisk} color="green" />
                    <RiskBar label="Medium Risk" percentage={moderationStats.aiRisk.mediumRisk} color="amber" />
                    <RiskBar label="High Risk" percentage={moderationStats.aiRisk.highRisk} color="red" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Verification + Reports */}
        <div className="grid grid-cols-2 gap-6">
          {/* Verification Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <BadgeCheck className="w-6 h-6 text-green-500" />
              <h3 className="text-[17px] font-semibold text-slate-900">Educator Verification</h3>
            </div>
            {moderationStats && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{moderationStats.verification.total.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{moderationStats.verification.approved.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{moderationStats.verification.pending.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Pending</div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Approval Rate</span>
                    <span className="font-semibold text-green-600">{moderationStats.verification.approvalRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Avg. Processing Time</span>
                    <span className="font-semibold text-slate-900">{moderationStats.verification.avgProcessingDays.toFixed(1)} days</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reports & Quality */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Flag className="w-6 h-6 text-red-500" />
              <h3 className="text-[17px] font-semibold text-slate-900">Reports & Platform Quality</h3>
            </div>
            {moderationStats && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{moderationStats.reports.total.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Total Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{moderationStats.reports.open.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{moderationStats.reports.resolved.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 mt-1">Resolved</div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Platform Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-900">{stats.averageRating.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component: Platform KPI Card
function PlatformKPI({ icon, label, value, subValue, trend, color, isAlert = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  trend: number;
  color: string;
  isAlert?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className={`${colorClasses[color]} mb-3`}>{icon}</div>
      <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subValue}</div>
      {!isAlert && trend !== 0 && (
        <div className="flex items-center gap-1 mt-2">
          {trend >= 0 ? (
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Component: Action Item
function ActionItem({ action }: { action: PendingAction }) {
  const priorityColors = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-orange-50 border-orange-200',
    low: 'bg-yellow-50 border-yellow-200',
  };

  const priorityIcons = {
    high: 'text-red-600',
    medium: 'text-orange-600',
    low: 'text-yellow-600',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${priorityColors[action.priority]}`}>
      <div className="flex items-center gap-3">
        <AlertCircle className={`w-5 h-5 ${priorityIcons[action.priority]}`} />
        <div>
          <div className="font-medium text-slate-900">{action.description}</div>
          <div className="text-xs text-slate-600 mt-0.5">Oldest request: {action.oldestDays} days ago</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-slate-900">{action.count}</div>
        <button className="p-2 hover:bg-white rounded-lg transition-colors">
          <ArrowRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

// Component: Health Metric
function HealthMetric({ label, score, color }: { label: string; score: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    green: 'bg-green-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs font-bold text-slate-900">{score}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}

// Component: Activity Bar
function ActivityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
  };

  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs font-semibold text-slate-900">{value}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

// Component: Risk Bar
function RiskBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs font-medium text-slate-700">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="w-12 text-xs font-semibold text-slate-900 text-right">{percentage}%</div>
    </div>
  );
}
