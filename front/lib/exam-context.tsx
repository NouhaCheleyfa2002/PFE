"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { Question } from "@/lib/types/question";
import { EducationLevel } from "@/lib/education-config";
import { Socket } from "socket.io-client";

interface ExamState {
  id?: string | null;
  title: string;
  classLevel: EducationLevel | "";
  subject: string;
  duration: string;
  instructions: string;
  questions: Question[];
  templateId?: string | null;
  maxPoints?: number | null;
}

export type PreviewMode = "edit" | "student";

interface ExamContextType {
  exam: ExamState;
  savedAt: Date | null;
  isSaving: boolean;
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  setExamId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setClassLevel: (level: EducationLevel | "") => void;
  setSubject: (subject: string) => void;
  setDuration: (duration: string) => void;
  setInstructions: (instructions: string) => void;
  setTemplateId: (templateId: string | null) => void;
  setMaxPoints: (maxPoints: number | null) => void;
  addQuestion: (question: Question, skipEmit?: boolean) => void;
  removeQuestion: (id: string, skipEmit?: boolean) => void;
  reorderQuestions: (activeId: string, overId: string, skipEmit?: boolean) => void;
  duplicateQuestion: (id: string) => void;
  updateQuestion: (id: string, updates: Partial<Question>, skipEmit?: boolean) => void;
  clearExam: () => void;
  isQuestionAdded: (id: string) => boolean;
  totalPoints: number;
  validationErrors: Record<string, string[]>;
  canAddQuestion: (points: number) => boolean;
  pointsRemaining: number;
  setWebSocket: (socket: Socket | null) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const STORAGE_KEY = "exam_builder_v2";

const initialState: ExamState = {
  title: "Untitled Exam",
  classLevel: "",
  subject: "",
  duration: "",
  instructions: "",
  questions: [],
  templateId: null,
  maxPoints: null,
};

function validateQuestions(questions: Question[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  questions.forEach((q) => {
    const errs: string[] = [];
    if (q.type !== "image" && !q.text.trim()) errs.push("Question text is empty");
    if (q.type === "image" && !q.imageUrl) errs.push("Image question has no image");
    if (q.points <= 0) errs.push("Points must be greater than 0");
    if ((q.type === "mcq" || q.type === "true_false") && !q.correctAnswer)
      errs.push("No correct answer selected");
    if (errs.length) out[q.id] = errs;
  });
  return out;
}

export function ExamProvider({ children }: { children: ReactNode }) {
  // Start with initialState on both server and client to avoid hydration mismatch,
  // then load from localStorage after mount.
  const [exam, setExam] = useState<ExamState>(initialState);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const [socket, setSocket] = useState<Socket | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track remote updates to avoid echo
  const isRemoteUpdate = useRef(false);

  // Load saved draft after mount (avoids SSR/client hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw) as ExamState;
        // Don't generate ID here - it comes from database
        setExam(loaded);
      }
    } catch {}
  }, []);

  // WebSocket listeners for real-time collaboration
  useEffect(() => {
    if (!socket || !exam.id) {
      console.log('[ExamContext] WebSocket not ready:', { hasSocket: !!socket, examId: exam.id });
      return;
    }

    console.log('[ExamContext] Setting up WebSocket listeners for exam:', exam.id);

    const handleQuestionAdded = (data: any) => {
      console.log('[ExamContext] Remote question added:', data);
      isRemoteUpdate.current = true;
      setExam(prev => {
        if (prev.questions.some(q => q.id === data.question.id)) {
          return prev; // Already exists
        }
        return { ...prev, questions: [...prev.questions, data.question] };
      });
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    const handleQuestionRemoved = (data: any) => {
      console.log('[ExamContext] Remote question removed:', data);
      isRemoteUpdate.current = true;
      setExam(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== data.questionId),
      }));
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    const handleQuestionUpdated = (data: any) => {
      console.log('[ExamContext] Remote question updated:', data);
      isRemoteUpdate.current = true;
      setExam(prev => ({
        ...prev,
        questions: prev.questions.map(q =>
          q.id === data.questionId ? { ...q, ...data.changes } : q
        ),
      }));
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    const handleQuestionsReordered = (data: any) => {
      console.log('[ExamContext] Remote questions reordered:', data);
      isRemoteUpdate.current = true;
      setExam(prev => {
        const from = prev.questions.findIndex(q => q.id === data.activeId);
        const to = prev.questions.findIndex(q => q.id === data.overId);
        if (from < 0 || to < 0 || from === to) return prev;
        const arr = [...prev.questions];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return { ...prev, questions: arr };
      });
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    const handleMetadataUpdated = (data: any) => {
      console.log('[ExamContext] Remote metadata updated:', data);
      isRemoteUpdate.current = true;
      setExam(prev => ({ ...prev, [data.field]: data.value }));
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    socket.on('exam:question_added', handleQuestionAdded);
    socket.on('exam:question_removed', handleQuestionRemoved);
    socket.on('question:updated', handleQuestionUpdated);
    socket.on('exam:questions_reordered', handleQuestionsReordered);
    socket.on('exam:metadata_updated', handleMetadataUpdated);

    console.log('[ExamContext] WebSocket listeners registered');

    return () => {
      console.log('[ExamContext] Cleaning up WebSocket listeners');
      socket.off('exam:question_added', handleQuestionAdded);
      socket.off('exam:question_removed', handleQuestionRemoved);
      socket.off('question:updated', handleQuestionUpdated);
      socket.off('exam:questions_reordered', handleQuestionsReordered);
      socket.off('exam:metadata_updated', handleMetadataUpdated);
    };
  }, [socket, exam.id]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setIsSaving(true);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exam));
        setSavedAt(new Date());
      } catch {}
      setIsSaving(false);
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [exam]);

  const setTitle = useCallback((title: string) => {
    setExam((p) => {
      const next = { ...p, title };
      if (socket && p.id && !isRemoteUpdate.current) {
        console.log('[ExamContext] Emitting title update:', { examId: p.id, title });
        socket.emit('exam:update_metadata', { examId: p.id, field: 'title', value: title });
      }
      return next;
    });
  }, [socket]);

  const setExamId = useCallback((id: string | null) => setExam((p) => ({ ...p, id })), []);

  const setClassLevel = useCallback((classLevel: EducationLevel | "") => {
    setExam((p) => ({ ...p, classLevel }));
    if (socket && exam.id && !isRemoteUpdate.current) {
      socket.emit('exam:update_metadata', { examId: exam.id, field: 'classLevel', value: classLevel });
    }
  }, [socket, exam.id]);

  const setSubject = useCallback((subject: string) => {
    setExam((p) => ({ ...p, subject }));
    if (socket && exam.id && !isRemoteUpdate.current) {
      socket.emit('exam:update_metadata', { examId: exam.id, field: 'subject', value: subject });
    }
  }, [socket, exam.id]);

  const setDuration = useCallback((duration: string) => {
    setExam((p) => ({ ...p, duration }));
    if (socket && exam.id && !isRemoteUpdate.current) {
      socket.emit('exam:update_metadata', { examId: exam.id, field: 'duration', value: duration });
    }
  }, [socket, exam.id]);

  const setInstructions = useCallback(
    (instructions: string) => {
      setExam((p) => ({ ...p, instructions }));
      if (socket && exam.id && !isRemoteUpdate.current) {
        socket.emit('exam:update_metadata', { examId: exam.id, field: 'instructions', value: instructions });
      }
    },
    [socket, exam.id]
  );
  const setTemplateId = useCallback(
    (templateId: string | null) => setExam((p) => ({ ...p, templateId })),
    []
  );
  const setMaxPoints = useCallback(
    (maxPoints: number | null) => setExam((p) => ({ ...p, maxPoints })),
    []
  );

  const addQuestion = useCallback(
    (q: Question, skipEmit = false) => {
      setExam((p) => {
        if (p.questions.some((x) => x.id === q.id)) return p;
        const next = { ...p, questions: [...p.questions, q] };
        
        // Emit WebSocket event unless it's a remote update
        if (socket && p.id && !skipEmit && !isRemoteUpdate.current) {
          const questionIndex = next.questions.length - 1; // New question is at the end
          console.log('[ExamContext] Emitting add question:', { examId: p.id, questionId: q.id, questionIndex });
          socket.emit('exam:add_question', { examId: p.id, question: q, questionIndex });
        }
        
        return next;
      });
    },
    [socket]
  );

  const removeQuestion = useCallback(
    (id: string, skipEmit = false) => {
      setExam((p) => {
        const questionIndex = p.questions.findIndex((q) => q.id === id);
        const next = { ...p, questions: p.questions.filter((q) => q.id !== id) };
        
        // Emit WebSocket event unless it's a remote update
        if (socket && p.id && !skipEmit && !isRemoteUpdate.current && questionIndex !== -1) {
          console.log('[ExamContext] Emitting remove question:', { examId: p.id, questionId: id, questionIndex });
          socket.emit('exam:remove_question', { examId: p.id, questionId: id, questionIndex });
        }
        
        return next;
      });
    },
    [socket]
  );

  const reorderQuestions = useCallback((activeId: string, overId: string, skipEmit = false) => {
    setExam((p) => {
      const from = p.questions.findIndex((q) => q.id === activeId);
      const to = p.questions.findIndex((q) => q.id === overId);
      if (from < 0 || to < 0 || from === to) return p;
      const arr = [...p.questions];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      
      // Emit WebSocket event unless it's a remote update
      if (socket && p.id && !skipEmit && !isRemoteUpdate.current) {
        console.log('[ExamContext] Emitting reorder questions:', { examId: p.id, activeId, overId });
        socket.emit('exam:reorder_questions', { examId: p.id, activeId, overId });
      }
      
      return { ...p, questions: arr };
    });
  }, [socket]);

  const duplicateQuestion = useCallback((id: string) => {
    setExam((p) => {
      const src = p.questions.find((q) => q.id === id);
      if (!src) return p;
      
      // Check if duplicating would exceed max points
      if (p.maxPoints) {
        const currentTotal = p.questions.reduce((s, q) => s + (q.points || 0), 0);
        if (currentTotal + src.points > p.maxPoints) {
          // Don't duplicate - would exceed limit
          alert(`Cannot duplicate question! This would exceed the maximum points limit by ${currentTotal + src.points - p.maxPoints} pts.`);
          return p;
        }
      }
      
      // Get current user name for "Duplicated by" metadata
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      let userName = 'Unknown';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userName = payload.fullName || payload.name || payload.username || 'Unknown';
        } catch (err) {
          console.error('Failed to parse token:', err);
        }
      }
      
      const idx = p.questions.findIndex((q) => q.id === id);
      const clone: Question = { 
        ...src, 
        id: `${src.id}_dup_${Date.now()}`,
        // Reset metadata - show who duplicated it
        createdBy: userName,
        createdAt: new Date().toISOString(),
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };
      const arr = [...p.questions];
      arr.splice(idx + 1, 0, clone);
      
      // Emit WebSocket event for duplication with question index
      if (socket && p.id && !isRemoteUpdate.current) {
        const newQuestionIndex = idx + 1; // Position where clone is inserted
        console.log('[ExamContext] Emitting duplicate question:', { examId: p.id, questionId: clone.id, questionIndex: newQuestionIndex });
        socket.emit('exam:duplicate_question', { examId: p.id, question: clone, questionIndex: newQuestionIndex });
      }
      
      return { ...p, questions: arr };
    });
  }, [socket]);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>, skipEmit = false) => {
    setExam((p) => {
      const questionIndex = p.questions.findIndex((q) => q.id === id);
      const next = {
        ...p,
        questions: p.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
      };
      
      // DON'T emit question:update - it causes duplicate activity with wrong user
      // Only emit via question:saved when explicitly saving
      
      return next;
    });
  }, [socket]);

  const clearExam = useCallback(() => {
    setExam(initialState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const isQuestionAdded = useCallback(
    (id: string) => exam.questions.some((q) => q.id === id),
    [exam.questions]
  );

  const totalPoints = exam.questions.reduce((s, q) => s + (q.points || 0), 0);
  const validationErrors = validateQuestions(exam.questions);
  const pointsRemaining = exam.maxPoints ? exam.maxPoints - totalPoints : Infinity;
  const canAddQuestion = useCallback(
    (points: number) => {
      if (!exam.maxPoints) return true;
      return totalPoints + points <= exam.maxPoints;
    },
    [exam.maxPoints, totalPoints]
  );

  return (
    <ExamContext.Provider
      value={{
        exam,
        savedAt,
        isSaving,
        previewMode,
        setPreviewMode,
        setExamId,
        setTitle,
        setClassLevel,
        setSubject,
        setDuration,
        setInstructions,
        setTemplateId,
        setMaxPoints,
        addQuestion,
        removeQuestion,
        reorderQuestions,
        duplicateQuestion,
        updateQuestion,
        clearExam,
        isQuestionAdded,
        totalPoints,
        validationErrors,
        canAddQuestion,
        pointsRemaining,
        setWebSocket: setSocket,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error("useExam must be used within ExamProvider");
  return ctx;
}
