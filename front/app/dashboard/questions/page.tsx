"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, BookOpen, GraduationCap, FlaskConical, Globe, Calculator, Code, Palette, TrendingUp, FileText, Filter, Edit2, Trash2, Save, X as XIcon, Image as ImageIcon, BarChart2, Table as TableIcon, Scissors } from "lucide-react";
import { authService } from "@/lib/auth";
import { EDUCATION_LEVELS, EducationLevel, getSubjectsForLevel } from "@/lib/education-config";
import VisualContentViewer from "@/components/VisualContentViewer";
import ManualDiagramSelector from "@/components/ManualDiagramSelector";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface QuestionFormData {
  id: string;
  text: string;
  subject: string;
  difficulty: number;
  source: string;
  isPublic: boolean;
  level: string;
  category: string;
  createdAt: string;
  documentId?: string;
  options?: string[];
  correctAnswer?: string | null;
  questionType?: string;
  topic?: string;
  hasVisualContent?: boolean;
  visualContentType?: string | null;
  visualContextKeywords?: string[] | null;
  pageNumber?: number | null;
  visualContent?: {
    context: string;
    pageNumber: number;
    hasImages: boolean;
    imageCount: number;
    images?: any[];
    aiSummary?: string;
    aiDescription?: string;
    documentUrl?: string;
    sourceType?: string; // 'AI' or 'USER_SELECTION'
    extractionMethod?: string; // 'ai-detection' or 'manual-upload'
  } | null;
  documentUrl?: string | null; // Store separately for easy access
}

interface EditFormData {
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  topic: string;
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
    id: "svt",
    name: "SVT",
    arabicName: "علوم الحياة والأرض",
    icon: GraduationCap,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    keywords: ["svt", "biology", "biologie", "geology", "geologie", "life sciences", "earth sciences", "أحياء", "علوم", "science vie", "science terre"],
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

export default function QuestionsPage() {
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionFormData[]>([]);
  const [loadingExtracted, setLoadingExtracted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<EducationLevel | "All">("All");
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    questionText: "",
    questionType: "open",
    options: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "intermediate",
    topic: "",
  });
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [loadingVisualContent, setLoadingVisualContent] = useState<Set<string>>(new Set());
  const [expandedVisualContent, setExpandedVisualContent] = useState<Set<string>>(new Set());
  const [manualSelectorOpen, setManualSelectorOpen] = useState<string | null>(null);

  // Parse visualContentRef JSON to get pre-extracted diagrams or diagram metadata
  const parseVisualContentRef = (visualContentRef: string, documentUrl?: string) => {
    try {
      const parsed = JSON.parse(visualContentRef);
      
      // Check if diagrams were already extracted
      if (parsed.diagrams && Array.isArray(parsed.diagrams) && parsed.diagrams.length > 0) {
        return {
          context: parsed.context || '',
          pageNumber: parsed.pageNumber || 1,
          images: parsed.diagrams,
          hasImages: true,
          imageCount: parsed.diagrams.length,
          documentUrl: documentUrl,
          sourceType: parsed.sourceType || 'AI', // 'AI' or 'USER_SELECTION'
          extractionMethod: parsed.extractionMethod || 'ai-detection', // 'ai-detection' or 'manual-upload'
        };
      }
      
      // Check if we have diagram region metadata (when rendering failed but AI detected location)
      if (parsed.diagramRegion && parsed.documentUrl) {
        return {
          context: parsed.context || '',
          pageNumber: parsed.pageNumber || 1,
          images: [],
          hasImages: false,
          imageCount: 0,
          documentUrl: parsed.documentUrl,
          diagramRegion: parsed.diagramRegion, // {x, y, width, height percentages}
          needsRendering: true,
        };
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Fetch complete visual content with images and AI summary
  const fetchCompleteVisualContent = async (questionId: string) => {
    const token = authService.getToken();
    if (!token) return null;

    try {
      setLoadingVisualContent(prev => new Set(prev).add(questionId));
      
      const response = await fetch(`${API_URL}/exam-questions/${questionId}/visual-content-complete`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.visualContent) {
          const visualContent = {
            context: data.visualContent.contextText || '',
            pageNumber: data.visualContent.pageNumber,
            images: data.visualContent.images || [],
            aiSummary: data.visualContent.aiSummary,
            aiDescription: data.visualContent.aiDescription,
            hasImages: data.visualContent.images && data.visualContent.images.length > 0,
            imageCount: data.visualContent.images ? data.visualContent.images.length : 0,
            documentUrl: data.visualContent.documentUrl, // Add document URL for PDF viewer
          };
          
          // Update the question with complete visual content
          setExtractedQuestions(prev =>
            prev.map(q => q.id === questionId ? { ...q, visualContent } : q)
          );
          
          // Expand the visual content section
          setExpandedVisualContent(prev => new Set(prev).add(questionId));
          
          return visualContent;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch complete visual content:', error);
      return null;
    } finally {
      setLoadingVisualContent(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  // Fetch extracted questions from exam documents
  useEffect(() => {
    const fetchExtractedQuestions = async () => {
      const token = authService.getToken();
      if (!token) {
        console.log('[QuestionBank] No auth token found');
        return;
      }

      setLoadingExtracted(true);
      try {
        console.log('[QuestionBank] Fetching ALL extracted questions');
        const response = await fetch(`${API_URL}/exam-questions?limit=10000`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[QuestionBank] Total questions fetched:', data.questions?.length || 0);
          console.log('[QuestionBank] Questions from documents:', data.total);
          
          const extracted = (data.questions || []).map((q: any) => ({
            id: q.id,
            text: q.questionText || q.text || 'No text',
            subject: q.topic || "Unknown",
            difficulty: 
              q.difficulty === "beginner" ? 3 :
              q.difficulty === "intermediate" ? 6 :
              q.difficulty === "advanced" ? 9 : 5,
            source: "Exam Extraction",
            isPublic: q.status === "approved",
            level: q.document?.classLevel || "Unknown",
            category: 
              q.questionType === "mcq" ? "MCQ" :
              q.questionType === "true_false" ? "T/F" :
              q.questionType === "open" ? "Open" :
              q.questionType === "fill_blank" ? "Fill" :
              q.questionType === "match" ? "Match" :
              q.questionType === "image" ? "Image" : "Open",
            createdAt: new Date(q.createdAt).toISOString().split('T')[0],
            documentId: q.documentId,
            options: q.options || [],
            correctAnswer: q.correctAnswer || null,
            questionType: q.questionType || "open",
            topic: q.topic || "Unknown",
            hasVisualContent: q.hasVisualContent || false,
            visualContentType: q.visualContentType || null,
            visualContextKeywords: q.visualContextKeywords || null,
            pageNumber: q.pageNumber || null,
            // Parse extracted diagrams from visualContentRef
            visualContent: q.visualContentRef ? parseVisualContentRef(q.visualContentRef, q.document?.storageUrl) : null,
            // Store document URL separately for manual selection
            documentUrl: q.document?.storageUrl || null,
          }));
          
          console.log('[QuestionBank] Mapped questions:', extracted.length);
          console.log('[QuestionBank] Sample questions:', extracted.slice(0, 3));
          setExtractedQuestions(extracted);
        } else {
          console.error('[QuestionBank] Failed to fetch, status:', response.status);
        }
      } catch (error) {
        console.error('[QuestionBank] Failed to fetch extracted questions:', error);
      } finally {
        setLoadingExtracted(false);
      }
    };

    fetchExtractedQuestions();
  }, []);

  // Edit question - comprehensive editing
  const handleEditQuestion = (question: QuestionFormData) => {
    setEditingQuestion(question.id);
    
    // Map difficulty number to string
    const difficultyStr = 
      question.difficulty <= 3 ? "beginner" :
      question.difficulty <= 6 ? "intermediate" : "advanced";
    
    setEditFormData({
      questionText: question.text,
      questionType: question.questionType || "open",
      options: question.options && question.options.length > 0 
        ? question.options 
        : ["", "", "", ""],
      correctAnswer: question.correctAnswer || "",
      difficulty: difficultyStr,
      topic: question.topic || question.subject,
    });
  };

  const handleSaveEdit = async (questionId: string) => {
    const token = authService.getToken();
    if (!token) return;

    // Validation
    if (!editFormData.questionText.trim()) {
      alert('Question text cannot be empty');
      return;
    }

    // For MCQ, validate options and correct answer
    if (editFormData.questionType === 'mcq') {
      const filledOptions = editFormData.options.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        alert('MCQ questions must have at least 2 options');
        return;
      }
      if (!editFormData.correctAnswer.trim()) {
        alert('Please select or enter the correct answer for MCQ');
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/exam-questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText: editFormData.questionText,
          questionType: editFormData.questionType,
          options: editFormData.questionType === 'mcq' || editFormData.questionType === 'true_false'
            ? editFormData.options.filter(opt => opt.trim())
            : null,
          correctAnswer: editFormData.correctAnswer.trim() || null,
          difficulty: editFormData.difficulty,
          topic: editFormData.topic,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        const updated = updatedData.question;
        
        // Update local state
        setExtractedQuestions(prev =>
          prev.map(q => q.id === questionId ? {
            ...q,
            text: editFormData.questionText,
            subject: editFormData.topic,
            topic: editFormData.topic,
            difficulty: 
              editFormData.difficulty === "beginner" ? 3 :
              editFormData.difficulty === "intermediate" ? 6 : 9,
            category: 
              editFormData.questionType === "mcq" ? "MCQ" :
              editFormData.questionType === "true_false" ? "T/F" :
              editFormData.questionType === "open" ? "Open" :
              editFormData.questionType === "fill_blank" ? "Fill" :
              editFormData.questionType === "match" ? "Match" :
              editFormData.questionType === "image" ? "Image" : "Open",
            questionType: editFormData.questionType,
            options: editFormData.options.filter(opt => opt.trim()),
            correctAnswer: editFormData.correctAnswer || null,
          } : q)
        );
        setEditingQuestion(null);
      } else {
        const error = await response.json();
        alert(`Failed to update question: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update question:', error);
      alert('Failed to update question. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditFormData({
      questionText: "",
      questionType: "open",
      options: ["", "", "", ""],
      correctAnswer: "",
      difficulty: "intermediate",
      topic: "",
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editFormData.options];
    newOptions[index] = value;
    setEditFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setEditFormData(prev => ({
      ...prev,
      options: [...prev.options, ""]
    }));
  };

  const removeOption = (index: number) => {
    if (editFormData.options.length <= 2) {
      alert('MCQ questions must have at least 2 options');
      return;
    }
    setEditFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Delete question (soft delete)
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    setDeletingQuestion(questionId);
    try {
      const response = await fetch(`${API_URL}/exam-questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Remove from local state
        setExtractedQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    } finally {
      setDeletingQuestion(null);
    }
  };

  // Filter questions by selected level FIRST, then map to subjects
  const levelFilteredQuestions = useMemo(() => {
    if (levelFilter === "All") {
      return extractedQuestions;
    }
    return extractedQuestions.filter(q => q.level === levelFilter);
  }, [extractedQuestions, levelFilter]);

  // Map LEVEL-FILTERED questions to Tunisian subjects
  const questionsBySubject = useMemo(() => {
    const mapped = new Map<string, QuestionFormData[]>();

    levelFilteredQuestions.forEach(question => {
      const subjectLower = question.subject.toLowerCase();
      
      // Find matching Tunisian subject
      const tunisianSubject = TUNISIAN_SUBJECTS.find(ts =>
        ts.keywords.some(keyword => subjectLower.includes(keyword.toLowerCase()))
      );

      if (tunisianSubject) {
        const existing = mapped.get(tunisianSubject.id) || [];
        mapped.set(tunisianSubject.id, [...existing, question]);
      }
    });

    return mapped;
  }, [levelFilteredQuestions]);

  // Get available subjects - show subjects that have questions for the selected level
  const availableSubjects = useMemo(() => {
    // Filter subjects that have at least one question in the current level filter
    return TUNISIAN_SUBJECTS.filter(subject => {
      const questionCount = questionsBySubject.get(subject.id)?.length || 0;
      return questionCount > 0;
    });
  }, [questionsBySubject]);

  // Filter questions for selected subject
  const filteredQuestions = useMemo(() => {
    if (!selectedSubject) return [];
    return questionsBySubject.get(selectedSubject) || [];
  }, [selectedSubject, questionsBySubject]);

  // Render modal at root level (works for both views)
  const renderManualSelectorModal = () => {
    if (!manualSelectorOpen) return null;

    const question = extractedQuestions.find(q => q.id === manualSelectorOpen);
    if (!question) {
      console.error('Question not found:', manualSelectorOpen);
      return null;
    }

    console.log('Opening manual selector for question:', question.id);
    console.log('Question data:', {
      hasVisualContent: question.hasVisualContent,
      pageNumber: question.pageNumber,
      documentId: question.documentId,
      documentUrl: question.documentUrl,
      visualContent: question.visualContent,
    });

    // Get document URL - try multiple sources
    const documentUrl = question.documentUrl || question.visualContent?.documentUrl;
    
    if (!documentUrl) {
      console.error('No documentUrl found');
      return (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">❌ Document URL Missing</h3>
            <p className="text-sm text-gray-600 mb-4">
              Could not find the PDF document URL. The document may not be uploaded or accessible.
            </p>
            <button
              onClick={() => setManualSelectorOpen(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (!question.pageNumber) {
      console.error('No pageNumber found');
      return (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-red-600 mb-2">❌ Page Number Missing</h3>
            <p className="text-sm text-gray-600 mb-4">
              This question does not have a page number. Cannot open PDF viewer.
            </p>
            <button
              onClick={() => setManualSelectorOpen(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    
    const token = authService.getToken();
    if (!token) return null;

    return (
      <ManualDiagramSelector
        questionId={question.id}
        questionText={question.text}
        documentUrl={documentUrl}
        pageNumber={question.pageNumber}
        authToken={token}
        onClose={() => setManualSelectorOpen(null)}
        onSuccess={() => {
          console.log('[Upload] Diagram uploaded successfully, refreshing...');
          setManualSelectorOpen(null);
          
          // Refresh the question to show updated diagram
          const fetchUpdated = async () => {
            try {
              console.log('[Refresh] Fetching updated question:', question.id);
              const response = await fetch(`${API_URL}/exam-questions/${question.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (response.ok) {
                const data = await response.json();
                const updated = data.question;
                console.log('[Refresh] Received updated question:', {
                  id: updated.id,
                  hasVisualContent: updated.hasVisualContent,
                  visualContentRef: updated.visualContentRef ? 'present' : 'missing',
                  visualContentRefLength: updated.visualContentRef?.length || 0,
                });
                
                const parsedVisualContent = updated.visualContentRef
                  ? parseVisualContentRef(updated.visualContentRef, documentUrl)
                  : null;
                
                console.log('[Refresh] Parsed visual content:', parsedVisualContent);
                
                if (!parsedVisualContent) {
                  console.error('[Refresh] Failed to parse visual content, will reload page');
                  // Fallback: reload the page to show the update
                  setTimeout(() => window.location.reload(), 1000);
                  return;
                }
                
                setExtractedQuestions(prev => {
                  const updatedQuestions = prev.map(q => q.id === question.id ? {
                    ...q,
                    hasVisualContent: true,
                    visualContentType: 'diagram',
                    visualContent: parsedVisualContent,
                  } : q);
                  console.log('[Refresh] Updated questions state, found updated question:', 
                    updatedQuestions.find(q => q.id === question.id)?.visualContent ? 'yes' : 'no');
                  return updatedQuestions;
                });
                
                // Force re-render by updating a dummy state
                console.log('[Refresh] State updated successfully');
              } else {
                console.error('[Refresh] Failed to fetch question, status:', response.status);
                // Fallback: reload the page
                setTimeout(() => window.location.reload(), 1000);
              }
            } catch (error) {
              console.error('[Refresh] Failed to refresh question:', error);
              // Fallback: reload the page
              setTimeout(() => window.location.reload(), 1000);
            }
          };
          fetchUpdated();
        }}
      />
    );
  };

  // Subject view
  if (selectedSubject) {
    const subject = TUNISIAN_SUBJECTS.find(s => s.id === selectedSubject);
    if (!subject) return null;

    const Icon = subject.icon;

    return (
      <>
        {/* Render modal */}
        {renderManualSelectorModal()}
        
        <div>
          {/* Header */}
          <div className="mb-6">
          <button
            onClick={() => setSelectedSubject(null)}
            className="flex items-center gap-2 text-[#8899bb] hover:text-[#0d1b3e] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Subjects</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
                {subject.name}
              </h1>
              <p className="text-sm text-[#8899bb] mt-1">{subject.arabicName} • {filteredQuestions.length} questions</p>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center">
              <FileText className="w-12 h-12 text-[#c0d0e8] mx-auto mb-4" />
              <p className="text-[#8899bb]">No questions found for this subject yet</p>
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {editingQuestion === q.id ? (
                      // Comprehensive Edit mode
                      <div className="mb-3 space-y-4">
                        {/* Question Text */}
                        <div>
                          <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Question Text</label>
                          <textarea
                            value={editFormData.questionText}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, questionText: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] focus:border-transparent text-[#0d1b3e] min-h-[100px] resize-y"
                            placeholder="Enter question text..."
                          />
                        </div>

                        {/* Question Type and Difficulty Row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Question Type</label>
                            <select
                              value={editFormData.questionType}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, questionType: e.target.value }))}
                              className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                            >
                              <option value="mcq">Multiple Choice (MCQ)</option>
                              <option value="true_false">True/False</option>
                              <option value="open">Open Ended</option>
                              <option value="fill_blank">Fill in the Blank</option>
                              <option value="match">Matching</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Difficulty</label>
                            <select
                              value={editFormData.difficulty}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                              className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                            >
                              <option value="beginner">Beginner (Easy)</option>
                              <option value="intermediate">Intermediate (Medium)</option>
                              <option value="advanced">Advanced (Hard)</option>
                            </select>
                          </div>
                        </div>

                        {/* Topic */}
                        <div>
                          <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Topic/Subject</label>
                          <input
                            type="text"
                            value={editFormData.topic}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, topic: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                            placeholder="e.g., Mathematics, Physics, English..."
                          />
                        </div>

                        {/* Options (for MCQ and True/False) */}
                        {(editFormData.questionType === 'mcq' || editFormData.questionType === 'true_false') && (
                          <div>
                            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                              Options {editFormData.questionType === 'true_false' && '(True/False options)'}
                            </label>
                            <div className="space-y-2">
                              {editFormData.questionType === 'true_false' ? (
                                <>
                                  <input
                                    type="text"
                                    value={editFormData.options[0] || "True"}
                                    onChange={(e) => handleOptionChange(0, e.target.value)}
                                    className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                                    placeholder="Option 1 (e.g., True)"
                                  />
                                  <input
                                    type="text"
                                    value={editFormData.options[1] || "False"}
                                    onChange={(e) => handleOptionChange(1, e.target.value)}
                                    className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                                    placeholder="Option 2 (e.g., False)"
                                  />
                                </>
                              ) : (
                                <>
                                  {editFormData.options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <span className="text-sm text-[#8899bb] w-6">{index + 1}.</span>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                                        placeholder={`Option ${index + 1}`}
                                      />
                                      {editFormData.options.length > 2 && (
                                        <button
                                          onClick={() => removeOption(index)}
                                          className="px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors text-sm"
                                          type="button"
                                        >
                                          <XIcon className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    onClick={addOption}
                                    className="mt-2 px-3 py-1.5 text-sm text-[#63b3ed] hover:bg-[#f6f8ff] rounded-lg transition-colors"
                                    type="button"
                                  >
                                    + Add Option
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Correct Answer */}
                        {(editFormData.questionType === 'mcq' || editFormData.questionType === 'true_false') && (
                          <div>
                            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">Correct Answer</label>
                            {editFormData.questionType === 'true_false' ? (
                              <select
                                value={editFormData.correctAnswer}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                              >
                                <option value="">Select correct answer...</option>
                                {editFormData.options.filter(opt => opt.trim()).map((option, index) => (
                                  <option key={index} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={editFormData.correctAnswer}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                className="w-full px-3 py-2 border border-[#edf0f7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#63b3ed] text-[#0d1b3e]"
                                placeholder="Enter the correct answer or select from options above"
                                list="options-datalist"
                              />
                            )}
                            {editFormData.questionType === 'mcq' && (
                              <datalist id="options-datalist">
                                {editFormData.options.filter(opt => opt.trim()).map((option, index) => (
                                  <option key={index} value={option} />
                                ))}
                              </datalist>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => handleSaveEdit(q.id)}
                            disabled={!editFormData.questionText.trim()}
                            className="px-4 py-2 bg-[#63b3ed] text-white rounded-lg text-sm font-medium hover:bg-[#4299e1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                          >
                            <XIcon className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div>
                        <p className="text-[#0d1b3e] mb-3 leading-relaxed">{q.text}</p>
                        
                        {/* Show extracted diagrams directly if they exist */}
                        {q.visualContent && q.visualContent.images && q.visualContent.images.length > 0 && (
                          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                📊 Extracted Diagram
                                {q.visualContent.sourceType === 'USER_SELECTION' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ User Selection</span>
                                )}
                                {q.visualContent.extractionMethod === 'ai-detection' && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"> AI Extracted</span>
                                )}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Replace clicked for question:', q.id);
                                  console.log('Has documentUrl:', !!q.visualContent?.documentUrl);
                                  console.log('Has pageNumber:', !!q.pageNumber);
                                  setManualSelectorOpen(q.id);
                                }}
                                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <Scissors className="w-3 h-3" />
                                Replace
                              </button>
                            </div>
                            <div className={`grid gap-3 ${q.visualContent.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {q.visualContent.images.map((img: any, idx: number) => (
                                <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                                  <img
                                    src={`data:${img.mimeType};base64,${img.imageData}`}
                                    alt={`Diagram ${idx + 1}`}
                                    className="w-full h-auto rounded object-contain"
                                    style={{ maxHeight: '500px' }}
                                  />
                                  <p className="text-xs text-gray-500 mt-2 text-center">
                                    {img.width} × {img.height}px {img.type ? `• ${img.type}` : ''}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Show placeholder if visual content is referenced but not extracted yet */}
                        {q.hasVisualContent && (!q.visualContent || !q.visualContent.images || q.visualContent.images.length === 0) && (
                          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {q.visualContentType === 'table' ? (
                                  <TableIcon className="w-5 h-5 text-yellow-600" />
                                ) : q.visualContentType === 'graph' || q.visualContentType === 'chart' ? (
                                  <BarChart2 className="w-5 h-5 text-yellow-600" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-yellow-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-900 mb-1">
                                  ⏳ Diagram Extraction in Progress
                                </p>
                                <p className="text-xs text-yellow-700 mb-3">
                                  This question references a <span className="font-semibold">{q.visualContentType || 'diagram'}</span> on page {q.pageNumber || '?'}.
                                  The diagram is being extracted and will appear here automatically. Please wait a moment and refresh the page.
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Select manually clicked for question:', q.id);
                                    setManualSelectorOpen(q.id);
                                  }}
                                  className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                                >
                                  <Scissors className="w-4 h-4" />
                                  Select from PDF Manually
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Add Figure button - show for questions that might need figures */}
                        {!q.hasVisualContent && q.pageNumber && (() => {
                          // Check if question text suggests it might need a figure
                          const text = q.text.toLowerCase();
                          const visualKeywords = [
                            'document', 'figure', 'schéma', 'schema', 'tableau', 'table',
                            'graphique', 'graph', 'diagramme', 'diagram', 'image',
                            'expérience', 'experience', 'résultat', 'result',
                            'ci-dessus', 'ci-dessous', 'above', 'below', 'shown', 'montré',
                            'r1', 'r2', 'r3', 'c1', 'c2', 'm1', 'm2', // symbolic references
                          ];
                          
                          const mightNeedFigure = visualKeywords.some(keyword => text.includes(keyword));
                          
                          if (!mightNeedFigure) return null;
                          
                          return (
                            <div className="mb-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Add Figure clicked for question:', q.id);
                                  setManualSelectorOpen(q.id);
                                }}
                                className="text-xs px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                              >
                                <ImageIcon className="w-4 h-4" />
                                Add Figure from PDF
                              </button>
                            </div>
                          );
                        })()}
                        
                        {/* Show options if MCQ or True/False */}
                        
                        {/* Show options if MCQ or True/False */}
                        {q.options && q.options.length > 0 && (
                          <div className="mb-3 space-y-1.5">
                            {q.options.map((option, index) => (
                              <div 
                                key={index} 
                                className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                                  option === q.correctAnswer 
                                    ? 'bg-green-50 border border-green-200 text-green-700 font-medium' 
                                    : 'bg-gray-50 text-gray-700'
                                }`}
                              >
                                <span className="font-semibold">{String.fromCharCode(65 + index)}.</span>
                                <span className="flex-1">{option}</span>
                                {option === q.correctAnswer && (
                                  <span className="text-xs bg-green-100 px-2 py-0.5 rounded">✓ Correct</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-[#8899bb] flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#f6f8ff] text-[#4a5568] font-medium">{q.category}</span>
                          <span className="px-2 py-0.5 rounded bg-[#f6f8ff] text-[#4a5568] font-medium">{q.level}</span>
                          <span>Difficulty: {q.difficulty}/10</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded ${
                            q.difficulty <= 3 ? "bg-green-100 text-green-700" :
                            q.difficulty <= 6 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {q.difficulty <= 3 ? "Easy" : q.difficulty <= 6 ? "Medium" : "Hard"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {editingQuestion !== q.id && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditQuestion(q)}
                        className="p-2 text-[#8899bb] hover:text-[#63b3ed] hover:bg-[#f6f8ff] rounded-lg transition-all"
                        title="Edit question"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        disabled={deletingQuestion === q.id}
                        className="p-2 text-[#8899bb] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete question"
                      >
                        {deletingQuestion === q.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>
    );
  }

  // Subject cards view
  return (
    <>
      {/* Render modal */}
      {renderManualSelectorModal()}
      
      <div>
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
          Question Bank
        </h1>
        <p className="text-sm text-[#8899bb] mt-1">Browse questions by subject from extracted exams</p>
      </div>

      {/* Level Filter */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-[#8899bb]">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filter by Level:</span>
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as EducationLevel | "All")}
          className="px-4 py-2 rounded-lg border border-[#edf0f7] bg-white text-[#0d1b3e] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#63b3ed] focus:border-transparent transition-all"
        >
          <option value="All">All Levels</option>
          {EDUCATION_LEVELS.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        {levelFilter !== "All" && (
          <button
            onClick={() => setLevelFilter("All")}
            className="text-xs text-[#8899bb] hover:text-[#0d1b3e] underline transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>

      {loadingExtracted ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#63b3ed]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableSubjects.map((subject) => {
            const Icon = subject.icon;
            const questionCount = questionsBySubject.get(subject.id)?.length || 0;

            return (
              <button
                key={subject.id}
                onClick={() => questionCount > 0 && setSelectedSubject(subject.id)}
                disabled={questionCount === 0}
                className={`text-left p-6 rounded-2xl border-2 transition-all ${
                  questionCount > 0
                    ? `${subject.bgColor} border-transparent hover:shadow-lg hover:scale-105 cursor-pointer`
                    : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`px-3 py-1 rounded-full ${
                    questionCount > 0
                      ? `${subject.bgColor} ${subject.textColor} font-semibold`
                      : "bg-gray-200 text-gray-500"
                  } text-sm`}>
                    {questionCount}
                  </div>
                </div>

                <h3 className={`font-bold text-lg mb-1 ${subject.textColor}`}>
                  {subject.name}
                </h3>
                <p className="text-xs text-[#8899bb] mb-3">{subject.arabicName}</p>

                {questionCount > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{questionCount} question{questionCount !== 1 ? "s" : ""} available</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    No questions yet
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loadingExtracted && extractedQuestions.length === 0 && (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center mt-6">
          <FileText className="w-16 h-16 text-[#c0d0e8] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No questions yet</h2>
          <p className="text-sm text-[#8899bb] max-w-md mx-auto">
            Questions will appear here once you upload exam documents. The AI will automatically extract and categorize them by subject.
          </p>
        </div>
      )}

      {!loadingExtracted && extractedQuestions.length > 0 && availableSubjects.length === 0 && (
        <div className="bg-white rounded-xl border border-[#edf0f7] p-12 text-center mt-6">
          <FileText className="w-16 h-16 text-[#c0d0e8] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0d1b3e] mb-2">No questions for {levelFilter}</h2>
          <p className="text-sm text-[#8899bb] max-w-md mx-auto">
            There are no extracted questions for this education level yet. Try selecting a different level or upload documents for {levelFilter}.
          </p>
        </div>
      )}
    </div>
    </>
  );
}
