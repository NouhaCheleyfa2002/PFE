"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Building2,
  GraduationCap,
  FileText,
  Video,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Zap,
  AlertTriangle,
  Ban,
  Shield,
  Brain,
  Users,
  TrendingUp,
} from "lucide-react";
import { authService } from "@/lib/auth";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface VerificationRequest {
  id: string;
  userId: string;
  fullName: string;
  institution: string;
  teachingLevel: string;
  subjects: string[];
  documentUrls: string[];
  verificationVideoUrl: string | null;
  verificationCode: string | null;
  status: "pending" | "approved" | "rejected" | "more_info_needed";
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  // AI Verification Fields
  aiExtractedData?: {
    fullName?: string;
    professionalId?: string;
    institution?: string;
    role?: string;
    teachingLevel?: string;
    subjects?: string[];
    idNumber?: string;
    confidence: number;
  } | null;
  aiVerificationScore?: number | null;
  aiStatus?: string;
  aiRiskLevel?: string;
  aiFlags?: string[];
  duplicateCheckResult?: {
    isDuplicate: boolean;
    matchedAccounts: Array<{
      userId: string;
      fullName: string;
      professionalId: string;
      institution: string;
      matchScore: number;
      matchReasons: string[];
    }>;
    riskLevel: string;
  } | null;
  professionalId?: string | null;
  aiProcessedAt?: string | null;
  user?: {
    email: string;
    createdAt: string;
  };
}

function StatusBadge({ status }: { status: VerificationRequest["status"] }) {
  const configs = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, label: "Pending Review" },
    approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Approved" },
    rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Rejected" },
    more_info_needed: { bg: "bg-blue-100", text: "text-blue-700", icon: AlertCircle, label: "More Info Needed" },
  };
  const config = configs[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function TeachingLevelBadge({ level }: { level: string }) {
  const labels: Record<string, string> = {
    primary: "Primary",
    secondary: "Secondary",
    university: "University",
    private_tutor: "Private Tutor",
  };
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      <GraduationCap className="w-3 h-3" />
      {labels[level] || level}
    </span>
  );
}

function AIStatusBadge({ status }: { status?: string }) {
  if (!status || status === 'pending') return null;
  
  const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    processing: { bg: "bg-blue-100", text: "text-blue-700", icon: RefreshCw, label: "AI Processing" },
    verified_match: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "AI Verified" },
    possible_duplicate: { bg: "bg-orange-100", text: "text-orange-700", icon: Users, label: "Possible Duplicate" },
    suspicious_document: { bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle, label: "Suspicious" },
    needs_review: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, label: "AI Needs Review" },
    processed: { bg: "bg-gray-100", text: "text-gray-700", icon: Brain, label: "AI Processed" },
    error: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "AI Error" },
  };
  
  const config = configs[status] || configs.processed;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RiskLevelBadge({ level }: { level?: string }) {
  if (!level || level === 'unknown') return null;
  
  const configs: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    low: { bg: "bg-emerald-100", text: "text-emerald-700", icon: Shield, label: "Low Risk" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, label: "Medium Risk" },
    high: { bg: "bg-orange-100", text: "text-orange-700", icon: AlertTriangle, label: "High Risk" },
    critical: { bg: "bg-red-100", text: "text-red-700", icon: Ban, label: "Critical Risk" },
  };
  
  const config = configs[level] || configs.medium;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | VerificationRequest["status"]>("pending");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Review form state
  const [reviewChecks, setReviewChecks] = useState({
    faceMatchesId: false,
    codeSpokenCorrectly: false,
    idValid: false,
    institutionVerified: false,
    documentsAuthentic: false,
    noDuplicateAccount: false,
  });
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | "more_info" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
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
      const response = await fetch(`${API_URL}/verification/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch verification requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter((r) => r.status === statusFilter));
    }
  }, [statusFilter, requests]);

  const openReviewModal = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
    setReviewChecks({
      faceMatchesId: false,
      codeSpokenCorrectly: false,
      idValid: false,
      institutionVerified: false,
      documentsAuthentic: false,
      noDuplicateAccount: false,
    });
    setReviewDecision(null);
    setReviewNotes("");
    setRejectionReason("");
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewDecision) return;

    const token = authService.getToken();
    if (!token) return;

    setSubmitting(true);
    try {
      const payload: any = {
        status: reviewDecision === "approve" ? "approved" : reviewDecision === "reject" ? "rejected" : "more_info_needed",
        reviewNotes: reviewNotes || undefined,
      };

      if (reviewDecision === "reject" && rejectionReason) {
        payload.rejectionReason = rejectionReason;
      }

      const response = await fetch(`${API_URL}/verification/requests/${selectedRequest.id}/review`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const action = reviewDecision === "approve" ? "approved" : "rejected";
        toast.success(`📧 Verification ${action}! Email sent to teacher`, {
          duration: 5000,
          icon: reviewDecision === "approve" ? "✅" : "⚠️",
        });
        setShowReviewModal(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const error = await response.json();
        alert(`Failed to submit review: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    moreInfo: requests.filter((r) => r.status === "more_info_needed").length,
  };

  const allChecked = Object.values(reviewChecks).every(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0d1b3e]">Verification Requests</h1>
            <p className="text-sm text-[#8899bb]">Review educator verification applications</p>
          </div>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Total</p>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-lg border border-[#edf0f7] p-4">
          <p className="text-xs font-semibold text-[#8899bb] uppercase mb-1">More Info</p>
          <p className="text-2xl font-bold text-blue-600">{stats.moreInfo}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected", "more_info_needed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === status
                ? "bg-[#0d1b3e] text-white border-[#0d1b3e]"
                : "bg-white text-[#5a7299] border-[#edf0f7] hover:border-[#0d1b3e]/30"
            }`}
          >
            {status === "all" ? "All" : status === "more_info_needed" ? "More Info" : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8899bb]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8899bb] bg-white rounded-xl border border-[#edf0f7]">
            <ShieldCheck className="w-12 h-12 opacity-40 mb-2" />
            <span className="text-sm">No verification requests found</span>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const fullName = request.fullName || request.user?.fullName || "Unknown User";
            const initials = fullName 
              ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() 
              : "??";
            
            return (
            <div key={request.id} className="bg-white rounded-xl border border-[#edf0f7] p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white text-xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0d1b3e] mb-1">{fullName}</h3>
                    <p className="text-sm text-[#8899bb] mb-2">{request.user?.email || "No email"}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={request.status} />
                      <TeachingLevelBadge level={request.teachingLevel} />
                      <AIStatusBadge status={request.aiStatus} />
                      <RiskLevelBadge level={request.aiRiskLevel} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8899bb] mb-2">
                    Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                  </p>
                  {request.status === "pending" && (
                    <button
                      onClick={() => openReviewModal(request)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#edf0f7]">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-[#8899bb]" />
                  <span className="text-[#0d1b3e] font-medium">{request.institution}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-[#8899bb] mt-0.5" />
                  <span className="text-[#0d1b3e]">{request.subjects.join(", ")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#8899bb]" />
                  <span className="text-[#0d1b3e]">{request.documentUrls.length} documents uploaded</span>
                </div>
                {request.verificationVideoUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-[#8899bb]" />
                    <span className="text-[#0d1b3e]">Video verification included</span>
                  </div>
                )}
              </div>

              {request.rejectionReason && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{request.rejectionReason}</p>
                </div>
              )}

              {/* AI Quick Summary for High Risk */}
              {request.aiProcessedAt && (request.aiRiskLevel === 'high' || request.aiRiskLevel === 'critical' || request.duplicateCheckResult?.isDuplicate) && (
                <div className="mt-4 p-3 rounded-lg bg-orange-50 border-2 border-orange-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-900 mb-1">AI Alert - Requires Attention</p>
                      {request.duplicateCheckResult?.isDuplicate && (
                        <p className="text-sm text-orange-700 mb-1">
                          • Possible duplicate: {request.duplicateCheckResult.matchedAccounts.length} similar account(s) found
                        </p>
                      )}
                      {request.aiFlags && request.aiFlags.length > 0 && (
                        <p className="text-sm text-orange-700">
                          • {request.aiFlags.length} issue(s) detected by AI
                        </p>
                      )}
                      {request.aiVerificationScore !== null && request.aiVerificationScore !== undefined && Number(request.aiVerificationScore) < 60 && (
                        <p className="text-sm text-orange-700">
                          • Low confidence score: {Number(request.aiVerificationScore).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 text-[#8899bb] hover:text-[#0d1b3e]"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-[#0d1b3e] mb-6">Review Verification Request</h2>

            {/* Applicant Info */}
            <div className="mb-6 p-4 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
              <h3 className="font-semibold text-[#0d1b3e] mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Applicant Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8899bb]">Name:</p>
                  <p className="font-medium text-[#0d1b3e]">{selectedRequest.fullName || selectedRequest.user?.fullName || "Name not provided"}</p>
                </div>
                <div>
                  <p className="text-[#8899bb]">Email:</p>
                  <p className="font-medium text-[#0d1b3e]">{selectedRequest.user?.email || "Email not available"}</p>
                </div>
                <div>
                  <p className="text-[#8899bb]">Institution:</p>
                  <p className="font-medium text-[#0d1b3e]">{selectedRequest.institution}</p>
                </div>
                <div>
                  <p className="text-[#8899bb]">Teaching Level:</p>
                  <p className="font-medium text-[#0d1b3e] capitalize">{selectedRequest.teachingLevel.replace('_', ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#8899bb]">Subjects:</p>
                  <p className="font-medium text-[#0d1b3e]">{selectedRequest.subjects.join(", ")}</p>
                </div>
              </div>
            </div>

            {/* AI Verification Results */}
            {selectedRequest.aiProcessedAt && (
              <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Verification Analysis
                  </h3>
                  <div className="flex items-center gap-2">
                    <AIStatusBadge status={selectedRequest.aiStatus} />
                    <RiskLevelBadge level={selectedRequest.aiRiskLevel} />
                  </div>
                </div>

                {/* AI Score */}
                {selectedRequest.aiVerificationScore !== null && selectedRequest.aiVerificationScore !== undefined && (
                  <div className="mb-4 p-3 rounded-lg bg-white border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-900">AI Confidence Score</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              Number(selectedRequest.aiVerificationScore) >= 80 ? 'bg-green-500' : 
                              Number(selectedRequest.aiVerificationScore) >= 60 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${Number(selectedRequest.aiVerificationScore)}%` }}
                          />
                        </div>
                        <span className="text-lg font-bold text-purple-900">
                          {Number(selectedRequest.aiVerificationScore).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted Data */}
                {selectedRequest.aiExtractedData && (
                  <div className="mb-4 p-4 rounded-lg bg-white border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      AI Extracted Information from Documents
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedRequest.aiExtractedData.fullName && (
                        <div>
                          <p className="text-purple-700 font-medium">Name:</p>
                          <p className="text-gray-700">{selectedRequest.aiExtractedData.fullName}</p>
                        </div>
                      )}
                      {selectedRequest.aiExtractedData.professionalId && (
                        <div>
                          <p className="text-purple-700 font-medium">Professional ID:</p>
                          <p className="text-gray-700 font-mono text-xs">{selectedRequest.aiExtractedData.professionalId}</p>
                        </div>
                      )}
                      {selectedRequest.aiExtractedData.institution && (
                        <div>
                          <p className="text-purple-700 font-medium">Institution:</p>
                          <p className="text-gray-700">{selectedRequest.aiExtractedData.institution}</p>
                        </div>
                      )}
                      {selectedRequest.aiExtractedData.role && (
                        <div>
                          <p className="text-purple-700 font-medium">Role:</p>
                          <p className="text-gray-700">{selectedRequest.aiExtractedData.role}</p>
                        </div>
                      )}
                      {selectedRequest.aiExtractedData.idNumber && (
                        <div>
                          <p className="text-purple-700 font-medium">ID Number:</p>
                          <p className="text-gray-700 font-mono text-xs">{selectedRequest.aiExtractedData.idNumber}</p>
                        </div>
                      )}
                      {selectedRequest.aiExtractedData.confidence !== undefined && (
                        <div>
                          <p className="text-purple-700 font-medium">OCR Confidence:</p>
                          <p className="text-gray-700">{selectedRequest.aiExtractedData.confidence}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Duplicate Check Results */}
                {selectedRequest.duplicateCheckResult && selectedRequest.duplicateCheckResult.isDuplicate && (
                  <div className="mb-4 p-4 rounded-lg bg-orange-50 border-2 border-orange-300">
                    <h4 className="font-semibold text-orange-900 mb-3 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      ⚠️ Possible Duplicate Accounts Detected
                    </h4>
                    <div className="space-y-3">
                      {selectedRequest.duplicateCheckResult.matchedAccounts.map((match, index) => (
                        <div key={index} className="p-3 rounded-lg bg-white border border-orange-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-orange-900">{match.fullName}</p>
                              <p className="text-xs text-orange-700">{match.institution}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              match.matchScore === 100 ? 'bg-red-100 text-red-700' :
                              match.matchScore >= 90 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {match.matchScore}% Match
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {match.matchReasons.map((reason, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                                {reason}
                              </span>
                            ))}
                          </div>
                          {match.professionalId && (
                            <p className="text-xs text-orange-700">
                              Professional ID: <span className="font-mono">{match.professionalId}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Flags/Warnings */}
                {selectedRequest.aiFlags && selectedRequest.aiFlags.length > 0 && (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-300">
                    <h4 className="font-semibold text-yellow-900 mb-2 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      AI Detected Issues
                    </h4>
                    <ul className="space-y-1">
                      {selectedRequest.aiFlags.map((flag, index) => (
                        <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                          <span className="text-yellow-600 mt-1">•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  AI analysis is advisory only. Final decision requires human review.
                </p>
              </div>
            )}

            {/* Documents */}
            <div className="mb-6">
              <h3 className="font-semibold text-[#0d1b3e] mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectedRequest.documentUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-[#edf0f7] hover:border-[#63b3ed] transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#63b3ed]" />
                    <span className="text-sm text-[#0d1b3e] font-medium">Document {index + 1}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Video */}
            {selectedRequest.verificationVideoUrl && (
              <div className="mb-6">
                <h3 className="font-semibold text-[#0d1b3e] mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Verification Video
                  {selectedRequest.verificationCode && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-mono">
                      Code: {selectedRequest.verificationCode}
                    </span>
                  )}
                </h3>
                <div className="rounded-lg overflow-hidden border border-[#edf0f7]">
                  <video
                    controls
                    className="w-full max-h-96"
                    src={selectedRequest.verificationVideoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">Admin Verification Checklist</h3>
              <div className="space-y-2">
                {Object.entries({
                  faceMatchesId: "Face matches ID",
                  codeSpokenCorrectly: "Code spoken correctly",
                  idValid: "ID is valid",
                  institutionVerified: "Institution verified",
                  documentsAuthentic: "Documents appear authentic",
                  noDuplicateAccount: "No duplicate account",
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewChecks[key as keyof typeof reviewChecks]}
                      onChange={(e) => setReviewChecks({ ...reviewChecks, [key]: e.target.checked })}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600"
                    />
                    <span className="text-sm text-blue-900">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Decision */}
            <div className="mb-6">
              <h3 className="font-semibold text-[#0d1b3e] mb-3">Decision</h3>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setReviewDecision("approve")}
                  disabled={!allChecked}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    reviewDecision === "approve"
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setReviewDecision("reject")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    reviewDecision === "reject"
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setReviewDecision("more_info")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    reviewDecision === "more_info"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Request More Info
                </button>
              </div>
            </div>

            {/* Review Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                Review Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] outline-none focus:border-[#63b3ed] text-sm"
                placeholder="Add any notes about this review..."
              />
            </div>

            {/* Rejection Reason */}
            {reviewDecision === "reject" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-red-900 mb-2">
                  Rejection Reason (Required)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-red-200 outline-none focus:border-red-500 text-sm"
                  placeholder="Explain why this application is being rejected..."
                />
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!reviewDecision || submitting || (reviewDecision === "reject" && !rejectionReason) || (reviewDecision === "approve" && !allChecked)}
                className="flex-1 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
