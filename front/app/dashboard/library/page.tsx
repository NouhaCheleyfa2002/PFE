"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, BookOpen, GraduationCap, FlaskConical, Globe, Calculator, Code, Palette, TrendingUp, FileText, Filter, FileCheck, Eye, Download, Bookmark, BookmarkCheck, BadgeCheck, DollarSign, ShoppingCart, Lock, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/education-config";
import { ResourceDetailModal } from "@/components/library/ResourceDetailModal";
import { StarRating } from "@/components/ratings";
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
  keywords?: string[];
  description?: string;
}

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
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<EducationLevel | "All">("All");
  const [activeTab, setActiveTab] = useState<ResourceTab>("courses");
  const { toggleBookmark, isBookmarked, checkBookmark } = useBookmarks();
  const [purchasedDocuments, setPurchasedDocuments] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<LibraryResource | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; document: LibraryResource | null }>({
    isOpen: false,
    document: null,
  });

  useEffect(() => {
    const user = authService.getUser();
    if (user?.id) setCurrentUserId(user.id);
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
        setPurchasedDocuments(new Set(data.purchases.map((p: any) => p.documentId)));
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.documents || []);
        if (data.documents) {
          data.documents.forEach((doc: LibraryResource) => checkBookmark(doc.id));
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

  // Filter by tab and level
  const tabAndLevelFiltered = useMemo(() => {
    return resources.filter(r => {
      const resourceTypeLower = r.resourceType?.toLowerCase();
      if (activeTab === "courses" && resourceTypeLower === "exam") return false;
      if (activeTab === "exams" && resourceTypeLower !== "exam") return false;
      if (levelFilter !== "All" && r.classLevel !== levelFilter) return false;
      return true;
    });
  }, [resources, activeTab, levelFilter]);

  // Map resources to Tunisian subjects
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

  // Filter resources for selected subject
  const filteredResources = useMemo(() => {
    if (!selectedSubject) return [];
    return resourcesBySubject.get(selectedSubject) || [];
  }, [selectedSubject, resourcesBySubject]);

  const coursesCount = resources.filter(r => r.resourceType?.toLowerCase() !== "exam").length;
  const examsCount = resources.filter(r => r.resourceType?.toLowerCase() === "exam").length;

  // Subject detail view
  if (selectedSubject) {
    const subject = TUNISIAN_SUBJECTS.find(s => s.id === selectedSubject);
    if (!subject) return null;
    const Icon = subject.icon;

    return (
      <div>
        <div className="mb-6">
          <button onClick={() => setSelectedSubject(null)} className="flex items-center gap-2 text-[#8899bb] hover:text-[#0d1b3e] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Subjects</span>
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">{subject.name}</h1>
              <p className="text-sm text-[#8899bb] mt-1">{subject.arabicName} • {filteredResources.length} resources</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredResources.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
              <FileText className="w-12 h-12 text-[#c0d0e8] mx-auto mb-4" />
              <p className="text-[#8899bb]">No resources found</p>
            </div>
          ) : (
            filteredResources.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed]"><FileText className="w-7 h-7" /></div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0d1b3e] mb-1">{doc.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                          <span className="flex items-center gap-1">{doc.author.firstName} {doc.author.lastName}{doc.author.verified && <BadgeCheck className="w-4 h-4 text-green-500" />}</span>
                          <span>•</span><span>{doc.subject}</span><span>•</span><span>{doc.classLevel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.license === "paid" && doc.price && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#fef3c7] to-[#fde68a] border border-[#fbbf24]">
                            <DollarSign className="w-4 h-4 text-[#92400e]" /><span className="text-sm font-bold text-[#92400e]">{doc.price} TND</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <StarRating rating={doc.averageRating} readonly size="sm" showValue />
                          {doc.totalRatings > 0 && <span className="text-xs text-[#8899bb]">({doc.totalRatings})</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleBookmark(doc.id); }} className="p-1.5 rounded-lg hover:bg-[#f9faff] transition-colors">
                          {isBookmarked(doc.id) ? <BookmarkCheck className="w-4 h-4 text-[#63b3ed] fill-[#63b3ed]" /> : <Bookmark className="w-4 h-4 text-[#8899bb]" />}
                        </button>
                        <button onClick={() => handleView(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#63b3ed] text-white text-xs font-medium hover:bg-[#4299e1] transition-colors">
                          <Eye className="w-3.5 h-3.5" />View
                        </button>
                        {(() => {
                          const isOwner = doc.author.id === currentUserId;
                          const isPaid = doc.license === "paid";
                          const isPurchased = purchasedDocuments.has(doc.id);
                          if (isPaid && !isPurchased && !isOwner) {
                            return (
                              <button onClick={() => handlePurchaseClick(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#f6ad55] to-[#ed8936] text-white text-xs font-medium hover:from-[#ed8936] hover:to-[#dd6b20] transition-colors">
                                <ShoppingCart className="w-3.5 h-3.5" />Purchase
                              </button>
                            );
                          } else if (isOwner && isPaid) {
                            return (
                              <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] bg-[#f9faff] text-[#aab4cc] text-xs font-medium cursor-not-allowed">
                                <Lock className="w-3.5 h-3.5" />Your Resource
                              </button>
                            );
                          } else {
                            return (
                              <button onClick={() => handleDownload(doc)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] text-xs font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#f6f8ff] transition-colors">
                                <Download className="w-3.5 h-3.5" />Download
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.type}</span>
                      <span className="text-xs text-[#8899bb]">{doc.views} views • {doc.downloads} downloads</span>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-[#4a5568] mt-3 leading-relaxed">{doc.description}</p>
                    )}
                    {doc.keywords && doc.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {doc.keywords.map((keyword, idx) => (
                          <span key={idx} className="px-2 py-1 rounded-md bg-[#63b3ed]/10 text-[#63b3ed] text-xs font-medium">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedResource && (
          <ResourceDetailModal resource={{ id: selectedResource.id, title: selectedResource.title, author: `${selectedResource.author.firstName} ${selectedResource.author.lastName}`, type: selectedResource.type, subject: selectedResource.subject, level: selectedResource.classLevel, rating: selectedResource.averageRating, verified: selectedResource.author.verified, fileUrl: selectedResource.storageUrl, fileName: selectedResource.originalName, views: selectedResource.views, downloads: selectedResource.downloads }} isOpen={!!selectedResource} onClose={() => { setSelectedResource(null); fetchResources(); }} />
        )}
        {paymentModal.document && (
          <PaymentModal isOpen={paymentModal.isOpen} onClose={() => setPaymentModal({ isOpen: false, document: null })} document={{ id: paymentModal.document.id, title: paymentModal.document.title, price: paymentModal.document.price || 0, currency: "TND" }} onSuccess={handlePaymentSuccess} />
        )}
      </div>
    );
  }

  // Subject cards view
  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">Library</h1>
        <p className="text-sm text-[#8899bb] mt-1">Browse community resources by subject</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-2 mb-6">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("courses")} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "courses" ? "bg-[#63b3ed] text-white shadow-sm" : "text-[#8899bb] hover:bg-[#f9faff]"}`}>
            <BookOpen className="w-5 h-5" />
            <span>Courses & Materials</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === "courses" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"}`}>{coursesCount}</span>
          </button>
          <button onClick={() => setActiveTab("exams")} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "exams" ? "bg-[#63b3ed] text-white shadow-sm" : "text-[#8899bb] hover:bg-[#f9faff]"}`}>
            <FileCheck className="w-5 h-5" />
            <span>Exams & Assessments</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === "exams" ? "bg-white/20 text-white" : "bg-[#edf0f7] text-[#8899bb]"}`}>{examsCount}</span>
          </button>
        </div>
      </div>

      {/* Level Filter */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-[#8899bb]">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filter by Level:</span>
        </div>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as EducationLevel | "All")} className="px-4 py-2 rounded-lg border border-[#edf0f7] bg-white text-[#0d1b3e] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#63b3ed] focus:border-transparent transition-all">
          <option value="All">All Levels</option>
          {EDUCATION_LEVELS.map(level => (<option key={level} value={level}>{level}</option>))}
        </select>
        {levelFilter !== "All" && (<button onClick={() => setLevelFilter("All")} className="text-xs text-[#8899bb] hover:text-[#0d1b3e] underline transition-colors">Clear filter</button>)}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#63b3ed]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableSubjects.map((subject) => {
            const Icon = subject.icon;
            const resourceCount = resourcesBySubject.get(subject.id)?.length || 0;
            return (
              <button key={subject.id} onClick={() => resourceCount > 0 && setSelectedSubject(subject.id)} disabled={resourceCount === 0} className={`text-left p-6 rounded-2xl border-2 transition-all ${resourceCount > 0 ? `${subject.bgColor} border-transparent hover:shadow-lg hover:scale-105 cursor-pointer` : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center`}><Icon className="w-6 h-6 text-white" /></div>
                  <div className={`px-3 py-1 rounded-full ${resourceCount > 0 ? `${subject.bgColor} ${subject.textColor} font-semibold` : "bg-gray-200 text-gray-500"} text-sm`}>{resourceCount}</div>
                </div>
                <h3 className={`font-bold text-lg mb-1 ${subject.textColor}`}>{subject.name}</h3>
                <p className="text-xs text-[#8899bb] mb-3">{subject.arabicName}</p>
                {resourceCount > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-[#8899bb]"><FileText className="w-3.5 h-3.5" /><span>{resourceCount} resource{resourceCount !== 1 ? "s" : ""}</span></div>
                ) : (
                  <div className="text-xs text-gray-400">No resources yet</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && resources.length === 0 && (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center mt-6">
          <FileText className="w-16 h-16 text-[#c0d0e8] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No resources available</h2>
          <p className="text-sm text-[#8899bb] max-w-md mx-auto">Check back later for new resources from the community</p>
        </div>
      )}

      {!loading && resources.length > 0 && availableSubjects.length === 0 && (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center mt-6">
          <FileText className="w-16 h-16 text-[#c0d0e8] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No {activeTab === "courses" ? "courses" : "exams"} for {levelFilter}</h2>
          <p className="text-sm text-[#8899bb] max-w-md mx-auto">Try selecting a different level or check the other tab</p>
        </div>
      )}
    </div>
  );
}
