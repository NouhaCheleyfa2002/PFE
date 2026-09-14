"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, BookOpen, GraduationCap, FlaskConical, Globe, Calculator, Code, Palette, TrendingUp, FileText, Filter, FileCheck, Eye, Download, Bookmark, BookmarkCheck, BadgeCheck, DollarSign, ShoppingCart, Lock, Loader2, CheckCircle, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";
import { EDUCATION_LEVELS, EducationLevel } from "@/lib/education-config";
import { ResourceDetailModal } from "@/components/library/ResourceDetailModal";
import { StarRating } from "@/components/ratings";
import { useBookmarks } from "@/lib/use-bookmarks";
import { ExamViewerModal } from "@/components/exam/ExamViewerModal";

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
  coAuthors?: Array<{ userId: string; fullName: string; role: string }>;
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
  {
    id: "other",
    name: "Other Subjects",
    arabicName: "مواد أخرى",
    icon: BookOpen,
    color: "from-gray-500 to-gray-600",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    keywords: [], // Will catch unmapped subjects
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
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<Set<string>>(new Set());

  // Load cart items from localStorage
  const loadCartItems = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cart = JSON.parse(savedCart);
      const documentIds = new Set(cart.map((item: any) => item.documentId));
      setCartItems(documentIds);
    }
  };

  useEffect(() => {
    const user = authService.getUser();
    if (user?.id) setCurrentUserId(user.id);
    fetchResources();
    fetchPurchasedDocuments();
    loadCartItems();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCartItems();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
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
      
      // Fetch both documents and exams
      const [docsResponse, examsResponse] = await Promise.all([
        fetch(`${API_URL}/documents/library`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/exams/marketplace/list`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      const combinedResources: LibraryResource[] = [];
      
      // Add documents
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        if (docsData.documents) {
          combinedResources.push(...docsData.documents);
          docsData.documents.forEach((doc: LibraryResource) => checkBookmark(doc.id));
        }
      }
      
      // Add exams
      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        if (examsData.exams) {
          // Map exams to LibraryResource format
          const mappedExams: LibraryResource[] = examsData.exams.map((exam: any) => ({
            id: exam.id,
            title: exam.title,
            originalName: exam.title, // Exams don't have originalName
            author: exam.owner || { id: exam.ownerId, firstName: 'Unknown', lastName: '', verified: false },
            coAuthors: exam.coAuthors || [], // Include co-authors from collaborative exam creation
            type: 'Exam',
            resourceType: 'Exam',
            subject: exam.subject || '',
            classLevel: exam.classLevel || '',
            averageRating: exam.averageRating || 0,
            totalRatings: exam.totalRatings || 0,
            downloads: exam.downloads || 0,
            views: exam.views || 0,
            storageUrl: '', // Exams don't have storage URL - they're viewed inline
            createdAt: exam.publishedAt || exam.createdAt,
            license: exam.license || 'free',
            price: exam.price || 0,
            keywords: exam.keywords || [],
            description: exam.description || '',
          }));
          combinedResources.push(...mappedExams);
          mappedExams.forEach((exam) => checkBookmark(exam.id));
        }
      }
      
      setResources(combinedResources);
    } catch (error) {
      console.error("Failed to fetch library resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (resource: LibraryResource) => {
    // If it's an exam, open exam viewer modal
    if (resource.resourceType === 'Exam' || resource.type === 'Exam') {
      setSelectedExamId(resource.id);
      return;
    }
    setSelectedResource(resource);
  };

  const handleDownload = async (resource: LibraryResource) => {
    // Exams can be downloaded/printed from the viewer modal
    if (resource.resourceType === 'Exam' || resource.type === 'Exam') {
      setSelectedExamId(resource.id);
      return;
    }
    
    // If resource is paid and not purchased, suggest adding to cart
    if (resource.license === "paid" && !purchasedDocuments.has(resource.id)) {
      toast.error('Please purchase this resource first', { icon: <ShoppingCart className="w-5 h-5" /> });
      addToCart(resource);
      return;
    }
    
    const token = authService.getToken();
    if (!token) return;
    try {
      // Only track download for documents (not exams)
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

  const addToCart = (resource: LibraryResource) => {
    // Exams cannot be purchased via cart
    if (resource.resourceType === 'Exam' || resource.type === 'Exam') {
      toast.error('Exams cannot be added to cart. View them directly instead.');
      return;
    }
    
    // Get existing cart from localStorage
    const savedCart = localStorage.getItem('cart');
    const cart = savedCart ? JSON.parse(savedCart) : [];
    
    // Check if item already in cart
    const existingItem = cart.find((item: any) => item.documentId === resource.id);
    if (existingItem) {
      // Increment quantity
      existingItem.quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: `cart-${Date.now()}`,
        documentId: resource.id,
        title: resource.title,
        subject: resource.subject,
        classLevel: resource.classLevel,
        price: resource.price || 0,
        license: resource.license || 'free',
        quantity: 1,
      });
    }
    
    // Save back to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart items state
    setCartItems(prev => new Set([...prev, resource.id]));
    
    // Dispatch event to update cart badge
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Show success message
    const itemCount = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
    toast.success(`Added to cart! You have ${itemCount} item(s) in your cart.`);
  };

  // Filter by tab and level
  const tabAndLevelFiltered = useMemo(() => {
    return resources.filter(r => {
      const resourceTypeLower = (r.resourceType || '').toLowerCase();
      const resourceType = (r.type || '').toLowerCase();
      const isExam = resourceTypeLower === "exam" || resourceType === "exam";
      
      if (activeTab === "courses" && isExam) return false;
      if (activeTab === "exams" && !isExam) return false;
      if (levelFilter !== "All" && r.classLevel !== levelFilter) return false;
      return true;
    });
  }, [resources, activeTab, levelFilter]);

  // Map resources to Tunisian subjects
  const resourcesBySubject = useMemo(() => {
    const mapped = new Map<string, LibraryResource[]>();
    const unmappedResources: LibraryResource[] = [];
    
    tabAndLevelFiltered.forEach(resource => {
      const subjectLower = (resource.subject || '').toLowerCase();
      console.log('[Library] Mapping resource:', { title: resource.title, subject: resource.subject, subjectLower });
      
      const tunisianSubject = TUNISIAN_SUBJECTS.find(ts =>
        ts.keywords.some(keyword => subjectLower.includes(keyword.toLowerCase()))
      );
      
      if (tunisianSubject) {
        console.log('[Library] Matched to:', tunisianSubject.name);
        const existing = mapped.get(tunisianSubject.id) || [];
        mapped.set(tunisianSubject.id, [...existing, resource]);
      } else {
        console.log('[Library] No match found for subject:', resource.subject);
        unmappedResources.push(resource);
      }
    });
    
    // Add unmapped resources to "other" category
    if (unmappedResources.length > 0) {
      mapped.set('other', unmappedResources);
    }
    
    console.log('[Library] Resources by subject:', Array.from(mapped.entries()).map(([id, resources]) => ({ id, count: resources.length })));
    
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
                          <span className="flex items-center gap-1">
                            {doc.author.firstName} {doc.author.lastName}
                            {doc.author.verified && <BadgeCheck className="w-4 h-4 text-green-500" />}
                            {doc.coAuthors && doc.coAuthors.length > 0 && (
                              <span className="ml-1 text-[#63b3ed]">
                                & {doc.coAuthors.length} co-author{doc.coAuthors.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </span>
                          <span>•</span><span>{doc.subject}</span><span>•</span><span>{doc.classLevel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {purchasedDocuments.has(doc.id) && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Purchased</span>
                          </div>
                        )}
                        {doc.license === "paid" && doc.price && !purchasedDocuments.has(doc.id) && (
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
                          <Eye className="w-3.5 h-3.5" />
                          {doc.type === 'Exam' || doc.resourceType === 'Exam' ? 'Open Exam' : 'View'}
                        </button>
                        {(() => {
                          const isOwner = doc.author.id === currentUserId;
                          const isPaid = doc.license === "paid";
                          const isFree = doc.license === "free";
                          const isPurchased = purchasedDocuments.has(doc.id);
                          const isExam = doc.type === 'Exam' || doc.resourceType === 'Exam';
                          
                          // Paid resource not owned and not purchased (and not an exam)
                          if (isPaid && !isPurchased && !isOwner && !isExam) {
                            const isInCart = cartItems.has(doc.id);
                            return (
                              <button 
                                onClick={() => !isInCart && addToCart(doc)} 
                                disabled={isInCart}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm ${
                                  isInCart 
                                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default' 
                                    : 'bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white hover:from-[#4299e1] hover:to-[#3182ce]'
                                }`}
                              >
                                {isInCart ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Added to Cart
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Add to Cart
                                  </>
                                )}
                              </button>
                            );
                          } else if (isFree && !isPurchased && !isOwner) {
                            // Free resource not yet added to library
                            return (
                              <button 
                                onClick={async () => {
                                  try {
                                    const token = authService.getToken();
                                    const response = await fetch(
                                      `${API_URL}/student/add-free-resource/${doc.id}`,
                                      {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${token}` },
                                      }
                                    );
                                    const data = await response.json();
                                    if (!response.ok) throw new Error(data.message);
                                    
                                    if (data.alreadyAdded) {
                                      toast.success('Already in your library!');
                                    } else {
                                      toast.success('Added to your library!');
                                      fetchPurchasedDocuments(); // Refresh
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Failed to add resource');
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium hover:from-green-600 hover:to-emerald-600 transition-colors shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Add to Library
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
                                <Download className="w-3.5 h-3.5" />
                                {isExam ? 'Open' : 'Download'}
                              </button>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.type}</span>
                      {(doc.type === 'Exam' || doc.resourceType === 'Exam') && (doc as any).questions?.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM2 10a8 8 0 1116 0 8 8 0 01-16 0z"/>
                            <path d="M10 6a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm0 7a1 1 0 100 2 1 1 0 000-2z"/>
                          </svg>
                          Interactive Mode
                        </span>
                      )}
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
          <ResourceDetailModal resource={{ id: selectedResource.id, title: selectedResource.title, author: `${selectedResource.author.firstName} ${selectedResource.author.lastName}`, type: selectedResource.type, subject: selectedResource.subject, level: selectedResource.classLevel, rating: selectedResource.averageRating, verified: selectedResource.author.verified, fileUrl: selectedResource.storageUrl, fileName: selectedResource.originalName, views: selectedResource.views, downloads: selectedResource.downloads }} isOpen={!!selectedResource} onClose={() => { setSelectedResource(null); fetchResources(); }} onDataChanged={fetchResources} />
        )}
        {selectedExamId && (
          <ExamViewerModal examId={selectedExamId} isOpen={!!selectedExamId} onClose={() => setSelectedExamId(null)} />
        )}
      </div>
    );
  }

  // Subject cards view
  return (
    <div>
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">Marketplace</h1>
        <p className="text-sm text-[#8899bb] mt-1">Browse and purchase educational resources</p>
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
