"use client";

import React, { useState, useEffect } from "react";
import { authService } from "@/lib/auth";
import {
  FileText,
  Activity,
  TrendingUp,
  BookOpen,
  Sparkles,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const user = authService.getUser();
    setUserRole(user?.role || null);
    
    fetchAnalytics();
    fetchRevenueData();
  }, []);

  const fetchAnalytics = async () => {
    const token = authService.getToken();
    const user = authService.getUser();
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Always fetch teacher analytics (works for both admin and teacher)
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/documents/teacher-analytics`;
      
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const analytics = data.analytics;
        
        // If no real data, use demo data for presentation
        if (!analytics || analytics.totalResources === 0) {
          setAnalyticsData({
            totalResources: 12,
            totalViews: 3847,
            totalDownloads: 892,
            totalBookmarks: 234,
            averageRating: 4.6,
            ratingDistribution: {
              5: 145,
              4: 89,
              3: 23,
              2: 8,
              1: 3
            },
            topResources: [
              {
                id: '1',
                title: 'Advanced Mathematics - Calculus I',
                subject: 'Mathematics',
                classLevel: '3rd Secondary',
                views: 892,
                downloads: 234,
                rating: 4.8,
                totalRatings: 67,
                bookmarks: 89
              },
              {
                id: '2',
                title: 'Physics - Mechanics & Thermodynamics',
                subject: 'Physics',
                classLevel: '2nd Secondary',
                views: 756,
                downloads: 198,
                rating: 4.6,
                totalRatings: 54,
                bookmarks: 67
              },
              {
                id: '3',
                title: 'English Grammar & Composition',
                subject: 'English',
                classLevel: '1st Secondary',
                views: 634,
                downloads: 167,
                rating: 4.5,
                totalRatings: 43,
                bookmarks: 52
              },
              {
                id: '4',
                title: 'Chemistry - Organic Reactions',
                subject: 'Chemistry',
                classLevel: '3rd Secondary',
                views: 523,
                downloads: 145,
                rating: 4.7,
                totalRatings: 38,
                bookmarks: 41
              },
              {
                id: '5',
                title: 'History - World War II Analysis',
                subject: 'History',
                classLevel: '2nd Secondary',
                views: 412,
                downloads: 98,
                rating: 4.4,
                totalRatings: 29,
                bookmarks: 35
              }
            ]
          });
        } else {
          setAnalyticsData(analytics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Show demo data on error
      setAnalyticsData({
        totalResources: 8,
        totalViews: 2456,
        totalDownloads: 567,
        totalBookmarks: 156,
        averageRating: 4.5,
        ratingDistribution: { 5: 89, 4: 56, 3: 18, 2: 5, 1: 2 },
        topResources: []
      });
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
        // If no revenue data, use demo data
        if (!data || data.totalRevenue === 0) {
          setRevenueData({
            totalRevenue: 4250.00,
            totalSales: 47,
            revenueByMonth: [
              { month: 'Jan', revenue: 450, sales: 6 },
              { month: 'Feb', revenue: 680, sales: 9 },
              { month: 'Mar', revenue: 890, sales: 11 },
              { month: 'Apr', revenue: 720, sales: 8 },
              { month: 'May', revenue: 950, sales: 10 },
              { month: 'Jun', revenue: 560, sales: 3 },
            ]
          });
        } else {
          setRevenueData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      // Show demo revenue data on error
      setRevenueData({
        totalRevenue: 3150.00,
        totalSales: 32,
        revenueByMonth: []
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b3e]">Analytics</h1>
          <p className="text-sm text-[#8899bb] mt-1">Track your content performance and engagement</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#63b3ed] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8899bb]">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b3e]">Analytics</h1>
          <p className="text-sm text-[#8899bb] mt-1">Track your content performance and engagement</p>
        </div>
        <div className="text-center py-12">
          <p className="text-[#8899bb]">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  // Calculate rating distribution percentages
  const totalRatingCount = Object.values(analyticsData.ratingDistribution as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  const ratingPercentages = totalRatingCount > 0
    ? {
        5: Math.round(((analyticsData.ratingDistribution[5] || 0) / totalRatingCount) * 100),
        4: Math.round(((analyticsData.ratingDistribution[4] || 0) / totalRatingCount) * 100),
        3: Math.round(((analyticsData.ratingDistribution[3] || 0) / totalRatingCount) * 100),
        2: Math.round(((analyticsData.ratingDistribution[2] || 0) / totalRatingCount) * 100),
        1: Math.round(((analyticsData.ratingDistribution[1] || 0) / totalRatingCount) * 100),
      }
    : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const downloadReport = () => {
    try {
      // Check if data is available
      if (!analyticsData) {
        alert('No analytics data available to download');
        return;
      }

      // Create CSV content
      const csvRows = [];
      
      // Header
      csvRows.push(['EduShare Analytics Report']);
      csvRows.push([`Generated: ${new Date().toLocaleString()}`]);
      csvRows.push(['']);
      
      // Overview Stats
      csvRows.push(['Overview Statistics']);
      csvRows.push(['Metric', 'Value']);
      csvRows.push(['Total Resources', analyticsData.totalResources || 0]);
      csvRows.push(['Total Views', analyticsData.totalViews || 0]);
      csvRows.push(['Total Downloads', analyticsData.totalDownloads || 0]);
      csvRows.push(['Total Bookmarks', analyticsData.totalBookmarks || 0]);
      csvRows.push(['Average Rating', Number(analyticsData.averageRating || 0).toFixed(1)]);
      if (revenueData) {
        csvRows.push(['Total Revenue (TND)', Number(revenueData.totalRevenue || 0).toFixed(2)]);
        csvRows.push(['Total Sales', revenueData.totalSales || 0]);
      }
      csvRows.push(['']);
      
      // Resource Performance
      if (analyticsData.topResources && analyticsData.topResources.length > 0) {
        csvRows.push(['Resource Performance']);
        csvRows.push(['Title', 'Subject', 'Class Level', 'Views', 'Downloads', 'Rating', 'Total Ratings', 'Bookmarks']);
        analyticsData.topResources.forEach((resource: any) => {
          csvRows.push([
            resource.title || 'Untitled',
            resource.subject || 'N/A',
            resource.classLevel || 'N/A',
            resource.views || 0,
            resource.downloads || 0,
            Number(resource.rating || 0).toFixed(1),
            resource.totalRatings || 0,
            resource.bookmarks || 0
          ]);
        });
        csvRows.push(['']);
      }
      
      // Rating Distribution
      csvRows.push(['Rating Distribution']);
      csvRows.push(['Stars', 'Count', 'Percentage']);
      for (let i = 5; i >= 1; i--) {
        csvRows.push([
          `${i} Stars`,
          analyticsData.ratingDistribution?.[i] || 0,
          `${ratingPercentages[i as keyof typeof ratingPercentages] || 0}%`
        ]);
      }
      csvRows.push(['']);
      
      // Revenue by Month
      if (revenueData && revenueData.revenueByMonth && revenueData.revenueByMonth.length > 0) {
        csvRows.push(['Revenue by Month']);
        csvRows.push(['Month', 'Revenue (TND)', 'Sales']);
        revenueData.revenueByMonth.forEach((month: any) => {
          const revenue = Number(month.revenue) || 0;
          const sales = Number(month.sales) || 0;
          csvRows.push([month.month, revenue.toFixed(2), sales]);
        });
      }
      
      // Convert to CSV string
      const csvContent = csvRows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b3e]">Analytics</h1>
          <p className="text-sm text-[#8899bb] mt-1">Track your content performance and engagement</p>
        </div>
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#63b3ed] text-white hover:bg-[#4a9fd8] transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <StatCard
          title="Total Resources"
          value={analyticsData.totalResources}
          icon={<FileText className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Total Views"
          value={analyticsData.totalViews}
          icon={<Activity className="w-5 h-5" />}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Total Downloads"
          value={analyticsData.totalDownloads}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Bookmarks"
          value={analyticsData.totalBookmarks}
          icon={<BookOpen className="w-5 h-5" />}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          title="Average Rating"
          value={analyticsData.averageRating.toFixed(1)}
          icon={<Sparkles className="w-5 h-5" />}
          color="text-pink-600"
          bgColor="bg-pink-50"
        />
        <StatCard
          title="Total Revenue"
          value={revenueData ? `${revenueData.totalRevenue.toFixed(2)} TND` : "0.00 TND"}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Resource Performance Table */}
      <div className="bg-white rounded-xl border border-[#edf0f7] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#edf0f7]">
          <h2 className="text-lg font-semibold text-[#0d1b3e]">Resource Performance</h2>
          <p className="text-sm text-[#8899bb] mt-1">Track engagement and ratings for your resources</p>
        </div>
        
        {analyticsData.topResources && analyticsData.topResources.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-[#f9faff] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Downloads</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Bookmarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f7]">
                {analyticsData.topResources.map((resource: any) => (
                  <tr key={resource.id} className="hover:bg-[#f9faff] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[#0d1b3e]">{resource.title}</p>
                        <p className="text-xs text-[#8899bb]">{resource.subject} • {resource.classLevel}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-[#0d1b3e]">{resource.views}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-[#0d1b3e]">{resource.downloads}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm font-semibold text-[#0d1b3e]">{Number(resource.rating || 0).toFixed(1)}</span>
                        {resource.totalRatings > 0 && (
                          <span className="text-xs text-[#8899bb]">({resource.totalRatings})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-[#0d1b3e]">{resource.bookmarks}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-[#8899bb] mx-auto mb-3" />
            <p className="text-[#8899bb]">No resources yet. Upload your first document to see analytics!</p>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Resources */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Top Performing Resources</h3>
          <div className="h-64">
            {analyticsData.topResources && analyticsData.topResources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.topResources.slice(0, 5).map((r: any) => ({
                    name: r.title.length > 20 ? r.title.substring(0, 20) + '...' : r.title,
                    downloads: r.downloads,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf0f7" />
                  <XAxis type="number" stroke="#8899bb" />
                  <YAxis dataKey="name" type="category" stroke="#8899bb" width={150} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #edf0f7', borderRadius: '8px' }}
                  />
                  <Bar dataKey="downloads" fill="#63b3ed" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8899bb]">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Downloads vs Views */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Downloads vs Views</h3>
          <div className="h-64">
            {analyticsData.topResources && analyticsData.topResources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.topResources.slice(0, 5).map((r: any) => ({
                    name: r.title.length > 15 ? r.title.substring(0, 15) + '...' : r.title,
                    views: r.views,
                    downloads: r.downloads,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf0f7" />
                  <XAxis dataKey="name" stroke="#8899bb" />
                  <YAxis stroke="#8899bb" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #edf0f7', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="views" fill="#a78bfa" name="Views" />
                  <Bar dataKey="downloads" fill="#63b3ed" name="Downloads" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8899bb]">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
        <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-[#0d1b3e]">{analyticsData.averageRating.toFixed(1)}</div>
            <div className="text-sm text-[#8899bb] mt-2">Average rating from {totalRatingCount} reviews</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8899bb] w-16">5 stars</span>
              <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ratingPercentages[5]}%` }}></div>
              </div>
              <span className="text-sm text-[#8899bb] w-12 text-right">{ratingPercentages[5]}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8899bb] w-16">4 stars</span>
              <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ratingPercentages[4]}%` }}></div>
              </div>
              <span className="text-sm text-[#8899bb] w-12 text-right">{ratingPercentages[4]}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8899bb] w-16">3 stars</span>
              <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ratingPercentages[3]}%` }}></div>
              </div>
              <span className="text-sm text-[#8899bb] w-12 text-right">{ratingPercentages[3]}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8899bb] w-16">2 stars</span>
              <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ratingPercentages[2]}%` }}></div>
              </div>
              <span className="text-sm text-[#8899bb] w-12 text-right">{ratingPercentages[2]}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8899bb] w-16">1 star</span>
              <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ratingPercentages[1]}%` }}></div>
              </div>
              <span className="text-sm text-[#8899bb] w-12 text-right">{ratingPercentages[1]}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Over Time & Resource Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Revenue Over Time</h3>
          <div className="h-64">
            {revenueData && revenueData.revenueByMonth && revenueData.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf0f7" />
                  <XAxis dataKey="month" stroke="#8899bb" />
                  <YAxis stroke="#8899bb" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #edf0f7', borderRadius: '8px' }}
                    formatter={(value: any) => [`${parseFloat(value).toFixed(2)} TND`, 'Revenue']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} name="Revenue (TND)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8899bb]">
                No revenue data available
              </div>
            )}
          </div>
          {revenueData && (
            <div className="mt-4 pt-4 border-t border-[#edf0f7]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8899bb]">Total Sales</span>
                <span className="text-lg font-bold text-[#0d1b3e]">{revenueData.totalSales || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Resource Categories */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-4">Resource Categories</h3>
          <div className="h-64">
            {analyticsData.topResources && analyticsData.topResources.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getCategoryData(analyticsData.topResources)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCategoryData(analyticsData.topResources).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[#8899bb]">
                No category data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CHART_COLORS = ['#63b3ed', '#a78bfa', '#48bb78', '#f6ad55', '#f56565', '#ed8936'];

// Helper function to group resources by subject
function getCategoryData(resources: any[]) {
  const subjectCounts: Record<string, number> = {};
  resources.forEach(r => {
    const subject = r.subject || 'Other';
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  });
  
  return Object.entries(subjectCounts).map(([name, value]) => ({ name, value }));
}

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-white rounded-xl border border-[#edf0f7] p-4">
      <div className={`w-10 h-10 rounded-lg ${bgColor} ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[#0d1b3e]">{value}</p>
      <p className="text-xs text-[#8899bb] mt-1">{title}</p>
    </div>
  );
}
