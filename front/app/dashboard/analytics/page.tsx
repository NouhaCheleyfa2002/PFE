"use client";

import { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import {
  Eye,
  Download,
  ShoppingCart,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertCircle,
  Trophy,
  Calendar,
  FileDown,
  ArrowRight,
  Target,
  Lightbulb,
  Activity,
  Users,
  TrendingUpIcon,
  Zap,
  Award,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";

// TypeScript interfaces
interface ResourceAnalytics {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  views: number;
  downloads: number;
  rating: number;
  totalRatings: number;
  bookmarks: number;
  sales: number;
  revenue: number;
}

interface TeacherAnalytics {
  totalResources: number;
  totalViews: number;
  totalDownloads: number;
  totalBookmarks: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  topResources: ResourceAnalytics[];
  trends: {
    viewsTrend: number;
    downloadsTrend: number;
    salesTrend: number;
    revenueTrend: number;
    ratingTrend: number;
  };
  engagementOverTime: Array<{
    month: string;
    views: number;
    downloads: number;
    bookmarks: number;
  }>;
}

interface RevenueData {
  totalRevenue: number;
  totalSales: number;
  revenueByMonth: Array<{ month: string; revenue: number; sales: number }>;
}

type DateRange = 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'thisyear';

type EngagementMetric = 'views' | 'downloads' | 'bookmarks';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<TeacherAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('last30days');
  const [selectedMetrics, setSelectedMetrics] = useState<EngagementMetric[]>(['views', 'downloads']);

  useEffect(() => {
    fetchAnalytics();
    fetchRevenueData();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    const token = authService.getToken();
    
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/documents/teacher-analytics?dateRange=${dateRange}`;
      
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/purchases/seller-analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRevenueData(data);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
    }
  };

  const toggleMetric = (metric: EngagementMetric) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData || analyticsData.totalResources === 0) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Resources Yet</h3>
            <p className="text-slate-600 text-sm">Upload your first resource to start tracking performance.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate all metrics
  const totalViews = analyticsData.totalViews || 0;
  const totalDownloads = analyticsData.totalDownloads || 0;
  const totalSales = analyticsData.totalSales || 0;
  const totalRevenue = analyticsData.totalRevenue || 0;
  const avgRating = analyticsData.averageRating || 0;
  const totalBookmarks = analyticsData.totalBookmarks || 0;
  
  const trends = analyticsData.trends || {
    viewsTrend: 0,
    downloadsTrend: 0,
    salesTrend: 0,
    revenueTrend: 0,
    ratingTrend: 0,
  };

  // Engagement rate (downloads/views)
  const engagementRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;
  const engagementTrend = trends.downloadsTrend - trends.viewsTrend;

  // Conversion rates
  const downloadConversion = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0;
  const purchaseConversion = totalDownloads > 0 ? (totalSales / totalDownloads) * 100 : 0;
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Performance score calculation
  const engagementScore = Math.min(100, (downloadConversion / 40) * 100);
  const conversionScore = Math.min(100, (purchaseConversion / 5) * 100);
  const ratingScore = (avgRating / 5) * 100;
  const growthScore = Math.min(100, Math.max(0, 50 + trends.viewsTrend));
  const performanceScore = Math.round((engagementScore + conversionScore + ratingScore + growthScore) / 4);

  // Get top resources
  const topPerformer = analyticsData.topResources?.[0];
  const topEarner = analyticsData.topResources
    ?.filter(r => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)[0];

  // Rating distribution
  const totalRatingCount = Object.values(analyticsData.ratingDistribution).reduce((a, b) => a + b, 0);
  const ratingPercentages = totalRatingCount > 0
    ? {
        5: Math.round(((analyticsData.ratingDistribution[5] || 0) / totalRatingCount) * 100),
        4: Math.round(((analyticsData.ratingDistribution[4] || 0) / totalRatingCount) * 100),
        3: Math.round(((analyticsData.ratingDistribution[3] || 0) / totalRatingCount) * 100),
        2: Math.round(((analyticsData.ratingDistribution[2] || 0) / totalRatingCount) * 100),
        1: Math.round(((analyticsData.ratingDistribution[1] || 0) / totalRatingCount) * 100),
      }
    : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  // AI insights
  const insights = generateInsights(analyticsData, revenueData);

  // Performance by subject
  const performanceBySubject = getPerformanceBySubject(analyticsData.topResources || []);

  // Generate sparkline data for KPIs
  const generateSparkline = () => {
    return analyticsData.engagementOverTime?.slice(-7).map(d => d.views) || [1, 2, 2, 3, 4, 5, 6, 7];
  };

  const downloadReport = () => {
    const csvRows = [];
    
    csvRows.push(['EduShare Analytics Report']);
    csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
    csvRows.push(['']);
    
    csvRows.push(['Overview Statistics']);
    csvRows.push(['Metric', 'Value']);
    csvRows.push(['Total Views', totalViews]);
    csvRows.push(['Total Downloads', totalDownloads]);
    csvRows.push(['Total Sales', totalSales]);
    csvRows.push(['Total Revenue (TND)', totalRevenue.toFixed(2)]);
    csvRows.push(['Average Rating', avgRating.toFixed(1)]);
    csvRows.push(['']);
    
    if (analyticsData.topResources.length > 0) {
      csvRows.push(['Resource Performance']);
      csvRows.push(['Title', 'Subject', 'Views', 'Downloads', 'Sales', 'Revenue', 'Rating']);
      analyticsData.topResources.forEach((resource) => {
        csvRows.push([
          resource.title,
          resource.subject,
          resource.views,
          resource.downloads,
          resource.sales,
          Number(resource.revenue || 0).toFixed(2),
          Number(resource.rating || 0).toFixed(1),
        ]);
      });
    }
    
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const dateRangeLabels = {
    last7days: 'Last 7 days',
    last30days: 'Last 30 days',
    last3months: 'Last 3 months',
    last6months: 'Last 6 months',
    thisyear: 'This year',
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[28px] font-bold text-slate-900">Analytics</h1>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="pl-10 pr-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer shadow-sm"
              >
                <option value="last7days">Last 7 days</option>
                <option value="last30days">Last 30 days</option>
                <option value="last3months">Last 3 months</option>
                <option value="last6months">Last 6 months</option>
                <option value="thisyear">This year</option>
              </select>
              <Calendar className="w-4 h-4 text-slate-400 absolute left-[1107px] pointer-events-none" />
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>
          <p className="text-slate-600">Understand and improve your content performance</p>
        </div>

        {/* KPI Cards with Sparklines */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <EnhancedKPICard
            icon={<Eye className="w-5 h-5" />}
            label="Views"
            value={totalViews.toLocaleString()}
            trend={trends.viewsTrend}
            sparklineData={generateSparkline()}
            color="blue"
          />
          <EnhancedKPICard
            icon={<Download className="w-5 h-5" />}
            label="Downloads"
            value={totalDownloads.toLocaleString()}
            trend={trends.downloadsTrend}
            sparklineData={generateSparkline()}
            color="indigo"
          />
          <EnhancedKPICard
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Sales"
            value={totalSales.toLocaleString()}
            trend={trends.salesTrend}
            sparklineData={generateSparkline()}
            color="emerald"
          />
          <EnhancedKPICard
            icon={<DollarSign className="w-5 h-5" />}
            label="Revenue"
            value={`${totalRevenue.toFixed(0)} TND`}
            trend={trends.revenueTrend}
            sparklineData={generateSparkline()}
            color="green"
          />
          <EnhancedKPICard
            icon={<Star className="w-5 h-5" />}
            label="Rating"
            value={`${avgRating.toFixed(1)}`}
            trend={trends.ratingTrend}
            sparklineData={generateSparkline()}
            color="amber"
            suffix="★"
          />
          <EnhancedKPICard
            icon={<Activity className="w-5 h-5" />}
            label="Engagement"
            value={`${engagementRate.toFixed(1)}%`}
            trend={engagementTrend}
            sparklineData={generateSparkline()}
            color="purple"
          />
        </div>

        {/* Main Charts Row: Content Engagement + Performance Score */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Content Engagement Chart */}
          <div className="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[17px] font-semibold text-slate-900">Content Engagement</h3>
              <div className="flex items-center gap-2">
                {(['views', 'downloads', 'bookmarks'] as EngagementMetric[]).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => toggleMetric(metric)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      selectedMetrics.includes(metric)
                        ? metric === 'views' ? 'bg-blue-100 text-blue-700' :
                          metric === 'downloads' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[300px]">
              {analyticsData.engagementOverTime && analyticsData.engagementOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.engagementOverTime}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBookmarks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    {selectedMetrics.includes('views') && (
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5}
                        fill="url(#colorViews)" 
                        name="Views"
                      />
                    )}
                    {selectedMetrics.includes('downloads') && (
                      <Area 
                        type="monotone" 
                        dataKey="downloads" 
                        stroke="#6366f1" 
                        strokeWidth={2.5}
                        fill="url(#colorDownloads)" 
                        name="Downloads"
                      />
                    )}
                    {selectedMetrics.includes('bookmarks') && (
                      <Area 
                        type="monotone" 
                        dataKey="bookmarks" 
                        stroke="#a855f7" 
                        strokeWidth={2.5}
                        fill="url(#colorBookmarks)" 
                        name="Bookmarks"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No engagement data available yet
                </div>
              )}
            </div>
          </div>

          {/* Performance Score */}
          <div className="col-span-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Performance Score</h3>
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
                    stroke="url(#scoreGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(performanceScore / 100) * 351.86} 351.86`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">{performanceScore}</div>
                    <div className="text-xs text-slate-600">/ 100</div>
                  </div>
                </div>
              </div>
              <div className="text-lg font-semibold text-blue-900">
                {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : performanceScore >= 40 ? 'Average' : 'Needs Improvement'}
              </div>
            </div>
            <div className="space-y-3">
              <ScoreBreakdown label="Engagement" score={Math.round(engagementScore)} color="blue" />
              <ScoreBreakdown label="Conversion" score={Math.round(conversionScore)} color="indigo" />
              <ScoreBreakdown label="Rating" score={Math.round(ratingScore)} color="amber" />
              <ScoreBreakdown label="Growth" score={Math.round(growthScore)} color="emerald" />
            </div>
          </div>
        </div>

        {/* Content Funnel + Revenue Performance */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Content Funnel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Content Funnel</h3>
            <div className="space-y-4">
              <FunnelStep
                icon={<Eye className="w-5 h-5" />}
                label="Views"
                value={totalViews.toLocaleString()}
                percentage={100}
                color="blue"
              />
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">{downloadConversion.toFixed(1)}% conversion</span>
                </div>
              </div>
              <FunnelStep
                icon={<Download className="w-5 h-5" />}
                label="Downloads"
                value={totalDownloads.toLocaleString()}
                percentage={downloadConversion}
                color="indigo"
              />
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">{purchaseConversion.toFixed(1)}% conversion</span>
                </div>
              </div>
              <FunnelStep
                icon={<ShoppingCart className="w-5 h-5" />}
                label="Purchases"
                value={totalSales.toLocaleString()}
                percentage={purchaseConversion * (downloadConversion / 100)}
                color="emerald"
              />
              <div className="flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-slate-400" />
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-700">Total Revenue</div>
                      <div className="text-2xl font-bold text-emerald-900">{totalRevenue.toFixed(0)} TND</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">Avg. Order</div>
                    <div className="text-lg font-semibold text-slate-900">{avgOrderValue.toFixed(1)} TND</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue & Sales */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[17px] font-semibold text-slate-900">Revenue & Sales</h3>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-600">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">Sales</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-slate-600 mb-1">Total Revenue</div>
                <div className="text-2xl font-bold text-emerald-600">{totalRevenue.toFixed(0)} TND</div>
                <div className="flex items-center gap-1 mt-1">
                  {trends.revenueTrend >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${trends.revenueTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trends.revenueTrend >= 0 ? '+' : ''}{trends.revenueTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Total Sales</div>
                <div className="text-2xl font-bold text-blue-600">{totalSales}</div>
                <div className="flex items-center gap-1 mt-1">
                  {trends.salesTrend >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${trends.salesTrend >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {trends.salesTrend >= 0 ? '+' : ''}{trends.salesTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="h-[220px]">
              {revenueData && revenueData.revenueByMonth && revenueData.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData.revenueByMonth}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      name="Revenue (TND)"
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Sales"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No revenue data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performing Content */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-500" />
              <h3 className="text-[17px] font-semibold text-slate-900">Top Performing Content</h3>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all resources
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {analyticsData.topResources.slice(0, 5).map((resource, index) => {
              const conversion = resource.views > 0 ? ((resource.downloads / resource.views) * 100) : 0;
              return (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{resource.title}</div>
                    <div className="text-xs text-slate-600">{resource.subject} • {resource.classLevel}</div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{resource.views.toLocaleString()}</div>
                      <div className="text-xs text-slate-600">views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{resource.downloads.toLocaleString()}</div>
                      <div className="text-xs text-slate-600">downloads</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{resource.sales}</div>
                      <div className="text-xs text-slate-600">sales</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="font-semibold text-emerald-600">{Number(resource.revenue || 0).toFixed(0)} TND</div>
                      <div className="text-xs text-slate-600">revenue</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-900">{Number(resource.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject Performance + Student Activity */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Subject Performance */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Subject Performance</h3>
            <div className="space-y-4">
              {performanceBySubject.map((subject, index) => {
                const maxViews = performanceBySubject[0]?.views || 1;
                const percentage = (subject.views / maxViews) * 100;
                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500'];
                return (
                  <div key={subject.subject}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{subject.subject}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {Math.round((subject.views / totalViews) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-600">
                      <span>{subject.views.toLocaleString()} views</span>
                      <span>{subject.downloads.toLocaleString()} downloads</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-[17px] font-semibold text-slate-900 mb-6">Rating Distribution</h3>
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-slate-900 mb-2">{avgRating.toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.floor(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                ))}
              </div>
              <div className="text-sm text-slate-600">Based on {totalRatingCount} ratings</div>
            </div>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-12">
                    <span className="text-sm font-medium text-slate-700">{stars}</span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${ratingPercentages[stars as keyof typeof ratingPercentages]}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 w-12 text-right">
                    {ratingPercentages[stars as keyof typeof ratingPercentages]}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl border border-purple-200 shadow-sm p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h3 className="text-[19px] font-bold text-slate-900">AI Performance Insights</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">Based on your content performance and student engagement patterns</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, idx) => (
                <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{insight.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-1">{insight.title}</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced KPI Card with Sparkline
function EnhancedKPICard({ icon, label, value, trend, sparklineData, color, suffix }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: number;
  sparklineData: number[];
  color: 'blue' | 'indigo' | 'emerald' | 'green' | 'amber' | 'purple';
  suffix?: string;
}) {
  const isPositive = trend >= 0;
  const colorClasses = {
    blue: 'text-blue-600',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  const max = Math.max(...sparklineData);
  const min = Math.min(...sparklineData);
  const range = max - min || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className={`${colorClasses[color]}`}>{icon}</div>
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</span>
      </div>
      <div className="mb-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {suffix && <span className="text-lg text-amber-400 ml-1">{suffix}</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{Math.abs(trend).toFixed(1)}%
          </span>
        </div>
        {/* Mini Sparkline */}
        <svg width="60" height="20" className="opacity-50">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={colorClasses[color]}
            points={sparklineData
              .map((value, index) => {
                const x = (index / (sparklineData.length - 1)) * 60;
                const y = 20 - ((value - min) / range) * 16;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>
    </div>
  );
}

// Score Breakdown Component
function ScoreBreakdown({ label, score, color }: {
  label: string;
  score: number;
  color: 'blue' | 'indigo' | 'amber' | 'emerald';
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
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

// Funnel Step Component
function FunnelStep({ icon, label, value, percentage, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percentage: number;
  color: 'blue' | 'indigo' | 'emerald';
}) {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  };

  const colors = colorClasses[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <div className={colors.text}>{icon}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700">{label}</div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
          </div>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

// Helper functions
function generateInsights(analytics: TeacherAnalytics, revenue: RevenueData | null) {
  const insights: Array<{ icon: React.ReactNode; title: string; text: string }> = [];

  // Growth insight
  if (analytics.trends && analytics.trends.viewsTrend > 10) {
    insights.push({
      icon: <TrendingUpIcon className="w-5 h-5 text-blue-600" />,
      title: 'Growing Audience',
      text: `Your resource views increased ${analytics.trends.viewsTrend.toFixed(1)}% this period. Your content is gaining traction with students.`
    });
  }

  // Top performer insight
  const topResource = analytics.topResources[0];
  if (topResource) {
    const conversion = topResource.views > 0 ? ((topResource.downloads / topResource.views) * 100) : 0;
    if (conversion > 25) {
      insights.push({
        icon: <Trophy className="w-5 h-5 text-amber-600" />,
        title: 'High Performing Content',
        text: `"${topResource.title}" has excellent ${conversion.toFixed(1)}% conversion rate with ${topResource.views.toLocaleString()} views.`
      });
    } else if (conversion < 15 && topResource.views > 50) {
      insights.push({
        icon: <Target className="w-5 h-5 text-orange-600" />,
        title: 'Optimization Opportunity',
        text: `"${topResource.title}" has ${topResource.views} views but only ${conversion.toFixed(1)}% conversion. Consider improving the preview or description.`
      });
    }
  }

  // Subject strength insight
  const subjectPerf = getPerformanceBySubject(analytics.topResources || []);
  if (subjectPerf.length > 0 && analytics.totalViews > 0) {
    const topSubject = subjectPerf[0];
    const percentage = ((topSubject.views / analytics.totalViews) * 100).toFixed(0);
    insights.push({
      icon: <BarChart3 className="w-5 h-5 text-indigo-600" />,
      title: 'Content Strength',
      text: `${topSubject.subject} is your strongest category, generating ${percentage}% of total engagement. Consider creating more content in this subject.`
    });
  }

  // Revenue insight
  const topEarner = analytics.topResources
    ?.filter(r => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)[0];
  
  if (topEarner && topEarner.revenue > 0 && analytics.totalRevenue > 0) {
    const revenueShare = ((topEarner.revenue / analytics.totalRevenue) * 100).toFixed(0);
    insights.push({
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      title: 'Revenue Leader',
      text: `"${topEarner.title}" generates ${revenueShare}% of your total revenue with ${topEarner.sales} sales at ${Number(topEarner.revenue || 0).toFixed(0)} TND.`
    });
  }

  // Quality insight
  if (analytics.averageRating >= 4.5) {
    insights.push({
      icon: <Award className="w-5 h-5 text-amber-600" />,
      title: 'Outstanding Quality',
      text: `Your ${analytics.averageRating.toFixed(1)} ★ average rating shows exceptional content quality. Students highly value your resources.`
    });
  }

  // Engagement insight
  const avgConversion = analytics.totalViews > 0 
    ? (analytics.totalDownloads / analytics.totalViews) * 100 
    : 0;
  
  if (avgConversion > 30) {
    insights.push({
      icon: <Zap className="w-5 h-5 text-purple-600" />,
      title: 'High Engagement',
      text: `Excellent ${avgConversion.toFixed(1)}% download conversion rate. Your resources effectively capture student interest.`
    });
  } else if (avgConversion > 0 && avgConversion < 20) {
    insights.push({
      icon: <Lightbulb className="w-5 h-5 text-amber-600" />,
      title: 'Recommended Action',
      text: `Your ${avgConversion.toFixed(1)}% conversion rate can be improved. Add detailed previews, clear descriptions, and compelling thumbnails to increase downloads.`
    });
  }

  // Return up to 4 most relevant insights
  return insights.slice(0, 4);
}

function getPerformanceBySubject(resources: ResourceAnalytics[]) {
  const subjectMap = new Map<string, { views: number; downloads: number }>();
  
  resources.forEach(r => {
    const subject = r.subject || 'Other';
    const existing = subjectMap.get(subject) || { views: 0, downloads: 0 };
    subjectMap.set(subject, {
      views: existing.views + r.views,
      downloads: existing.downloads + r.downloads,
    });
  });

  return Array.from(subjectMap.entries())
    .map(([subject, data]) => ({ subject, ...data }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
}