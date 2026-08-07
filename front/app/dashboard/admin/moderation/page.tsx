"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Eye,
  X,
  ChevronRight,
  Target,
  Brain,
  Flag,
  Lock,
  GraduationCap,
  ExternalLink,
  TrendingUp,
  Clock,
  FileCheck,
  Download,
  Maximize2,
  Info,
  ArrowDown,
  FileType,
  Upload,
} from "lucide-react";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PendingDocument {
  id: string;
  document: {
    id: string;
    title: string;
    originalName: string;
    uploadedBy: string;
    uploadedAt: string;
    storageUrl?: string;
  };
  aiScores: {
    safety: number;
    quality: number;
    overall: number;
  };
  riskLevel: string;
  detectedMetadata: {
    subject?: string;
    category?: string;
    gradeLevel?: string;
    language?: string;
    bacSection?: string;
    difficultyLevel?: string;
    difficultyScore?: number;
    difficultyReasoning?: string;
  };
  originalMetadata?: {
    filename: string;
    uploadedTitle: string;
  };
  flags: {
    inappropriateContent: boolean;
    pii: boolean;
    malware: boolean;
    duplicate: boolean;
  };
  advancedAI?: {
    piiDetection: {
      found: boolean;
      score: number;
      details: string[];
    };
    learningObjectives: string[];
    bloomLevel?: string;
  };
  issues: Array<{ severity: string; description: string; category: string }>;
  aiRecommendation: {
    action: string;
    confidence: number;
    reasoning: string;
  };
  processingCompleted: boolean;
  ocrText?: string | null;
  timeline?: {
    uploaded: string;
    processingStarted?: string | null;
    ocrCompleted?: string | null;
    metadataExtracted?: string | null;
    aiAnalysisCompleted?: string | null;
    processingCompleted?: string | null;
  };
  adminAction?: {
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    status: string;
    rejectionReason?: string | null;
    adminNotes?: string | null;
    changesRequested?: string | null;
  };
}

function CircularProgress({ value, label, size = 80 }: { value: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = () => {
    if (value >= 90) return "#10b981";
    if (value >= 70) return "#f59e0b";
    return "#ef4444";
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
    if (value >= 90) return "bg-green-500";
    if (value >= 70) return "bg-yellow-500";
    return "bg-red-500";
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

export default function DocumentModerationPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<PendingDocument | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "request-changes" | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [filter, setFilter] = useState<"all" | "high-risk" | "critical" | "flagged">("all");
  const [showOcrText, setShowOcrText] = useState(false);

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
      const response = await fetch(`${API_URL}/moderation/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setFilteredDocs(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = documents;

    if (filter === "high-risk") {
      filtered = documents.filter(d => d.riskLevel === "high" || d.riskLevel === "critical");
    } else if (filter === "critical") {
      filtered = documents.filter(d => d.riskLevel === "critical");
    } else if (filter === "flagged") {
      filtered = documents.filter(d => Object.values(d.flags).some(f => f));
    }

    setFilteredDocs(filtered);
  }, [filter, documents]);

  const viewDetails = (doc: PendingDocument) => {
    setSelectedDoc(doc);
    setShowDetailDrawer(true);
  };

  const handleActionClick = (action: "approve" | "reject" | "request-changes") => {
    setModalAction(action);
    setShowActionModal(true);
  };

  const submitAction = async () => {
    if (!selectedDoc || !modalAction) return;

    const token = authService.getToken();
    if (!token) return;

    try {
      let endpoint = "";
      let body: any = {};

      if (modalAction === "approve") {
        endpoint = `/moderation/${selectedDoc.id}/approve`;
        body = { notes: modalNotes };
      } else if (modalAction === "reject") {
        endpoint = `/moderation/${selectedDoc.id}/reject`;
        body = { reason: modalReason, notes: modalNotes };
      } else if (modalAction === "request-changes") {
        endpoint = `/moderation/${selectedDoc.id}/request-changes`;
        body = { changes: modalReason, notes: modalNotes };
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert("Action completed successfully!");
        setShowActionModal(false);
        setShowDetailDrawer(false);
        setModalReason("");
        setModalNotes("");
        setSelectedDoc(null);
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

  const getRiskBadge = (level: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      low: { bg: "bg-green-100", text: "text-green-700", label: "Low" },
      medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medium" },
      high: { bg: "bg-red-100", text: "text-red-700", label: "High" },
      critical: { bg: "bg-red-200", text: "text-red-800", label: "Critical" },
    };
    const config = configs[level] || configs.medium;
    return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  const getRecommendationIcon = (action: string) => {
    if (action === "approve") return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (action === "reject") return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  const getFileTypeIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: FileText, label: 'PDF', color: 'bg-red-100 text-red-700' };
    if (ext === 'docx' || ext === 'doc') return { icon: FileText, label: 'DOCX', color: 'bg-blue-100 text-blue-700' };
    if (ext === 'pptx' || ext === 'ppt') return { icon: FileText, label: 'PPTX', color: 'bg-orange-100 text-orange-700' };
    if (ext === 'xlsx' || ext === 'xls') return { icon: FileText, label: 'XLSX', color: 'bg-green-100 text-green-700' };
    return { icon: FileText, label: ext?.toUpperCase() || 'FILE', color: 'bg-gray-100 text-gray-700' };
  };

  const getReasoningPoints = (recommendation: PendingDocument['aiRecommendation']) => {
    // Extract bullet points from reasoning
    const points: Array<{ type: 'success' | 'warning' | 'error'; text: string }> = [];
    
    if (recommendation.confidence > 0.9) {
      points.push({ type: 'success', text: 'High AI confidence' });
    }
    
    if (selectedDoc) {
      if (selectedDoc.aiScores.safety >= 90) {
        points.push({ type: 'success', text: 'Safe content' });
      }
      if (selectedDoc.aiScores.quality >= 90) {
        points.push({ type: 'success', text: 'High quality' });
      }
      if (selectedDoc.flags.duplicate) {
        points.push({ type: 'warning', text: 'Duplicate detected' });
      }
      if (selectedDoc.flags.pii) {
        points.push({ type: 'warning', text: 'PII found' });
      }
      if (selectedDoc.flags.inappropriateContent) {
        points.push({ type: 'error', text: 'Inappropriate content' });
      }
      if (selectedDoc.flags.malware) {
        points.push({ type: 'error', text: 'Malware detected' });
      }
      if (!selectedDoc.detectedMetadata.subject) {
        points.push({ type: 'warning', text: 'Missing metadata' });
      }
    }
    
    return points;
  };

  const sortedIssues = selectedDoc ? [...selectedDoc.issues].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity as keyof typeof severityOrder] || 3) - 
           (severityOrder[b.severity as keyof typeof severityOrder] || 3);
  }) : [];

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const uploaded = new Date(date);
    const diffMs = now.getTime() - uploaded.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0d1b3e]">Document Moderation</h1>
            <p className="text-sm text-[#8899bb]">AI-powered document review & approval</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#8899bb]" />
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Pending</p>
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{documents.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-xs font-semibold text-[#8899bb] uppercase">High Risk</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {documents.filter((d) => d.riskLevel === "high" || d.riskLevel === "critical").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flag className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Flagged</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {documents.filter((d) => Object.values(d.flags).some((f) => f)).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {documents.length > 0 ? Math.round(documents.reduce((acc, d) => acc + d.aiScores.overall, 0) / documents.length) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-[#8899bb] uppercase">Processing</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {documents.filter((d) => !d.processingCompleted).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "high-risk", "critical", "flagged"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === f
                ? "bg-[#0d1b3e] text-white border-[#0d1b3e]"
                : "bg-white text-[#5a7299] border-[#edf0f7] hover:border-[#0d1b3e]/30"
            }`}
          >
            {f === "all" ? "All" : f.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
          </button>
        ))}
      </div>

      {/* Compact Document Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8899bb] bg-white rounded-xl border border-[#edf0f7]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading documents...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8899bb] bg-white rounded-xl border border-[#edf0f7]">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-[#0d1b3e] mb-1">No documents require moderation</h3>
            <p className="text-sm text-[#8899bb]">All pending submissions have been reviewed</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg border border-[#edf0f7] p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => viewDetails(doc)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#0d1b3e] truncate">{doc.document.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#8899bb] mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc.document.uploadedBy}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.document.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8899bb]">Risk:</span>
                      {getRiskBadge(doc.riskLevel)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8899bb]">Score:</span>
                      <span className="text-sm font-bold text-[#0d1b3e]">{doc.aiScores.overall}%</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs">
                      {getRecommendationIcon(doc.aiRecommendation.action)}
                      <span className="font-semibold text-[#0d1b3e]">{doc.aiRecommendation.action.toUpperCase().replace("_", " ")}</span>
                    </div>
                    <span className="text-xs text-[#8899bb]">{Math.round(doc.aiRecommendation.confidence * 100)}% confidence</span>
                  </div>

                  {doc.issues.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span className="text-xs font-semibold text-red-600">{doc.issues.length}</span>
                    </div>
                  )}

                  <ChevronRight className="w-5 h-5 text-[#8899bb]" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Drawer */}
      {showDetailDrawer && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-end">
          <div className="bg-white w-full sm:w-[900px] h-full sm:h-[95vh] sm:rounded-l-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Drawer Header - Enhanced */}
            <div className="p-6 border-b border-[#edf0f7] bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-bold text-[#0d1b3e]">{selectedDoc.document.title}</h2>
                    {(() => {
                      const fileType = getFileTypeIcon(selectedDoc.document.originalName);
                      const FileIcon = fileType.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${fileType.color}`}>
                          <FileIcon className="w-3 h-3" />
                          {fileType.label}
                        </span>
                      );
                    })()}
                    {getRiskBadge(selectedDoc.riskLevel)}
                  </div>
                  <p className="text-xs text-[#8899bb] mb-1">{selectedDoc.document.originalName}</p>
                  <div className="flex items-center gap-3 text-xs text-[#5a7299]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {selectedDoc.document.uploadedBy}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getRelativeTime(selectedDoc.document.uploadedAt)}
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

              {/* Document Actions */}
              <div className="flex gap-2">
                {selectedDoc.document.storageUrl && (
                  <>
                    <button
                      onClick={() => window.open(selectedDoc.document.storageUrl, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#edf0f7] text-[#0d1b3e] hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedDoc.document.storageUrl!;
                        link.download = selectedDoc.document.originalName;
                        link.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#edf0f7] text-[#0d1b3e] hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => window.open(selectedDoc.document.storageUrl, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#edf0f7] text-[#0d1b3e] hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Maximize2 className="w-4 h-4" />
                      Fullscreen
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Recommendation - MAIN FEATURE with Why */}
              <div className={`p-6 rounded-xl border-2 ${
                selectedDoc.aiRecommendation.action === "approve" ? "bg-green-50 border-green-300" :
                selectedDoc.aiRecommendation.action === "reject" ? "bg-red-50 border-red-300" :
                "bg-yellow-50 border-yellow-300"
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-[#0d1b3e]" />
                    <div>
                      <h3 className="text-lg font-bold text-[#0d1b3e]">AI Recommendation</h3>
                      <p className="text-xs text-[#5a7299]">AI assists, you decide</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#0d1b3e]">
                      {selectedDoc.aiRecommendation.action.toUpperCase().replace("_", " ")}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-sm text-[#5a7299] mt-1">
                      <span>Confidence:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0d1b3e] rounded-full"
                            style={{ width: `${selectedDoc.aiRecommendation.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-bold">{Math.round(selectedDoc.aiRecommendation.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why Section */}
                <div className="mb-3">
                  <h4 className="text-sm font-bold text-[#0d1b3e] mb-2">Why?</h4>
                  <div className="space-y-1">
                    {getReasoningPoints(selectedDoc.aiRecommendation).map((point, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {point.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {point.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        {point.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                        <span className="text-[#0d1b3e]">{point.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white/70 rounded-lg">
                  <p className="text-sm text-[#0d1b3e]">{selectedDoc.aiRecommendation.reasoning}</p>
                </div>

                {/* Status Badge */}
                <div className="mt-3 pt-3 border-t border-white/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5a7299]">Status:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                      <Clock className="w-3 h-3" />
                      Pending Human Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout with Colored Headers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Security Analysis - Red Theme */}
                <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 border-b border-red-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-red-900">Security Analysis</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      { label: "Malware", value: selectedDoc.flags.malware, critical: true },
                      { label: "Inappropriate Content", value: selectedDoc.flags.inappropriateContent, critical: true },
                      { label: "PII Detected", value: selectedDoc.flags.pii, critical: false },
                      { label: "Duplicate", value: selectedDoc.flags.duplicate, critical: false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-[#5a7299]">{item.label}</span>
                        {item.value ? (
                          <span className={`flex items-center gap-1 text-xs font-semibold ${item.critical ? "text-red-600" : "text-orange-600"}`}>
                            <XCircle className="w-4 h-4" />
                            Found
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Clear
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Educational Analysis - Blue Theme */}
                <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-blue-900">Educational Quality Summary</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    {[
                      { label: "Subject", value: selectedDoc.detectedMetadata.subject, confidence: 98 },
                      { label: "Grade Level", value: selectedDoc.detectedMetadata.gradeLevel, confidence: 95 },
                      { label: "BAC Section", value: selectedDoc.detectedMetadata.bacSection, confidence: 92 },
                      { label: "Difficulty", value: selectedDoc.detectedMetadata.difficultyLevel, confidence: 88 },
                      { label: "Language", value: selectedDoc.detectedMetadata.language, confidence: 99 },
                      { label: "Bloom Level", value: selectedDoc.advancedAI?.bloomLevel, confidence: 85 },
                      { label: "Objectives", value: `${selectedDoc.advancedAI?.learningObjectives?.length || 0} detected`, confidence: 90 },
                    ].filter(item => item.value).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-[#8899bb]">{item.label}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0d1b3e]">{item.value}</span>
                          <span className="text-xs text-green-600">{item.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Scores with Circular Progress - Purple Theme */}
              <div className="bg-white border border-purple-200 rounded-xl overflow-hidden">
                <div className="bg-purple-50 border-b border-purple-200 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-purple-900">AI Quality Scores</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-around py-4">
                    <div className="relative group">
                      <CircularProgress value={selectedDoc.aiScores.safety} label="Safety" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        No malware, harmful content, or personal data detected
                      </div>
                    </div>
                    <div className="relative group">
                      <CircularProgress value={selectedDoc.aiScores.quality} label="Quality" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        OCR accuracy, formatting, and completeness
                      </div>
                    </div>
                    <div className="relative group">
                      <CircularProgress value={selectedDoc.aiScores.overall} label="Overall" size={90} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        Combined safety (50%) and quality (50%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bars Alternative */}
              <div className="bg-white border border-[#edf0f7] rounded-xl p-5">
                <h3 className="font-bold text-[#0d1b3e] mb-4">Detailed Scores</h3>
                <div className="space-y-3">
                  <ProgressBar value={selectedDoc.aiScores.safety} label="Safety Score" />
                  <ProgressBar value={selectedDoc.aiScores.quality} label="Quality Score" />
                  <ProgressBar value={selectedDoc.aiScores.overall} label="Overall Score" />
                  {selectedDoc.detectedMetadata.difficultyScore && (
                    <ProgressBar value={selectedDoc.detectedMetadata.difficultyScore} label="Difficulty Classification" />
                  )}
                </div>
              </div>

              {/* Processing Timeline */}
              {selectedDoc.timeline && (
                <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden">
                  <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-bold text-indigo-900">Processing Timeline</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {[
                        { label: "Uploaded", time: selectedDoc.timeline.uploaded, icon: Upload, complete: true },
                        { label: "Processing Started", time: selectedDoc.timeline.processingStarted, icon: RefreshCw, complete: !!selectedDoc.timeline.processingStarted },
                        { label: "OCR Completed", time: selectedDoc.timeline.ocrCompleted, icon: Eye, complete: !!selectedDoc.timeline.ocrCompleted },
                        { label: "Metadata Extracted", time: selectedDoc.timeline.metadataExtracted, icon: Brain, complete: !!selectedDoc.timeline.metadataExtracted },
                        { label: "AI Analysis", time: selectedDoc.timeline.aiAnalysisCompleted, icon: Target, complete: !!selectedDoc.timeline.aiAnalysisCompleted },
                        { label: "Waiting Admin Review", time: selectedDoc.timeline.processingCompleted, icon: Clock, complete: !!selectedDoc.timeline.processingCompleted, current: !selectedDoc.adminAction?.reviewedAt },
                      ].map((step, idx, arr) => {
                        const IconComponent = step.icon;
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className={`flex flex-col items-center ${idx < arr.length - 1 ? "pb-4" : ""}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
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
              )}

              {/* Original vs Extracted Metadata */}
              {selectedDoc.originalMetadata && (
                <div className="bg-white border border-teal-200 rounded-xl overflow-hidden">
                  <div className="bg-teal-50 border-b border-teal-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileType className="w-5 h-5 text-teal-600" />
                      <h3 className="font-bold text-teal-900">Original vs AI-Extracted Metadata</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-[#8899bb] uppercase mb-2">Original</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-[#8899bb]">Filename:</span>
                            <p className="font-mono text-xs text-[#0d1b3e] break-all">{selectedDoc.originalMetadata.filename}</p>
                          </div>
                          <div>
                            <span className="text-[#8899bb]">Title:</span>
                            <p className="font-semibold text-[#0d1b3e]">{selectedDoc.originalMetadata.uploadedTitle}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-teal-600 uppercase mb-2">AI-Extracted</h4>
                        <div className="space-y-2 text-sm">
                          {selectedDoc.detectedMetadata.subject && (
                            <div>
                              <span className="text-[#8899bb]">Subject:</span>
                              <p className="font-semibold text-teal-700">{selectedDoc.detectedMetadata.subject}</p>
                            </div>
                          )}
                          {selectedDoc.detectedMetadata.gradeLevel && (
                            <div>
                              <span className="text-[#8899bb]">Grade:</span>
                              <p className="font-semibold text-teal-700">{selectedDoc.detectedMetadata.gradeLevel}</p>
                            </div>
                          )}
                          {selectedDoc.detectedMetadata.bacSection && (
                            <div>
                              <span className="text-[#8899bb]">BAC:</span>
                              <p className="font-semibold text-teal-700">{selectedDoc.detectedMetadata.bacSection}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-teal-50 rounded text-xs text-teal-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span><strong>Intelligence:</strong> AI successfully extracted educational metadata from document content</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Extracted OCR Text */}
              {selectedDoc.ocrText && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Extracted Text (OCR)</h3>
                      </div>
                      <button
                        onClick={() => setShowOcrText(!showOcrText)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {showOcrText ? "Hide" : "Show Preview"}
                      </button>
                    </div>
                  </div>
                  {showOcrText && (
                    <div className="p-5">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 font-mono text-xs text-gray-700 max-h-64 overflow-y-auto whitespace-pre-wrap">
                        {selectedDoc.ocrText}
                      </div>
                      <p className="text-xs text-[#8899bb] mt-2">
                        Showing preview (first 2000 characters). Full text analyzed by AI.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Decision History */}
              {selectedDoc.adminAction && (selectedDoc.adminAction.reviewedAt || selectedDoc.adminAction.status !== 'pending') && (
                <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
                  <div className="bg-orange-50 border-b border-orange-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-600" />
                      <h3 className="font-bold text-orange-900">Admin Decision History</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-[#0d1b3e]">AI Recommendation</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            selectedDoc.aiRecommendation.action === "approve" ? "bg-green-100 text-green-700" :
                            selectedDoc.aiRecommendation.action === "reject" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {selectedDoc.aiRecommendation.action.toUpperCase().replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-[#5a7299]">{selectedDoc.aiRecommendation.reasoning}</p>
                      </div>
                    </div>

                    {selectedDoc.adminAction.reviewedAt && (
                      <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-[#0d1b3e]">Admin Decision</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              selectedDoc.adminAction.status === "approved" ? "bg-green-100 text-green-700" :
                              selectedDoc.adminAction.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {selectedDoc.adminAction.status.toUpperCase().replace("_", " ")}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-[#5a7299]">
                              <strong>By:</strong> {selectedDoc.adminAction.reviewedBy || "Unknown"}
                            </p>
                            <p className="text-[#5a7299]">
                              <strong>When:</strong> {new Date(selectedDoc.adminAction.reviewedAt).toLocaleString()}
                            </p>
                            {selectedDoc.adminAction.rejectionReason && (
                              <p className="text-[#5a7299]">
                                <strong>Reason:</strong> {selectedDoc.adminAction.rejectionReason}
                              </p>
                            )}
                            {selectedDoc.adminAction.adminNotes && (
                              <p className="text-[#5a7299]">
                                <strong>Notes:</strong> {selectedDoc.adminAction.adminNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.adminAction.status !== selectedDoc.aiRecommendation.action && selectedDoc.adminAction.reviewedAt && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-purple-600 mt-0.5" />
                        <p className="text-xs text-purple-700">
                          <strong>Note:</strong> Admin decision differs from AI recommendation. Human judgment prevails.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Learning Objectives - Green Theme */}
              {selectedDoc.advancedAI?.learningObjectives && selectedDoc.advancedAI.learningObjectives.length > 0 && (
                <div className="bg-white border border-green-200 rounded-xl overflow-hidden">
                  <div className="bg-green-50 border-b border-green-200 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-green-900">Learning Objectives</h3>
                    </div>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2">
                      {selectedDoc.advancedAI.learningObjectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-[#5a7299]">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Issues Timeline - SORTED by severity */}
              {sortedIssues.length > 0 && (
                <div className="bg-white border border-[#edf0f7] rounded-xl p-5">
                  <h3 className="font-bold text-[#0d1b3e] mb-4">Detected Issues (Critical First)</h3>
                  <div className="space-y-3">
                    {sortedIssues.map((issue, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded border-l-4 ${
                        issue.severity === "critical" ? "bg-red-100 border-red-600" :
                        issue.severity === "high" ? "bg-red-50 border-red-500" :
                        issue.severity === "medium" ? "bg-orange-50 border-orange-500" :
                        "bg-yellow-50 border-yellow-500"
                      }`}>
                        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          issue.severity === "critical" ? "text-red-700" :
                          issue.severity === "high" ? "text-red-600" :
                          issue.severity === "medium" ? "text-orange-500" :
                          "text-yellow-500"
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase ${
                              issue.severity === "critical" ? "text-red-700" :
                              issue.severity === "high" ? "text-red-600" :
                              issue.severity === "medium" ? "text-orange-600" :
                              "text-yellow-600"
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-600">{issue.category}</span>
                          </div>
                          <p className="text-sm text-[#0d1b3e]">{issue.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Info */}
              <div className="bg-gray-50 border border-[#edf0f7] rounded-xl p-5">
                <h3 className="font-bold text-[#0d1b3e] mb-3">Document Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#8899bb]">Uploaded By:</span>
                    <p className="font-semibold text-[#0d1b3e]">{selectedDoc.document.uploadedBy}</p>
                  </div>
                  <div>
                    <span className="text-[#8899bb]">Upload Date:</span>
                    <p className="font-semibold text-[#0d1b3e]">
                      {new Date(selectedDoc.document.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#8899bb]">Risk Level:</span>
                    <div className="mt-1">{getRiskBadge(selectedDoc.riskLevel)}</div>
                  </div>
                  <div>
                    <span className="text-[#8899bb]">Processing:</span>
                    <p className="font-semibold text-[#0d1b3e]">
                      {selectedDoc.processingCompleted ? "✓ Complete" : "⏳ In Progress"}
                    </p>
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
                  onClick={() => handleActionClick("request-changes")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition-colors font-semibold"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Request Changes
                </button>
                <button
                  onClick={() => handleActionClick("reject")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-[#0d1b3e] mb-4">
              {modalAction === "approve" && "Approve Document"}
              {modalAction === "reject" && "Reject Document"}
              {modalAction === "request-changes" && "Request Changes"}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold mb-2">{selectedDoc.document.title}</p>
                <p className="text-xs text-gray-600">Overall Score: {selectedDoc.aiScores.overall}%</p>
              </div>

              {modalAction !== "approve" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {modalAction === "reject" ? "Rejection Reason" : "Changes Needed"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Enter notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setModalReason("");
                    setModalNotes("");
                    setModalAction(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={modalAction !== "approve" && !modalReason.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium ${
                    modalAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : modalAction === "request-changes"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-red-600 hover:bg-red-700"
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
