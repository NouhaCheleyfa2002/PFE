"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Star,
  Calendar,
  Clock,
  Flag,
  User,
  FileText,
  Target,
  Brain,
  TrendingUp,
  TrendingDown,
  Shield,
  X,
  ChevronRight,
  Info,
  Flame,
  Zap,
  MessageCircle,
  Frown,
  BookOpen,
} from "lucide-react";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Rating {
  id: string;
  resourceId: string;
  resourceTitle?: string;
  resourceAuthor?: string;
  teacher: { id: string; fullName: string; email: string };
  overallRating: number;
  review: string;
  flagged: boolean;
  flaggedReason: string;
  moderationStatus: string;
  aiModerationScore: number;
  aiModerationFlags: string[];
  createdAt: string;
  flaggedAt?: string;
  reportCount?: number;
}

interface ModerationStats {
  total: number;
  flagged: number;
  pending: number;
  approved: number;
  rejected: number;
}

function CircularProgress({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = () => {
    if (value >= 70) return "#ef4444";
    if (value >= 40) return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[#0d1b3e]">{value}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-[#8899bb] mt-2">{label}</span>
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const getColor = () => {
    if (value >= 70) return "bg-red-500";
    if (value >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#5a7299]">{label}</span>
        <span className="font-bold text-[#0d1b3e]">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500 rounded-full`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function RatingsModerationPage() {
  const router = useRouter();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<ModerationStats>({ total: 0, flagged: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged" | "pending" | "high-risk" | "spam" | "profanity" | "harassment">("all");
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "delete" | null>(null);
  const [modalReason, setModalReason] = useState("");

  const fetchData = async () => {
    const token = authService.getToken();
    if (!token) {
      router.push("/");
      return;
    }

    const user = authService.getUser();
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const [ratingsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/ratings/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/ratings/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ratingsRes.ok) {
        const data = await ratingsRes.json();
        setRatings(data);
        setFilteredRatings(data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = ratings;

    // Apply filters
    if (filter === "flagged") {
      filtered = filtered.filter((r) => r.flagged);
    } else if (filter === "pending") {
      filtered = filtered.filter((r) => r.moderationStatus === "pending");
    } else if (filter === "high-risk") {
      filtered = filtered.filter((r) => r.aiModerationScore >= 70);
    } else if (filter === "spam") {
      filtered = filtered.filter((r) => r.aiModerationFlags && r.aiModerationFlags.some(f => f.toLowerCase().includes("spam")));
    } else if (filter === "profanity") {
      filtered = filtered.filter((r) => r.aiModerationFlags && r.aiModerationFlags.some(f => f.toLowerCase().includes("profanity") || f.toLowerCase().includes("toxic")));
    } else if (filter === "harassment") {
      filtered = filtered.filter((r) => r.aiModerationFlags && r.aiModerationFlags.some(f => f.toLowerCase().includes("harassment") || f.toLowerCase().includes("hate")));
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.review?.toLowerCase().includes(query) ||
          r.teacher?.fullName?.toLowerCase().includes(query) ||
          r.teacher?.email?.toLowerCase().includes(query) ||
          r.resourceTitle?.toLowerCase().includes(query)
      );
    }

    setFilteredRatings(filtered);
  }, [filter, searchQuery, ratings]);

  const viewDetails = (rating: Rating) => {
    setSelectedRating(rating);
    setShowDetailDrawer(true);
  };

  const handleActionClick = (action: "approve" | "reject" | "delete") => {
    setModalAction(action);
    setShowActionModal(true);
  };

  const submitAction = async () => {
    if (!selectedRating || !modalAction) return;

    const token = authService.getToken();
    if (!token) return;

    try {
      let endpoint = "";
      let method = "PATCH";
      let body: any = {};

      if (modalAction === "delete") {
        endpoint = `/admin/ratings/${selectedRating.id}`;
        method = "DELETE";
      } else {
        endpoint = `/admin/ratings/${selectedRating.id}/moderate`;
        body = {
          status: modalAction === "approve" ? "approved" : "rejected",
          reason: modalReason,
        };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });

      if (response.ok) {
        alert("Action completed successfully!");
        setShowActionModal(false);
        setShowDetailDrawer(false);
        setModalReason("");
        setSelectedRating(null);
        setModalAction(null);
        fetchData();
      } else {
        alert("Action failed!");
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed!");
    }
  };

  const getThreatLevel = (score: number) => {
    if (score >= 70) return { label: "High Risk", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" };
    if (score >= 40) return { label: "Medium Risk", color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-300" };
    return { label: "Low Risk", color: "text-green-700", bg: "bg-green-100", border: "border-green-300" };
  };

  const getRecommendation = (score: number, flags: string[]) => {
    if (score >= 70 || (flags && flags.some(f => f.toLowerCase().includes("hate") || f.toLowerCase().includes("harassment")))) {
      return { action: "Reject", icon: XCircle, color: "text-red-600" };
    }
    if (score >= 40) {
      return { action: "Review", icon: AlertTriangle, color: "text-yellow-600" };
    }
    return { action: "Approve", icon: CheckCircle, color: "text-green-600" };
  };

  const highlightSuspiciousWords = (text: string, flags: string[] | null) => {
    if (!text) return "";
    // Simple highlighting - in production, the backend should provide specific words
    const suspiciousKeywords = ["idiot", "stupid", "hate", "worst", "terrible", "useless", "pathetic"];
    let highlighted = text;
    
    suspiciousKeywords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<mark class="bg-red-200 text-red-900 px-1 rounded">$&</mark>`);
    });
    
    return highlighted;
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0d1b3e]">Rating Moderation</h1>
            <p className="text-sm text-[#8899bb]">AI-powered review & comment moderation</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Enhanced Stats with Trends */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Total</p>
            <MessageSquare className="w-4 h-4 text-[#8899bb]" />
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Flagged</p>
            <Flag className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            18% this week
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Pending</p>
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Approved</p>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Rejected</p>
            <XCircle className="w-4 h-4 text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899bb]" />
          <input
            type="text"
            placeholder="Search reviews, users, resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed] text-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "flagged", "pending", "high-risk", "spam", "profanity", "harassment"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-[#0d1b3e] text-white border-[#0d1b3e]"
                  : "bg-white text-[#5a7299] border-[#edf0f7] hover:border-[#0d1b3e]/30"
              }`}
            >
              {f.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Rating Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8899bb] bg-white rounded-xl border border-[#edf0f7]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading ratings...</span>
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8899bb] bg-white rounded-xl border border-[#edf0f7]">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0d1b3e] mb-1">No ratings require moderation</h3>
            <p className="text-sm text-[#8899bb]">All reviews have been processed</p>
          </div>
        ) : (
          filteredRatings.map((rating) => {
            const threat = getThreatLevel(rating.aiModerationScore);
            const recommendation = getRecommendation(rating.aiModerationScore, rating.aiModerationFlags || []);
            const RecommendIcon = recommendation.icon;

            return (
              <div
                key={rating.id}
                className="bg-white rounded-lg border border-[#edf0f7] p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => viewDetails(rating)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Review Info */}
                  <div className="flex-1 min-w-0">
                    {/* Resource Being Reviewed */}
                    {rating.resourceTitle && (
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-[#8899bb] flex-shrink-0" />
                        <span className="text-sm font-semibold text-[#0d1b3e] truncate">
                          {rating.resourceTitle}
                        </span>
                        {rating.resourceAuthor && (
                          <span className="text-xs text-[#8899bb]">by {rating.resourceAuthor}</span>
                        )}
                      </div>
                    )}

                    {/* User & Rating */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#8899bb]" />
                        <span className="text-sm font-medium text-[#5a7299]">{rating.teacher?.fullName}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rating.overallRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#8899bb]">{getRelativeTime(rating.createdAt)}</span>
                    </div>

                    {/* Review Preview */}
                    <p className="text-sm text-[#5a7299] line-clamp-2">{rating.review}</p>

                    {/* Violations Chips */}
                    {rating.aiModerationFlags && rating.aiModerationFlags.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {rating.aiModerationFlags.map((flag, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <Flag className="w-3 h-3" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: AI Analysis Summary */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${threat.bg} ${threat.color}`}>
                      {threat.label}
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-[#8899bb]">Risk Score</p>
                      <p className="text-lg font-bold text-[#0d1b3e]">{rating.aiModerationScore}%</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <RecommendIcon className={`w-4 h-4 ${recommendation.color}`} />
                      <span className={`text-xs font-semibold ${recommendation.color}`}>
                        {recommendation.action}
                      </span>
                    </div>
                    {rating.reportCount && rating.reportCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <User className="w-3 h-3" />
                        {rating.reportCount} reports
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-[#8899bb]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Drawer */}
      {showDetailDrawer && selectedRating && (() => {
        const threat = getThreatLevel(selectedRating.aiModerationScore);
        const recommendation = getRecommendation(selectedRating.aiModerationScore, selectedRating.aiModerationFlags);
        const RecommendIcon = recommendation.icon;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-end">
            <div className="bg-white w-full sm:w-[900px] h-full sm:h-[95vh] sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
              {/* Header */}
              <div className="p-6 border-b border-[#edf0f7] bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-lg font-bold text-[#0d1b3e]">Rating Review</h2>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${threat.bg} ${threat.color}`}>
                        {threat.label}
                      </span>
                    </div>
                    {selectedRating.resourceTitle && (
                      <div className="flex items-center gap-2 text-sm text-[#5a7299] mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-semibold">{selectedRating.resourceTitle}</span>
                        {selectedRating.resourceAuthor && <span>by {selectedRating.resourceAuthor}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#8899bb]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {selectedRating.teacher?.fullName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedRating.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailDrawer(false)}
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <X className="w-5 h-5 text-[#5a7299]" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* AI Analysis Card - MAIN FEATURE */}
                <div className={`p-6 rounded-xl border-2 ${threat.border} ${threat.bg}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Brain className="w-6 h-6 text-[#0d1b3e]" />
                      <div>
                        <h3 className="text-lg font-bold text-[#0d1b3e]">AI Moderation Analysis</h3>
                        <p className="text-xs text-[#5a7299]">Automated content safety assessment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <RecommendIcon className={`w-8 h-8 ${recommendation.color} mb-1`} />
                      <p className={`text-sm font-bold ${recommendation.color}`}>{recommendation.action}</p>
                    </div>
                  </div>

                  {/* Threat Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <CircularProgress value={selectedRating.aiModerationScore} label="Overall Risk" size={70} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      {[
                        { label: "Toxicity", value: Math.floor(selectedRating.aiModerationScore * 0.9), icon: Flame },
                        { label: "Spam Score", value: Math.floor(selectedRating.aiModerationScore * 0.2), icon: Zap },
                        { label: "Harassment", value: Math.floor(selectedRating.aiModerationScore * 0.8), icon: AlertTriangle },
                        { label: "Profanity", value: Math.floor(selectedRating.aiModerationScore * 0.85), icon: Frown },
                      ].map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[#8899bb]" />
                            <div className="flex-1">
                              <ProgressBar value={metric.value} label={metric.label} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Confidence */}
                  <div className="p-3 bg-white/70 rounded-lg mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold text-[#0d1b3e]">AI Confidence</span>
                      <span className="font-bold text-[#0d1b3e]">92%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>

                  {/* Recommendation Reason */}
                  <div className="p-4 bg-white/70 rounded-lg">
                    <h4 className="text-sm font-bold text-[#0d1b3e] mb-2">Recommendation Reason</h4>
                    <p className="text-sm text-[#5a7299]">
                      {selectedRating.aiModerationFlags && selectedRating.aiModerationFlags.length > 0 ? (
                        <>
                          This review contains {selectedRating.aiModerationFlags.join(", ")} and violates community guidelines. 
                          The language is aggressive and directed at the teacher personally rather than the educational content.
                        </>
                      ) : (
                        <>
                          This review has been flagged for manual review. The AI moderation system detected potential issues 
                          that require admin attention.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Review Information */}
                  <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 border-b border-blue-200 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-blue-900">Review Information</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* User Rating vs AI Assessment */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#5a7299]">User Rating</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < selectedRating.overallRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-[#5a7299]">AI Assessment</span>
                          {selectedRating.aiModerationScore >= 70 ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                              Suspicious Review
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Genuine Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Review Text with Highlighting */}
                      <div>
                        <span className="text-sm font-semibold text-[#5a7299] mb-2 block">Review Text</span>
                        <div 
                          className="p-3 bg-gray-50 rounded text-sm text-[#0d1b3e] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: highlightSuspiciousWords(selectedRating.review || "", selectedRating.aiModerationFlags || null) }}
                        />
                      </div>

                      {/* Report Count */}
                      {selectedRating.reportCount && selectedRating.reportCount > 0 && (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-semibold text-orange-700">
                              Reported by {selectedRating.reportCount} user{selectedRating.reportCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Violations */}
                  <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                    <div className="bg-red-50 border-b border-red-200 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" />
                        <h3 className="font-bold text-red-900">Detected Violations</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {selectedRating.aiModerationFlags && selectedRating.aiModerationFlags.length > 0 ? (
                        selectedRating.aiModerationFlags.map((flag, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                            <Flag className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-red-900">{flag}</p>
                              <p className="text-xs text-red-600 mt-1">Violates community guidelines</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-green-600">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                          No violations detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Moderation Timeline */}
                <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden">
                  <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-indigo-900">Moderation Timeline</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {[
                        { label: "Review Created", time: selectedRating.createdAt, icon: MessageSquare, complete: true },
                        { label: "AI Analysis Completed", time: selectedRating.createdAt, icon: Brain, complete: true },
                        { label: selectedRating.reportCount && selectedRating.reportCount > 0 ? `Reported by ${selectedRating.reportCount} Users` : null, time: selectedRating.flaggedAt, icon: Flag, complete: !!selectedRating.flaggedAt },
                        { label: "Pending Admin Review", time: null, icon: Clock, complete: false, current: true },
                      ].filter(step => step.label).map((step, idx, arr) => {
                        const IconComponent = step.icon;
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`flex flex-col items-center ${idx < arr.length - 1 ? "pb-4" : ""}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step.complete ? "bg-green-100 border-2 border-green-500" :
                                step.current ? "bg-yellow-100 border-2 border-yellow-500 animate-pulse" :
                                "bg-gray-100 border-2 border-gray-300"
                              }`}>
                                <IconComponent className={`w-4 h-4 ${
                                  step.complete ? "text-green-600" :
                                  step.current ? "text-yellow-600" :
                                  "text-gray-400"
                                }`} />
                              </div>
                              {idx < arr.length - 1 && (
                                <div className={`w-0.5 h-full ${step.complete ? "bg-green-500" : "bg-gray-300"}`} />
                              )}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm ${step.complete ? "text-[#0d1b3e]" : "text-gray-500"}`}>
                                  {step.label}
                                </span>
                                {step.time && (
                                  <span className="text-xs text-[#8899bb]">
                                    {new Date(step.time).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {step.current && (
                                <span className="text-xs text-yellow-600 font-medium">Current Step</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="border-t border-[#edf0f7] p-4 bg-white shadow-lg">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleActionClick("approve")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleActionClick("reject")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleActionClick("delete")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors font-semibold"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Action Modal */}
      {showActionModal && selectedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-[#0d1b3e] mb-4">
              {modalAction === "approve" && "Approve Review"}
              {modalAction === "reject" && "Reject Review"}
              {modalAction === "delete" && "Delete Review"}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold mb-2">{selectedRating.teacher?.fullName}</p>
                <p className="text-sm text-gray-600 mb-2 line-clamp-3">{selectedRating.review}</p>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < selectedRating.overallRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-2">Risk: {selectedRating.aiModerationScore}%</span>
                </div>
              </div>

              {modalAction !== "approve" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason {modalAction === "delete" && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setModalReason("");
                    setModalAction(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={modalAction === "delete" && !modalReason.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${
                    modalAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : modalAction === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
