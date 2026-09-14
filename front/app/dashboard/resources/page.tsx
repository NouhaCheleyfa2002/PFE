"use client";

import React, { useState, useEffect, Suspense } from "react";
import { FileText, Eye, Trash2, Star, Upload, Download, Search, Filter, X, ChevronDown, BookOpen, FileCheck, BadgeCheck, Bookmark, DollarSign, Clock, Zap, Edit, Users, ShoppingBag, Library } from "lucide-react";
import { UniversalDocumentPreview } from "@/components/preview/UniversalDocumentPreview";
import { ExamViewerModal } from "@/components/exam/ExamViewerModal";
import { EDUCATION_LEVELS } from "@/lib/education-config";
import { authService } from "@/lib/auth";
import { useBookmarks } from "@/lib/use-bookmarks";
import { CollaboratorManager, ActivityFeed } from "@/components/collaboration";
import { useSearchParams } from "next/navigation";
import DocumentChatPanel from "@/components/ai/DocumentChatPanel";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type MainTab = "uploads" | "library" | "bookmarks";
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

function ResourcesPageContent() {
  const { fetchBookmarks, toggleBookmark } = useBookmarks();
  const searchParams = useSearchParams();
  const [resources, setResources] = useState<DatabaseResource[]>([]);
  const [purchasedResources, setPurchasedResources] = useState<DatabaseResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DatabaseResource | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("uploads");
  const [bookmarkedResources, setBookmarkedResources] = useState<any[]>([]);
  const [editingResource, setEditingResource] = useState<DatabaseResource | null>(null);
  const [chatDocument, setChatDocument] = useState<DatabaseResource | null>(null);
  const [collaboratingResource, setCollaboratingResource] = useState<DatabaseResource | null>(null);
  
  // Collaborators state
  const [collaboratorsMap, setCollaboratorsMap] = useState<Record<string, any[]>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  
  // Bulk delete state
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Filtering states
  const [activeTab, setActiveTab] = useState<ResourceTab>("courses");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [level, setLevel] = useState("All");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    const isStudent = user?.role === 'student';
    
    // Students always start on library tab
    if (isStudent) {
      setMainTab('library');
      fetchPurchasedResources();
    } else {
      // Teachers/admins follow the tab param or default to uploads
      if (mainTab === "uploads") {
        fetchMyResources();
      } else if (mainTab === "library") {
        fetchPurchasedResources();
      } else {
        loadBookmarks();
      }
    }
  }, [mainTab]);

  // Load counts on mount for badge display
  useEffect(() => {
    // Load purchased resources count
    fetchPurchasedResources();
    // Load bookmarks count
    loadBookmarks();
  }, []);

  // Check for tab param on mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'library') {
      setMainTab('library');
    }
  }, [searchParams]);

  // Check for highlight param on mount
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (highlight) {
      setHighlightedId(highlight);
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedId(null), 3000);
    }
  }, [searchParams]);

  const fetchMyResources = async () => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch both documents and AI-generated exams
      const [docsResponse, examsResponse] = await Promise.all([
        fetch(`${API_URL}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/exams/ai-generated/list`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const combinedResources: DatabaseResource[] = [];

      // Add documents
      if (docsResponse.ok) {
        const data = await docsResponse.json();
        console.log('=== RESOURCES PAGE DEBUG ===');
        console.log('API Response:', data);
        console.log('Documents:', data.documents);
        if (data.documents && data.documents.length > 0) {
          console.log('First document:', data.documents[0]);
        }
        combinedResources.push(...(data.documents || []));
      }

      // Add AI-generated exams
      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        console.log('AI Exams Response:', examsData);
        if (examsData.exams) {
          // Map exams to DatabaseResource format
          const mappedExams: DatabaseResource[] = examsData.exams.map((exam: any) => ({
            id: exam.id,
            title: exam.title,
            originalName: exam.title,
            subject: exam.subject || 'Not specified',
            classLevel: exam.classLevel || 'Not specified',
            resourceType: 'Exam',
            storageUrl: '', // Exams don't have file storage
            fileSize: 0,
            views: exam.views || 0,
            downloads: exam.downloads || 0,
            averageRating: exam.averageRating || 0,
            totalRatings: exam.totalRatings || 0,
            license: exam.license || 'free',
            price: exam.price || null,
            createdAt: exam.createdAt,
            status: exam.isPublished ? 'published' : 'draft',
            verificationStatus: exam.verificationStatus || 'pending',
            rejectionReason: exam.rejectionReason || null,
            processedAt: exam.publishedAt || null,
            keywords: exam.keywords || [],
            description: exam.description || null,
          }));
          combinedResources.push(...mappedExams);
          console.log('Mapped exams:', mappedExams);
        }
      }

      setResources(combinedResources);
      
      // Fetch collaborators for each resource
      if (combinedResources.length > 0) {
        const docIds = combinedResources.filter(r => r.storageUrl).map((d: DatabaseResource) => d.id);
        if (docIds.length > 0) {
          fetchAllCollaborators(docIds);
        }
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedResources = async () => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/purchases/my-purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Purchased resources:', data.purchases);
        
        // Map purchases to resource format and deduplicate by document ID
        const purchasedDocsMap = new Map();
        data.purchases.forEach((purchase: any) => {
          const docId = purchase.document.id;
          // Only add if not already in map (keeps first occurrence)
          if (!purchasedDocsMap.has(docId)) {
            purchasedDocsMap.set(docId, {
              id: purchase.document.id,
              title: purchase.document.title,
              originalName: purchase.document.originalName,
              subject: purchase.document.subject,
              classLevel: purchase.document.classLevel,
              resourceType: purchase.document.resourceType,
              storageUrl: purchase.document.storageUrl,
              fileSize: purchase.document.fileSize,
              views: purchase.document.views,
              downloads: purchase.document.downloads,
              averageRating: purchase.document.averageRating,
              totalRatings: purchase.document.totalRatings,
              license: purchase.document.license,
              price: purchase.document.price,
              createdAt: purchase.purchasedAt,
              status: 'completed',
              verificationStatus: 'approved',
            });
          }
        });
        
        const purchasedDocs = Array.from(purchasedDocsMap.values());
        setPurchasedResources(purchasedDocs);
      }
    } catch (error) {
      console.error("Failed to fetch purchased resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCollaborators = async (resourceIds: string[]) => {
    const token = authService.getToken();
    if (!token) return;

    const collabMap: Record<string, any[]> = {};
    
    await Promise.all(
      resourceIds.map(async (resourceId) => {
        try {
          const response = await fetch(`${API_URL}/collaboration/resources/${resourceId}/collaborators`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const collaborators = await response.json();
            // Only include accepted collaborators
            collabMap[resourceId] = collaborators.filter((c: any) => c.status === 'accepted');
          }
        } catch (error) {
          console.error(`Failed to fetch collaborators for ${resourceId}:`, error);
        }
      })
    );

    setCollaboratorsMap(collabMap);
  };

  const loadBookmarks = async () => {
    const bookmarks = await fetchBookmarks();
    
    // Deduplicate bookmarks by ID
    const uniqueBookmarks = Array.from(
      new Map(bookmarks.map((b: any) => [b.id, b])).values()
    );
    
    setBookmarkedResources(uniqueBookmarks);
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
    // Exams should be opened in viewer, not downloaded
    if (resource.resourceType?.toLowerCase() === 'exam') {
      handlePreview(resource); // Reuse preview for exams
      return;
    }
    
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
    // If it's an exam, use ExamViewerModal instead
    if (resource.resourceType?.toLowerCase() === 'exam') {
      setSelectedExamId(resource.id);
      return;
    }
    
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
      // Find the resource to check its type
      const resource = resources.find(r => r.id === id);
      
      if (!resource) {
        console.error('Resource not found in local state:', id);
        toast.error('Resource not found');
        return;
      }

      // Determine if it's an exam based on storageUrl being empty/null
      // AI-generated exams don't have files, so storageUrl is empty
      const isExam = !resource.storageUrl;
      
      console.log('Deleting resource:', {
        id,
        title: resource.title,
        isExam,
        storageUrl: resource.storageUrl,
        resourceType: resource.resourceType,
      });
      
      // Use appropriate endpoint based on resource type
      const endpoint = isExam ? `${API_URL}/exams/${id}` : `${API_URL}/documents/${id}`;
      
      console.log('DELETE request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success(`${isExam ? 'Exam' : 'Document'} deleted successfully`);
        fetchMyResources(); // Refresh list
        setDeleteConfirm(null);
      } else {
        const errorText = await response.text();
        console.error(`Failed to delete ${isExam ? 'exam' : 'document'}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        // More specific error messages
        if (response.status === 404) {
          toast.error(`${isExam ? 'Exam' : 'Document'} not found. It may have already been deleted.`);
          // Refresh the list anyway to remove stale data
          fetchMyResources();
        } else if (response.status === 403) {
          toast.error('You do not have permission to delete this resource');
        } else {
          toast.error(`Failed to delete: ${response.statusText}`);
        }
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast.error('An error occurred while deleting');
      setDeleteConfirm(null);
    }
  };

  // Bulk delete resources
  const handleBulkDelete = async () => {
    if (selectedResources.size === 0) {
      alert('No resources selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedResources.size} resource(s)?`)) {
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    setBulkDeleting(true);
    try {
      const deletePromises = Array.from(selectedResources).map(resourceId => {
        const resource = resources.find(r => r.id === resourceId);
        
        // If storageUrl is empty or missing, it's an AI-generated exam
        // Otherwise, it's a regular uploaded document
        const isAIExam = !resource?.storageUrl || resource.storageUrl.trim() === '';
        const endpoint = isAIExam 
          ? `${API_URL}/exams/${resourceId}` 
          : `${API_URL}/documents/${resourceId}`;
        
        console.log(`[BulkDelete] ${resourceId}: ${isAIExam ? 'AI Exam' : 'Document'} -> ${endpoint}`);
        
        return fetch(endpoint, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      });

      const results = await Promise.allSettled(deletePromises);
      
      // Check which ones actually succeeded (HTTP 200-299)
      const successfulIds = new Set<string>();
      const forbiddenIds = new Set<string>();
      const errorIds = new Set<string>();
      
      Array.from(selectedResources).forEach((resourceId, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value.ok) {
          successfulIds.add(resourceId);
        } else if (result.status === 'fulfilled' && result.value.status === 403) {
          forbiddenIds.add(resourceId);
          console.warn(`[BulkDelete] Permission denied for ${resourceId}`);
        } else if (result.status === 'fulfilled') {
          errorIds.add(resourceId);
          console.error(`[BulkDelete] Failed ${resourceId}: HTTP ${result.value.status}`);
        } else {
          errorIds.add(resourceId);
          console.error(`[BulkDelete] Failed ${resourceId}:`, result.reason);
        }
      });

      const successCount = successfulIds.size;
      const forbiddenCount = forbiddenIds.size;
      const errorCount = errorIds.size;

      // Remove only successfully deleted resources from local state
      setResources(prev => prev.filter(r => !successfulIds.has(r.id)));
      setSelectedResources(new Set());

      // Show detailed results
      let message = '';
      if (successCount > 0) {
        message += `✓ Successfully deleted ${successCount} resource(s)`;
      }
      if (forbiddenCount > 0) {
        message += `\n⚠ ${forbiddenCount} resource(s) belong to other users (permission denied)`;
      }
      if (errorCount > 0) {
        message += `\n❌ ${errorCount} resource(s) failed to delete (server error)`;
      }
      
      alert(message || 'No resources were deleted');
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      alert('❌ Failed to delete resources');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Toggle resource selection
  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId);
      } else {
        newSet.add(resourceId);
      }
      return newSet;
    });
  };

  // Select all resources in current view
  const toggleSelectAll = () => {
    if (selectedResources.size === filtered.length && filtered.length > 0) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filtered.map(r => r.id)));
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
      <div className="flex items-center justify-end">
        {authService.getUser()?.role !== 'student' && (
          <a
            href="/dashboard/upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1b3e] text-white text-sm font-semibold hover:bg-[#1a2d5a] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New
          </a>
        )}
      </div>

      

      {/* Main Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-2">
        <div className="flex gap-2">
          {authService.getUser()?.role === 'student' ? (
            // Student view - only library (bookmarks has its own page)
            <div className="w-full text-center py-2">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#63b3ed] text-white shadow-sm">
                <Library className="w-5 h-5" />
                <span className="font-medium">My Library</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {purchasedResources.length}
                </span>
              </div>
            </div>
          ) : (
            // Teacher/Admin view - all tabs
            <>
              <button
                onClick={() => setMainTab("uploads")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  mainTab === "uploads"
                    ? "bg-[#63b3ed] text-white shadow-sm"
                    : "text-[#8899bb] hover:bg-[#f9faff]"
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Uploaded Resources</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  mainTab === "uploads" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"
                }`}>
                  {resources.length}
                </span>
              </button>
              <button
                onClick={() => setMainTab("library")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  mainTab === "library"
                    ? "bg-[#63b3ed] text-white shadow-sm"
                    : "text-[#8899bb] hover:bg-[#f9faff]"
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>My Library</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  mainTab === "library" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"
                }`}>
                  {purchasedResources.length}
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
            </>
          )}
        </div>
      </div>

      {mainTab === "library" ? (
        /* My Library (Purchased Resources) Content */
        purchasedResources.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f6f8ff] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-[#8899bb]" />
            </div>
            <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">Your library is empty</h2>
            <p className="text-sm text-[#8899bb] mb-6 max-w-md mx-auto">
              Purchase resources from the marketplace to build your personal library!
            </p>
            <a
              href="/dashboard/library"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white text-sm font-semibold hover:bg-[#4299e1] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Marketplace
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchasedResources.map((resource) => (
              <div key={resource.id} className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#0d1b3e] mb-1 truncate">{resource.title}</h3>
                    <p className="text-xs text-[#8899bb]">{resource.subject} • {resource.classLevel}</p>
                  </div>
                </div>
                
                {/* Purchased Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200">
                    <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Purchased</span>
                  </div>
                  {resource.price && (
                    <span className="text-xs text-[#8899bb]">{Number(resource.price).toFixed(2)} TND</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-[#8899bb] mb-4">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{resource.views || 0}</span>
                  <Download className="w-3.5 h-3.5 ml-2" />
                  <span>{resource.downloads || 0}</span>
                  {resource.averageRating && Number(resource.averageRating) > 0 && (
                    <>
                      <Star className="w-3.5 h-3.5 ml-2 fill-yellow-400 text-yellow-400" />
                      <span>{Number(resource.averageRating).toFixed(1)}</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(resource)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#63b3ed] text-white text-xs font-medium hover:bg-[#4299e1] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(resource)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : mainTab === "bookmarks" ? (
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

          {/* Bulk Actions Bar - Sticky */}
          {filtered.length > 0 && (
            <div className="sticky top-0 z-10 bg-white rounded-xl border-2 border-[#edf0f7] shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-4 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedResources.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all cursor-pointer"
                        />
                        {selectedResources.size > 0 && selectedResources.size < filtered.length && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></div>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                        Select All
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {filtered.length}
                      </span>
                    </label>
                    
                    {selectedResources.size > 0 && (
                      <div className="flex items-center gap-2 pl-4 border-l-2 border-indigo-200">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-sm font-bold text-indigo-700">
                            {selectedResources.size} selected
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedResources(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {selectedResources.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 text-sm"
                    >
                      {bulkDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Selected</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                            {selectedResources.size}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Selection info bar */}
              {selectedResources.size > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">{selectedResources.size}</span> of <span className="font-semibold">{filtered.length}</span> resources selected
                    {selectedResources.size === filtered.length && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-semibold">All selected</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

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
              {filtered.map((r: DatabaseResource) => {
                const collaborators = collaboratorsMap[r.id] || [];
                const isHighlighted = highlightedId === r.id;
                
                return (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all ${
                    isHighlighted 
                      ? 'border-[#63b3ed] shadow-lg ring-2 ring-[#63b3ed]/20 animate-pulse' 
                      : 'border-[#edf0f7] hover:border-[#63b3ed]/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox for bulk selection - Improved styling */}
                    <div className="pt-2 relative group">
                      <input
                        type="checkbox"
                        checked={selectedResources.has(r.id)}
                        onChange={() => toggleResourceSelection(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer transition-all hover:border-indigo-400"
                      />
                      {selectedResources.has(r.id) && (
                        <div className="absolute -inset-1 bg-indigo-100 rounded-lg opacity-20 animate-pulse pointer-events-none"></div>
                      )}
                    </div>

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
                            {collaborators.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  Co-authored with {collaborators.length} {collaborators.length === 1 ? 'other' : 'others'}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span>{r.subject || 'No Subject'}</span>
                            <span>•</span>
                            <span>{r.classLevel || 'No Level'}</span>
                            <span>•</span>
                            <span>{formatDate(r.createdAt)}</span>
                          </div>
                          
                          {/* Collaborator Avatars */}
                          {collaborators.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex -space-x-2">
                                {collaborators.slice(0, 3).map((collab: any) => (
                                  <div
                                    key={collab.id}
                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center shadow-sm"
                                    title={collab.userName || 'Collaborator'}
                                  >
                                    <span className="text-[10px] font-bold text-white">
                                      {(collab.userName || '?').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                                {collaborators.length > 3 && (
                                  <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center shadow-sm">
                                    <span className="text-[9px] font-bold text-gray-600">
                                      +{collaborators.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-[#8899bb]">
                                {collaborators.slice(0, 2).map((c: any) => c.userName).join(', ')}
                                {collaborators.length > 2 && ` and ${collaborators.length - 2} more`}
                              </span>
                            </div>
                          )}
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
                            onClick={() => setCollaboratingResource(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors"
                            title="Collaborators"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Collaborate
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
                            onClick={() => setChatDocument(r)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium hover:from-purple-600 hover:to-blue-600 transition-colors"
                            title="Chat with AI about this document"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            AI
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
              );
              })}
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

      {/* Collaboration Modal */}
      {collaboratingResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#0d1b3e]">Manage Collaborators</h2>
              <button onClick={() => setCollaboratingResource(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <CollaboratorManager
                resourceId={collaboratingResource.id}
                resourceType="document"
                isOwner={true}
              />
              
              <ActivityFeed
                resourceId={collaboratingResource.id}
                resourceType="document"
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && previewDoc.storageUrl && (
        <UniversalDocumentPreview
          fileUrl={previewDoc.storageUrl}
          fileName={previewDoc.originalName}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      
      {/* Exam Viewer Modal */}
      {selectedExamId && (
        <ExamViewerModal
          examId={selectedExamId}
          isOpen={!!selectedExamId}
          onClose={() => setSelectedExamId(null)}
        />
      )}
      
      {/* AI Document Chat */}
      {chatDocument && (
        <DocumentChatPanel
          documentId={chatDocument.id}
          documentTitle={chatDocument.title}
          isOpen={!!chatDocument}
          onClose={() => setChatDocument(null)}
        />
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#63b3ed]"></div>
      </div>
    }>
      <ResourcesPageContent />
    </Suspense>
  );
}
