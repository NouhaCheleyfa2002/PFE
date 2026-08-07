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
} from "lucide-react";
import { authService } from "@/lib/auth";

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
        alert("Review submitted successfully!");
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
            const initials = request.fullName ? request.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : "??";
            
            return (
            <div key={request.id} className="bg-white rounded-xl border border-[#edf0f7] p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white text-xl font-bold">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0d1b3e] mb-1">{request.fullName}</h3>
                    <p className="text-sm text-[#8899bb] mb-2">{request.user?.email || "No email"}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={request.status} />
                      <TeachingLevelBadge level={request.teachingLevel} />
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
                  <p className="font-medium text-[#0d1b3e]">{selectedRequest.fullName || "Name not provided"}</p>
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
