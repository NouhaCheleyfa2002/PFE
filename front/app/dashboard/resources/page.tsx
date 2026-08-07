"use client";

import React, { useState, useEffect } from "react";
import { FileText, Eye, Trash2, Star, Upload, Download, Search, Filter, X, ChevronDown, BookOpen, FileCheck, BadgeCheck, Bookmark, DollarSign, Clock, Zap, Edit } from "lucide-react";
import { UniversalDocumentPreview } from "@/components/preview/UniversalDocumentPreview";
import { EDUCATION_LEVELS } from "@/lib/education-config";
import { authService } from "@/lib/auth";
import { useBookmarks } from "@/lib/use-bookmarks";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type MainTab = "uploads" | "bookmarks";
type ResourceTab = "courses" | "exams";

interface DatabaseResource {
  id: string;
  title: string;
  originalName: string;
  subject: string;
  classLevel: string;
  resourceType: string;
  storageUrl: string;
  fileSize: number;
  views: number;
  downloads: number;
  averageRating: number;
  totalRatings: number;
  license: string;
  price: number | null;
  createdAt: string;
  status: string;
  verificationStatus?: string;
  rejectionReason?: string;
  processedAt?: string;
  keywords?: string[];
  description?: string;
}

// Edit Metadata Modal Component
function EditMetadataModal({ resource, onClose, onSave }: { resource: DatabaseResource; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [formData, setFormData] = useState({
    title: resource.title,
    subject: resource.subject,
    classLevel: resource.classLevel,
    resourceType: resource.resourceType,
    keywords: resource.keywords?.join(', ') || '',
    description: resource.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const dataToSave = {
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
    };
    await onSave(dataToSave);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#0d1b3e]">Edit Metadata</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Class Level</label>
            <select
              value={formData.classLevel}
              onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              required
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Resource Type</label>
            <select
              value={formData.resourceType}
              onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              required
            >
              <option value="Course Material">Course Material</option>
              <option value="Exam">Exam</option>
              <option value="Exercises">Exercises</option>
              <option value="Summary">Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] min-h-[100px]"
              placeholder="Brief description of the resource..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b3e] mb-2">Keywords</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              placeholder="algebra, equations, calculus (comma-separated)"
            />
            <p className="text-xs text-[#8899bb] mt-1">Separate keywords with commas</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const { fetchBookmarks, toggleBookmark } = useBookmarks();
  const [resources, setResources] = useState<DatabaseResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DatabaseResource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("uploads");
  const [bookmarkedResources, setBookmarkedResources] = useState<any[]>([]);
  const [editingResource, setEditingResource] = useState<DatabaseResource | null>(null);
  
  // Filtering states
  const [activeTab, setActiveTab] = useState<ResourceTab>("courses");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [level, setLevel] = useState("All");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (mainTab === "uploads") {
      fetchMyResources();
    } else {
      loadBookmarks();
    }
  }, [mainTab]);

  const fetchMyResources = async () => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('=== RESOURCES PAGE DEBUG ===');
        console.log('API Response:', data);
        console.log('Documents:', data.documents);
        if (data.documents && data.documents.length > 0) {
          console.log('First document:', data.documents[0]);
        }
        setResources(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    const bookmarks = await fetchBookmarks();
    setBookmarkedResources(bookmarks);
  };

  // Get unique values from resources
  const subjects = ["All", ...Array.from(new Set(resources.map(r => r.subject).filter(Boolean)))];
  const levels = ["All", ...EDUCATION_LEVELS];
  const types = ["All", ...Array.from(new Set(resources.map(r => r.resourceType).filter(Boolean)))];

  const activeFiltersCount = [
    subject !== "All",
    level !== "All",
    type !== "All",
    status !== "All",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSubject("All");
    setLevel("All");
    setType("All");
    setStatus("All");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getVerificationBadge = (verificationStatus?: string, processedAt?: string, createdAt?: string) => {
    // Check if document was auto-approved (processed very quickly after creation)
    const isAutoApproved = verificationStatus === 'approved' && processedAt && createdAt && 
      (new Date(processedAt).getTime() - new Date(createdAt).getTime() < 120000); // Within 2 minutes

    switch (verificationStatus) {
      case 'approved':
        return (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
            isAutoApproved 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
              : 'bg-green-50 border border-green-200'
          }`} title={isAutoApproved ? 'Auto-approved by AI (Score >95)' : 'Approved by admin'}>
            {isAutoApproved ? (
              <Zap className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
            )}
            <span className="text-xs font-semibold text-green-700">
              {isAutoApproved ? 'Auto-Approved' : 'Approved'}
            </span>
          </div>
        );
      case 'under_review':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200" title="Awaiting admin review (Score: 80-95)">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Under Review</span>
          </div>
        );
      case 'changes_requested':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-50 border border-yellow-200" title="Admin requested changes">
            <FileText className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700">Changes Requested</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200" title="Rejected by admin">
            <X className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-semibold text-red-700">Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200" title="Processing">
            <Clock className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">Pending</span>
          </div>
        );
    }
  };

  const handleDownload = async (resource: DatabaseResource) => {
    const token = authService.getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/documents/${resource.id}/download`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Failed to track download:', error);
      }
    }
    window.open(resource.storageUrl, "_blank");
    fetchMyResources(); // Refresh to get updated download count
  };

  const handlePreview = async (resource: DatabaseResource) => {
    const token = authService.getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/documents/${resource.id}/view`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }
    setPreviewDoc(resource);
    fetchMyResources(); // Refresh to get updated view count
  };

  const handleDelete = async (id: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchMyResources(); // Refresh list
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  // Filter resources
  const filtered = resources.filter((resource) => {
    if (search && !resource.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (subject !== "All" && resource.subject !== subject) return false;
    if (level !== "All" && resource.classLevel !== level) return false;
    if (type !== "All" && resource.resourceType !== type) return false;
    if (status !== "All" && resource.verificationStatus !== status.toLowerCase().replace(' ', '_')) return false;
    
    // Filter by tab - case-insensitive
    const resourceTypeLower = (resource.resourceType || '').toLowerCase();
    if (activeTab === "courses" && resourceTypeLower === "exam") return false;
    if (activeTab === "exams" && resourceTypeLower !== "exam") return false;
    
    return true;
  });

  // Count resources by type - case-insensitive
  const coursesCount = resources.filter(r => {
    const type = (r.resourceType || '').toLowerCase();
    return type !== "exam";
  }).length;
  const examsCount = resources.filter(r => {
    const type = (r.resourceType || '').toLowerCase();
    return type === "exam";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
            My Resources
          </h1>
          <p className="text-sm text-[#8899bb] mt-1">Manage your uploaded courses and bookmarked materials</p>
        </div>
        <a
          href="/dashboard/upload"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1b3e] text-white text-sm font-semibold hover:bg-[#1a2d5a] transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload New
        </a>
      </div>

      

      {/* Main Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab("uploads")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              mainTab === "uploads"
                ? "bg-[#63b3ed] text-white shadow-sm"
                : "text-[#8899bb] hover:bg-[#f9faff]"
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>My Uploads</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              mainTab === "uploads" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"
            }`}>
              {resources.length}
            </span>
          </button>
          <button
            onClick={() => setMainTab("bookmarks")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              mainTab === "bookmarks"
                ? "bg-[#63b3ed] text-white shadow-sm"
                : "text-[#8899bb] hover:bg-[#f9faff]"
            }`}
          >
            <Bookmark className="w-5 h-5" />
            <span>Bookmarks</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              mainTab === "bookmarks" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"
            }`}>
              {bookmarkedResources.length}
            </span>
          </button>
        </div>
      </div>

      {mainTab === "bookmarks" ? (
        /* Bookmarks Content */
        bookmarkedResources.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f6f8ff] flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-[#8899bb]" />
            </div>
            <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No bookmarks yet</h2>
            <p className="text-sm text-[#8899bb] mb-6 max-w-md mx-auto">
              Browse the library and bookmark resources you want to save for later!
            </p>
            <a
              href="/dashboard/library"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white text-sm font-semibold hover:bg-[#4299e1] transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Browse Library
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedResources.map((bookmark) => (
              <div key={bookmark.id} className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#0d1b3e] mb-1 truncate">{bookmark.document.title}</h3>
                    <p className="text-xs text-[#8899bb]">{bookmark.document.subject} • {bookmark.document.classLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#8899bb] mb-4">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{bookmark.document.views || 0}</span>
                  <Download className="w-3.5 h-3.5 ml-2" />
                  <span>{bookmark.document.downloads || 0}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(bookmark.document.storageUrl, '_blank')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#63b3ed] text-white text-xs font-medium hover:bg-[#4299e1] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={async () => {
                      await toggleBookmark(bookmark.document.id);
                      loadBookmarks();
                    }}
                    className="px-3 py-2 rounded-lg border border-[#edf0f7] text-[#ef4444] text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f6f8ff] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#8899bb]" />
          </div>
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No resources yet</h2>
          <p className="text-sm text-[#8899bb] mb-6 max-w-md mx-auto">
            Start sharing your educational materials with the community by uploading your first resource.
          </p>
          <a
            href="/dashboard/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white text-sm font-semibold hover:bg-[#4299e1] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Your First Resource
          </a>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#63b3ed]"></div>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl border border-[#edf0f7] p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("courses")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "courses"
                    ? "bg-[#63b3ed] text-white shadow-sm"
                    : "text-[#8899bb] hover:bg-[#f9faff]"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span>Courses & Materials</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === "courses" 
                    ? "bg-white/20 text-white" 
                    : "bg-[#edf0f7] text-[#8899bb]"
                }`}>
                  {coursesCount}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("exams")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "exams"
                    ? "bg-[#63b3ed] text-white shadow-sm"
                    : "text-[#8899bb] hover:bg-[#f9faff]"
                }`}
              >
                <FileCheck className="w-5 h-5" />
                <span>Exams & Assessments</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === "exams" 
                    ? "bg-white/20 text-white" 
                    : "bg-[#edf0f7] text-[#8899bb]"
                }`}>
                  {examsCount}
                </span>
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl border border-[#edf0f7] p-4 space-y-3">
            {/* Search and Filter Toggle */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aab4cc]" />
                <input
                  type="search"
                  placeholder={`Search ${activeTab === "courses" ? "courses and materials" : "exams and assessments"}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  showFilters || activeFiltersCount > 0
                    ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)] text-[#63b3ed]"
                    : "border-[#edf0f7] text-[#8899bb] hover:border-[#63b3ed]"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#63b3ed] text-white text-xs font-semibold">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Expandable Filter Section */}
            {showFilters && (
              <div className="pt-3 border-t border-[#edf0f7] space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Active Filters Display */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Active:</span>
                    {subject !== "All" && (
                      <button
                        onClick={() => setSubject("All")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs hover:bg-[#63b3ed]/20 transition-colors"
                      >
                        <span>{subject}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {level !== "All" && (
                      <button
                        onClick={() => setLevel("All")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs hover:bg-[#63b3ed]/20 transition-colors"
                      >
                        <span>{level}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {type !== "All" && (
                      <button
                        onClick={() => setType("All")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs hover:bg-[#63b3ed]/20 transition-colors"
                      >
                        <span>{type}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {status !== "All" && (
                      <button
                        onClick={() => setStatus("All")}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs hover:bg-[#63b3ed]/20 transition-colors"
                      >
                        <span>{status}</span>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={clearFilters}
                      className="text-xs text-[#ef4444] hover:text-[#dc2626] font-medium underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Subject Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8899bb] mb-1">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] focus:ring-1 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
                    >
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8899bb] mb-1">
                      Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] focus:ring-1 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
                    >
                      {levels.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8899bb] mb-1">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] focus:ring-1 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
                    >
                      {types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-[#8899bb] mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] focus:ring-1 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
                    >
                      <option value="All">All</option>
                      <option value="Approved">Approved</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Changes Requested">Changes Requested</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#8899bb]">
              <span className="font-semibold text-[#0d1b3e]">{filtered.length}</span> resources found
            </p>
          </div>

          {/* Results Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#f6f8ff] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#8899bb]" />
              </div>
              <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No resources match your filters</h2>
              <p className="text-sm text-[#8899bb] mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white text-sm font-semibold hover:bg-[#4299e1] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((r: DatabaseResource) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] shrink-0">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#0d1b3e] mb-1">{r.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                            <span className="flex items-center gap-1">
                              You
                              <BadgeCheck className="w-4 h-4 text-green-500" />
                            </span>
                            <span>•</span>
                            <span>{r.subject || 'No Subject'}</span>
                            <span>•</span>
                            <span>{r.classLevel || 'No Level'}</span>
                            <span>•</span>
                            <span>{formatDate(r.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getVerificationBadge(r.verificationStatus, r.processedAt, r.createdAt)}
                          {r.license === "paid" && r.price && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#fef3c7] to-[#fde68a] border border-[#fbbf24]">
                              <DollarSign className="w-3.5 h-3.5 text-[#92400e]" />
                              <span className="text-xs font-bold text-[#92400e]">{r.price} TND</span>
                            </div>
                          )}
                          {r.averageRating && parseFloat(r.averageRating as any) > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium">
                              <Star className="w-3 h-3 fill-amber-500" /> {parseFloat(r.averageRating as any).toFixed(1)}
                            </div>
                          )}
                          <button
                            onClick={() => setEditingResource(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handlePreview(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#63b3ed] text-white text-xs font-medium hover:bg-[#4299e1] transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          <div className="relative">
                            {deleteConfirm === r.id ? (
                              <div className="absolute right-0 top-full mt-2 z-10 bg-white rounded-lg shadow-xl border border-red-200 p-4 min-w-[280px]">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-[#0d1b3e] mb-1">Delete Resource?</p>
                                    <p className="text-xs text-[#8899bb] leading-relaxed">
                                      This will permanently delete &quot;{r.title}&quot;. This action cannot be undone.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDelete(r.id)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                                  >
                                    Yes, Delete
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-[#edf0f7] text-[#4a5568] text-sm font-medium hover:bg-[#f9faff] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(r.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{r.resourceType || 'Document'}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          r.status === "completed" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {r.status === "completed" ? "Published" : r.status}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">
                          {formatFileSize(r.fileSize)}
                        </span>
                        <span className="flex items-center gap-3 text-xs text-[#8899bb] ml-auto">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {r.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            {r.downloads}
                          </span>
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-[#4a5568] mt-3 leading-relaxed">{r.description}</p>
                      )}
                      {r.keywords && r.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {r.keywords.map((keyword, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs font-medium">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Metadata Modal */}
      {editingResource && (
        <EditMetadataModal
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSave={async (updatedData) => {
            const token = authService.getToken();
            if (!token) return;
            try {
              const response = await fetch(`${API_URL}/documents/${editingResource.id}/metadata`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
              });
              if (response.ok) {
                await fetchMyResources();
                setEditingResource(null);
              }
            } catch (error) {
              console.error('Failed to update resource:', error);
            }
          }}
        />
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <UniversalDocumentPreview
          fileUrl={previewDoc.storageUrl}
          fileName={previewDoc.originalName}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
