"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Check, X, Image as ImageIcon, Eye } from "lucide-react";
import { Question, QuestionType } from "@/lib/types/question";
import { useExam } from "@/lib/exam-context";
import { authService } from "@/lib/auth";
import { QUESTION_TYPE_TOOLTIPS } from "@/lib/education-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  true_false: "T/F",
  fill_blank: "Fill",
  open: "Open",
  image: "Image",
  match: "Match",
};

const TYPE_COLORS: Record<string, string> = {
  mcq: "bg-blue-100 text-blue-700",
  true_false: "bg-green-100 text-green-700",
  fill_blank: "bg-amber-100 text-amber-700",
  open: "bg-purple-100 text-purple-700",
  image: "bg-pink-100 text-pink-700",
  match: "bg-cyan-100 text-cyan-700",
};

const ALL_TYPES = ["all", "mcq", "true_false", "open", "fill_blank", "match", "image"] as const;
type FilterType = (typeof ALL_TYPES)[number];

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  mcq: "MCQ",
  true_false: "T/F",
  open: "Open",
  fill_blank: "Fill",
  match: "Match",
  image: "Image",
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<FilterType>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [diagramModalOpen, setDiagramModalOpen] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { addQuestion, isQuestionAdded, exam, canAddQuestion, pointsRemaining } = useExam();

  // Get unique subjects from questions
  const availableSubjects = useMemo(() => {
    const subjects = new Set(questions.map(q => q.subject).filter(Boolean));
    return Array.from(subjects).sort();
  }, [questions]);

  // Fetch questions from /exam-questions API
  useEffect(() => {
    const fetchQuestions = async () => {
      const token = authService.getToken();
      if (!token) {
        console.log('[QuestionBank] No auth token found');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[QuestionBank] Fetching from /exam-questions');
        const response = await fetch(`${API_URL}/exam-questions?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[QuestionBank] Questions count:', data.questions?.length || 0);
          
          // Map API questions to Question type
          const mapped: Question[] = (data.questions || []).map((q: any) => {
            // Check if question has visual content with diagrams
            let hasVisualDiagram = false;
            let diagramUrl = null;
            
            console.log('[QuestionBank] Processing question:', q.id, 'hasVisualContent:', q.hasVisualContent, 'visualContentRef present:', !!q.visualContentRef);
            
            if (q.visualContentRef) {
              try {
                // Skip if visualContentRef is just a page reference like "page:2"
                if (typeof q.visualContentRef === 'string' && q.visualContentRef.startsWith('page:')) {
                  console.log('[QuestionBank] Skipping page reference:', q.visualContentRef);
                } else {
                  const visualContent = JSON.parse(q.visualContentRef);
                  console.log('[QuestionBank] Parsed visualContent for', q.id, ':', visualContent);
                  if (visualContent.diagrams && visualContent.diagrams.length > 0) {
                    hasVisualDiagram = true;
                    const diagram = visualContent.diagrams[0];
                    diagramUrl = `data:${diagram.mimeType};base64,${diagram.imageData}`;
                    console.log('[QuestionBank] Found diagram for question', q.id);
                  }
                }
              } catch (e) {
                console.error('[QuestionBank] Failed to parse visualContentRef for', q.id, ':', e, 'Value:', q.visualContentRef);
              }
            }
            
            // If question has visual diagram, ALWAYS mark as image type regardless of original type
            const questionType = hasVisualDiagram ? "image" : (q.questionType || "open");
            
            console.log('[QuestionBank] Question', q.id, 'final type:', questionType, 'hasDiagram:', hasVisualDiagram);
            
            const baseQuestion: Question = {
              id: q.id,
              text: q.questionText || q.text || 'No text',
              type: questionType as QuestionType,
              points: q.points || 1,
              subject: q.topic || q.document?.subject || q.subject || "Unknown",
              level: q.document?.classLevel || exam.classLevel || "",
              category: q.topic || "General",
              difficulty: q.difficulty || "intermediate",
            };

            // Add type-specific fields
            if (q.questionType === "mcq" && q.options) {
              baseQuestion.options = q.options;
              baseQuestion.correctAnswer = q.correctAnswer;
            } else if (q.questionType === "true_false") {
              baseQuestion.correctAnswer = q.correctAnswer;
            } else if (q.questionType === "open" || questionType === "image") {
              baseQuestion.lines = q.lines || 4;
            } else if (q.questionType === "match" && q.matchPairs) {
              baseQuestion.matchPairs = q.matchPairs;
            }

            // Add diagram/image if present
            if (diagramUrl) {
              baseQuestion.imageUrl = diagramUrl;
              baseQuestion.imageWidth = 340;
              baseQuestion.imageAlign = "center";
              baseQuestion.imageCaption = q.visualContentRef ? "Diagram extracted from document" : undefined;
            } else if (q.imageUrl) {
              baseQuestion.imageUrl = q.imageUrl;
              baseQuestion.imageWidth = q.imageWidth || 340;
              baseQuestion.imageAlign = q.imageAlign || "center";
              baseQuestion.imageCaption = q.imageCaption;
            }

            return baseQuestion;
          });
          
          console.log('[QuestionBank] Questions mapped:', mapped.length);
          setQuestions(mapped);
        } else {
          console.error('[QuestionBank] Failed to fetch:', response.status);
        }
      } catch (error) {
        console.error('[QuestionBank] Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [exam.classLevel]);

  const filtered = questions.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(search.toLowerCase()));
    const matchesType = activeType === "all" || q.type === (activeType as QuestionType);
    const matchesSubject = subjectFilter === "all" || q.subject === subjectFilter;
    
    // Filter by selected class level if one is selected
    const matchesLevel = !exam.classLevel || q.level === exam.classLevel;
    
    return matchesSearch && matchesType && matchesSubject && matchesLevel;
  });

  const handleAddQuestion = (q: Question) => {
    if (!canAddQuestion(q.points)) {
      // Show warning toast
      setToastMessage(`Cannot add question! This would exceed the maximum points limit by ${Math.abs(pointsRemaining - q.points)} pts.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }
    addQuestion(q);
  };

  return (
    <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-[#edf0f7] overflow-hidden max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="p-4 border-b border-[#edf0f7] flex-shrink-0">
        <h3 className="text-sm font-semibold text-[#0d1b3e] mb-3">Question Bank</h3>
        
        {/* Subject Filter */}
        {availableSubjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#edf0f7] text-xs outline-none focus:border-[#63b3ed] transition-all mb-2 bg-white text-[#0d1b3e]"
          >
            <option value="all">All Subjects</option>
            {availableSubjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aab4cc]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] transition-all"
          />
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="px-3 pt-2 pb-1 border-b border-[#edf0f7] flex gap-1 flex-wrap flex-shrink-0">
        <TooltipProvider>
          {ALL_TYPES.map((t) => {
            const tooltipData = t !== "all" ? QUESTION_TYPE_TOOLTIPS[
              t === "true_false" ? "true-false" : 
              t === "fill_blank" ? "fill-blank" : 
              t === "mcq" ? "multiple-choice" : 
              t === "match" ? "matching" :
              t === "open" ? "essay" : t as keyof typeof QUESTION_TYPE_TOOLTIPS
            ] : null;
            
            const button = (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  activeType === t
                    ? "bg-[#0d1b3e] text-white"
                    : "text-[#8899bb] hover:bg-[#f0f4ff] hover:text-[#0d1b3e]"
                }`}
              >
                {FILTER_LABELS[t]}
              </button>
            );

            if (tooltipData) {
              return (
                <Tooltip key={t}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold text-[#0d1b3e] mb-1">{tooltipData.title}</p>
                    <p className="text-xs text-[#8899bb]">{tooltipData.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </TooltipProvider>
      </div>

      {/* Question count */}
      <div className="px-4 py-1.5 flex-shrink-0">
        <span className="text-[11px] text-[#aab4cc]">
          {filtered.length} question{filtered.length !== 1 && "s"}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#aab4cc]">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#aab4cc]">
            No questions found
          </div>
        ) : (
          filtered.map((q) => {
            const added = isQuestionAdded(q.id);
            const wouldExceed = !canAddQuestion(q.points);
            const canAdd = !added && !wouldExceed;
            
            return (
              <div
                key={q.id}
                className={`relative p-3 rounded-lg border transition-all ${
                  added
                    ? "border-green-300 bg-green-50"
                    : wouldExceed
                    ? "border-red-200 bg-red-50 opacity-60"
                    : "border-[#edf0f7] bg-[#f9faff] hover:border-[#63b3ed] hover:shadow-sm"
                }`}
                title={wouldExceed ? `Adding this question would exceed the points limit by ${Math.abs(pointsRemaining - q.points)} pts` : undefined}
              >
                {wouldExceed && (
                  <div className="text-xs text-red-600 mb-1 font-medium">
                    Warning: Exceeds limit by {Math.abs(pointsRemaining - q.points)} pts
                  </div>
                )}
                
                {/* View Diagram button for questions with images */}
                {q.imageUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiagramModalOpen(q.id);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs flex items-center gap-1 transition-colors z-10"
                  >
                    <Eye className="w-3 h-3" />
                    View Diagram
                  </button>
                )}
                
                {/* Clickable area to add question */}
                <div
                  onClick={() => canAdd && handleAddQuestion(q)}
                  className={canAdd ? "cursor-pointer" : "cursor-not-allowed"}
                >
                  <p className="text-sm text-[#0d1b3e] mb-1.5 line-clamp-2 pr-24">{q.text}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        TYPE_COLORS[q.type] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {TYPE_LABELS[q.type] || q.type}
                    </span>
                    <span className="text-[11px] text-[#8899bb]">{q.category}</span>
                    <span className="text-[11px] text-[#8899bb]">•</span>
                    <span className="text-[11px] text-[#8899bb]">{q.points} pts</span>
                    {q.imageUrl && (
                      <>
                        <span className="text-[11px] text-[#8899bb]">•</span>
                        <ImageIcon className="w-3 h-3 text-blue-500" />
                      </>
                    )}
                    <span className="ml-auto">
                      {added ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Plus className="w-4 h-4 text-[#aab4cc]" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Warning Toast */}
      {showToast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-md animate-slideIn"
          style={{
            backgroundColor: "#fee2e2",
            border: "2px solid #fca5a5",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-4 h-4 text-white" style={{ strokeWidth: 3 }} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Points Limit Exceeded</h4>
              <p className="text-sm text-red-700">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Diagram Modal */}
      {diagramModalOpen && (() => {
        const question = questions.find(q => q.id === diagramModalOpen);
        if (!question || !question.imageUrl) return null;
        
        return (
          <div 
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
            onClick={() => setDiagramModalOpen(null)}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Question Diagram
                </h3>
                <button
                  onClick={() => setDiagramModalOpen(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <p className="text-sm text-gray-700 mb-4 font-medium">{question.text}</p>
                <div className="flex justify-center">
                  <img 
                    src={question.imageUrl} 
                    alt="Diagram" 
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                    style={{ maxHeight: '60vh' }}
                  />
                </div>
                {question.imageCaption && (
                  <p className="text-xs text-gray-500 mt-3 text-center italic">{question.imageCaption}</p>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setDiagramModalOpen(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
