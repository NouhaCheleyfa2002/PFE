"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FileText, BadgeCheck, Search, BookOpen, FileCheck, Eye, Filter, X, ChevronDown, Loader2, Download, Bookmark, BookmarkCheck, ShoppingCart, Lock, DollarSign, ArrowLeft, Calculator, FlaskConical, Globe, GraduationCap, Code, Palette, TrendingUp } from "lucide-react";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/education-config";
import { ResourceDetailModal } from "@/components/library/ResourceDetailModal";
import { StarRating } from "@/components/ratings";
import { authService } from "@/lib/auth";
import { useBookmarks } from "@/lib/use-bookmarks";
import PaymentModal from "@/components/PaymentModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type ResourceTab = "courses" | "exams";

interface LibraryResource {
  id: string;
  title: string;
  originalName: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    verified: boolean;
  };
  type: string;
  resourceType: string;
  subject: string;
  classLevel: string;
  averageRating: number;
  totalRatings: number;
  downloads: number;
  views: number;
  storageUrl: string;
  createdAt: string;
  license?: string;
  price?: number;
}

const SUBJECTS = ["All", "Arabic Language", "French Language", "English Language", "Mathematics", "Physics", "Chemistry", "Life Sciences (SVT)", "History", "Geography", "Philosophy", "Computer Science", "Islamic Education"];
const TYPES = ["All", "Course Material", "Exam", "Exercises", "Summary"];
const LEVELS = ["All", ...EDUCATION_LEVELS];

// Tunisian Education System Subjects
const TUNISIAN_SUBJECTS = [
  {
    id: "mathematics",
    name: "Mathematics",
    arabicName: "الرياضيات",
    icon: Calculator,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    keywords: ["math", "mathematics", "mathématiques", "رياضيات"],
  },
  {
    id: "physics",
    name: "Physics",
    arabicName: "الفيزياء",
    icon: FlaskConical,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    keywords: ["physics", "physique", "فيزياء"],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    arabicName: "الكيمياء",
    icon: FlaskConical,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    keywords: ["chemistry", "chimie", "كيمياء"],
  },
  {
    id: "biology",
    name: "Biology & SVT",
    arabicName: "علوم الحياة",
    icon: GraduationCap,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    keywords: ["biology", "biologie", "svt", "life sciences", "أحياء", "علوم"],
  },
  {
    id: "computer",
    name: "Computer Science",
    arabicName: "علوم الإعلامية",
    icon: Code,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    textColor: "text-indigo-700",
    keywords: ["computer", "informatique", "programming", "إعلامية", "برمجة"],
  },
  {
    id: "arabic",
    name: "Arabic",
    arabicName: "اللغة العربية",
    icon: BookOpen,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    keywords: ["arabic", "arabe", "عربية", "لغة عربية"],
  },
  {
    id: "french",
    name: "French",
    arabicName: "الفرنسية",
    icon: Globe,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    keywords: ["french", "français", "francais", "فرنسية"],
  },
  {
    id: "english",
    name: "English",
    arabicName: "الإنجليزية",
    icon: Globe,
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-700",
    keywords: ["english", "anglais", "إنجليزية"],
  },
  {
    id: "philosophy",
    name: "Philosophy",
    arabicName: "الفلسفة",
    icon: GraduationCap,
    color: "from-purple-500 to-pink-600",
    bgColor: "bg-pink-50",
    textColor: "text-pink-700",
    keywords: ["philosophy", "philosophie", "فلسفة"],
  },
  {
    id: "history",
    name: "History",
    arabicName: "التاريخ",
    icon: BookOpen,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    keywords: ["history", "histoire", "تاريخ"],
  },
  {
    id: "geography",
    name: "Geography",
    arabicName: "الجغرافيا",
    icon: Globe,
    color: "from-teal-500 to-teal-600",
    bgColor: "bg-teal-50",
    textColor: "text-teal-700",
    keywords: ["geography", "géographie", "geographie", "جغرافيا"],
  },
  {
    id: "economics",
    name: "Economics",
    arabicName: "الاقتصاد",
    icon: TrendingUp,
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    keywords: ["economics", "économie", "economie", "اقتصاد", "تدبير", "gestion"],
  },
  {
    id: "islamic",
    name: "Islamic Studies",
    arabicName: "التربية الإسلامية",
    icon: BookOpen,
    color: "from-green-600 to-emerald-700",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    keywords: ["islamic", "islamique", "إسلامية", "تربية إسلامية"],
  },
  {
    id: "arts",
    name: "Arts & Music",
    arabicName: "الفنون",
    icon: Palette,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    keywords: ["arts", "music", "musique", "فنون", "موسيقى"],
  },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>("courses");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");
  const [level, setLevel] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleBookmark, isBookmarked, checkBookmark } = useBookmarks();
  const [purchasedDocuments, setPurchasedDocuments] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; document: LibraryResource | null }>({
    isOpen: false,
    document: null,
  });
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<EducationLevel | "All">("All");

  const activeFiltersCount = [subject !== "All", type !== "All", level !== "All"].filter(Boolean).length;

  useEffect(() => {
    // Read search query from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearch(decodeURIComponent(searchParam));
    }

    // Get current user ID
    const user = authService.getUser();
    console.log('=== LIBRARY PAGE USER DEBUG ===');
    console.log('Full user object:', user);
    console.log('User ID:', user?.id);
    
    if (user?.id) {
      setCurrentUserId(user.id);
      console.log('Current user ID set to:', user.id);
    } else {
      console.warn('WARNING: Could not get user ID');
    }
    
    fetchResources();
    fetchPurchasedDocuments();
  }, []);

  const fetchPurchasedDocuments = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/purchases/my-purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const purchasedIds = new Set(data.purchases.map((p: any) => p.documentId));
        setPurchasedDocuments(purchasedIds);
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    }
  };

  const fetchResources = async () => {
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/documents/library`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data.documents || []);
        
        // Check bookmark status for all documents
        if (data.documents) {
          data.documents.forEach((doc: LibraryResource) => {
            checkBookmark(doc.id);
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch library resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (resource: LibraryResource) => {
    setSelectedResource(resource);
  };

  const handleDownload = async (resource: LibraryResource) => {
    // Check if resource is paid and not purchased
    if (resource.license === "paid" && !purchasedDocuments.has(resource.id)) {
      setPaymentModal({ isOpen: true, document: resource });
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/ratings/resources/${resource.id}/download`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      window.open(resource.storageUrl, "_blank");
      await fetchResources();
    } catch (error) {
      console.error("Download failed:", error);
      window.open(resource.storageUrl, "_blank");
    }
  };

  const handlePurchaseClick = (resource: LibraryResource) => {
    setPaymentModal({ isOpen: true, document: resource });
  };

  const handlePaymentSuccess = () => {
    fetchPurchasedDocuments();
    fetchResources();
  };

  const clearFilters = () => {
    setSubject("All");
    setType("All");
    setLevel("All");
  };

  // Filter resources by tab and level
  const tabAndLevelFiltered = useMemo(() => {
    return resources.filter(r => {
      // Filter by tab (courses vs exams)
      const resourceTypeLower = r.resourceType?.toLowerCase();
      if (activeTab === "courses" && resourceTypeLower === "exam") return false;
      if (activeTab === "exams" && resourceTypeLower !== "exam") return false;
      
      // Filter by level
      if (levelFilter !== "All" && r.classLevel !== levelFilter) return false;
      
      return true;
    });
  }, [resources, activeTab, levelFilter]);

  // Map resources to subjects
  const resourcesBySubject = useMemo(() => {
    const mapped = new Map<string, LibraryResource[]>();

    tabAndLevelFiltered.forEach(resource => {
      const subjectLower = (resource.subject || '').toLowerCase();
      
      const tunisianSubject = TUNISIAN_SUBJECTS.find(ts =>
        ts.keywords.some(keyword => subjectLower.includes(keyword.toLowerCase()))
      );

      if (tunisianSubject) {
        const existing = mapped.get(tunisianSubject.id) || [];
        mapped.set(tunisianSubject.id, [...existing, resource]);
      }
    });

    return mapped;
  }, [tabAndLevelFiltered]);

  // Get available subjects
  const availableSubjects = useMemo(() => {
    return TUNISIAN_SUBJECTS.filter(subject => {
      const resourceCount = resourcesBySubject.get(subject.id)?.length || 0;
      return resourceCount > 0;
    });
  }, [resourcesBySubject]);

  // Filter for detailed view
  const detailedFilteredResources = useMemo(() => {
    if (!selectedSubject) return [];
    const subjectResources = resourcesBySubject.get(selectedSubject) || [];
    
    return subjectResources.filter((doc) => {
      if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (subject !== "All" && doc.subject !== subject) return false;
      if (type !== "All" && doc.type !== type) return false;
      if (level !== "All" && doc.classLevel !== level) return false;
      return true;
    });
  }, [selectedSubject, resourcesBySubject, search, subject, type, level]);

  const filtered = resources.filter((doc) => {
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (subject !== "All" && doc.subject !== subject) return false;
    if (type !== "All" && doc.type !== type) return false;
    if (level !== "All" && doc.classLevel !== level) return false;
    
    // Case-insensitive resource type check
    const resourceTypeLower = doc.resourceType?.toLowerCase();
    if (activeTab === "courses" && resourceTypeLower === "exam") return false;
    if (activeTab === "exams" && resourceTypeLower !== "exam") return false;
    
    return true;
  });

  const coursesCount = resources.filter(r => r.resourceType?.toLowerCase() !== "exam").length;
  const examsCount = resources.filter(r => r.resourceType?.toLowerCase() === "exam").length;

  return (
    <div className="space-y-6">
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

        {showFilters && (
          <div className="pt-3 border-t border-[#edf0f7] space-y-3">
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#8899bb] uppercase tracking-wider">Active:</span>
                {subject !== "All" && (
                  <button onClick={() => setSubject("All")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs">
                    {subject} <X className="w-3 h-3" />
                  </button>
                )}
                {type !== "All" && (
                  <button onClick={() => setType("All")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs">
                    {type} <X className="w-3 h-3" />
                  </button>
                )}
                {level !== "All" && (
                  <button onClick={() => setLevel("All")} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs">
                    {level} <X className="w-3 h-3" />
                  </button>
                )}
                <button onClick={clearFilters} className="text-xs text-[#ef4444] hover:text-[#dc2626] font-medium underline">
                  Clear all
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8899bb] mb-1">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] bg-white text-[#0d1b3e]">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8899bb] mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] bg-white text-[#0d1b3e]">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8899bb] mb-1">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] bg-white text-[#0d1b3e]">
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#63b3ed]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
          <FileText className="w-16 h-16 text-[#8899bb] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">No resources found</h3>
          <p className="text-sm text-[#8899bb]">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] shrink-0">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0d1b3e] mb-1">{doc.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                        <span className="flex items-center gap-1">
                          {doc.author.firstName} {doc.author.lastName}
                          {doc.author.verified && <BadgeCheck className="w-4 h-4 text-green-500" />}
                        </span>
                        <span>•</span>
                        <span>{doc.subject}</span>
                        <span>•</span>
                        <span>{doc.classLevel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.license === "paid" && doc.price && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#fef3c7] to-[#fde68a] border border-[#fbbf24]">
                          <DollarSign className="w-4 h-4 text-[#92400e]" />
                          <span className="text-sm font-bold text-[#92400e]">{doc.price} TND</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <StarRating rating={doc.averageRating} readonly size="sm" showValue />
                        {doc.totalRatings > 0 && (
                          <span className="text-xs text-[#8899bb]">({doc.totalRatings})</span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(doc.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#f9faff] transition-colors"
                        title={isBookmarked(doc.id) ? "Remove bookmark" : "Bookmark"}
                      >
                        {isBookmarked(doc.id) ? (
                          <BookmarkCheck className="w-4 h-4 text-[#63b3ed] fill-[#63b3ed]" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-[#8899bb]" />
                        )}
                      </button>
                      <button onClick={() => handleView(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#63b3ed] text-white text-xs font-medium hover:bg-[#4299e1] transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      {/* Show purchase button only for paid resources that user doesn't own and didn't create */}
                      {(() => {
                        const isOwner = doc.author.id === currentUserId;
                        const isPaid = doc.license === "paid";
                        const isPurchased = purchasedDocuments.has(doc.id);
                        
                        console.log(`Doc ${doc.id} - isOwner: ${isOwner}, isPaid: ${isPaid}, isPurchased: ${isPurchased}, authorId: ${doc.author.id}, currentUserId: ${currentUserId}`);
                        
                        if (isPaid && !isPurchased && !isOwner) {
                          // Show purchase button for paid resources not owned by user
                          return (
                            <button onClick={() => handlePurchaseClick(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#f6ad55] to-[#ed8936] text-white text-xs font-medium hover:from-[#ed8936] hover:to-[#dd6b20] transition-colors shadow-sm">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Purchase
                            </button>
                          );
                        } else if (isOwner && isPaid) {
                          // Show disabled button for own paid resources
                          return (
                            <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] bg-[#f9faff] text-[#aab4cc] text-xs font-medium cursor-not-allowed">
                              <Lock className="w-3.5 h-3.5" />
                              Your Resource
                            </button>
                          );
                        } else {
                          // Show download button for free or purchased resources
                          return (
                            <button onClick={() => handleDownload(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors">
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.type}</span>
                    <span className="text-xs text-[#8899bb]">
                      {doc.views} views • {doc.downloads} downloads
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    
    {/* Resource Detail Modal */}
    {selectedResource && (
      <ResourceDetailModal
        resource={{
          id: selectedResource.id,
          title: selectedResource.title,
          author: `${selectedResource.author.firstName} ${selectedResource.author.lastName}`,
          type: selectedResource.type,
          subject: selectedResource.subject,
          level: selectedResource.classLevel,
          rating: selectedResource.averageRating,
          verified: selectedResource.author.verified,
          fileUrl: selectedResource.storageUrl,
          fileName: selectedResource.originalName,
          views: selectedResource.views,
          downloads: selectedResource.downloads,
        }}
        isOpen={!!selectedResource}
        onClose={() => {
          setSelectedResource(null);
          fetchResources(); // Refresh data when modal closes
        }}
      />
    )}

    {/* Payment Modal */}
    {paymentModal.document && (
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, document: null })}
        document={{
          id: paymentModal.document.id,
          title: paymentModal.document.title,
          price: paymentModal.document.price || 0,
          currency: "TND",
        }}
        onSuccess={handlePaymentSuccess}
      />
    )}
    </div>
  );
}
