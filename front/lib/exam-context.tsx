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

interface ExamState {
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
  setTitle: (title: string) => void;
  setClassLevel: (level: EducationLevel | "") => void;
  setSubject: (subject: string) => void;
  setDuration: (duration: string) => void;
  setInstructions: (instructions: string) => void;
  setTemplateId: (templateId: string | null) => void;
  setMaxPoints: (maxPoints: number | null) => void;
  addQuestion: (question: Question) => void;
  removeQuestion: (id: string) => void;
  reorderQuestions: (activeId: string, overId: string) => void;
  duplicateQuestion: (id: string) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  clearExam: () => void;
  isQuestionAdded: (id: string) => boolean;
  totalPoints: number;
  validationErrors: Record<string, string[]>;
  canAddQuestion: (points: number) => boolean;
  pointsRemaining: number;
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved draft after mount (avoids SSR/client hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExam(JSON.parse(raw) as ExamState);
    } catch {}
  }, []);

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

  const setTitle = useCallback((title: string) => setExam((p) => ({ ...p, title })), []);
  const setClassLevel = useCallback((classLevel: EducationLevel | "") => setExam((p) => ({ ...p, classLevel })), []);
  const setSubject = useCallback((subject: string) => setExam((p) => ({ ...p, subject })), []);
  const setDuration = useCallback((duration: string) => setExam((p) => ({ ...p, duration })), []);
  const setInstructions = useCallback(
    (instructions: string) => setExam((p) => ({ ...p, instructions })),
    []
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
    (q: Question) =>
      setExam((p) =>
        p.questions.some((x) => x.id === q.id) ? p : { ...p, questions: [...p.questions, q] }
      ),
    []
  );

  const removeQuestion = useCallback(
    (id: string) =>
      setExam((p) => ({ ...p, questions: p.questions.filter((q) => q.id !== id) })),
    []
  );

  const reorderQuestions = useCallback((activeId: string, overId: string) => {
    setExam((p) => {
      const from = p.questions.findIndex((q) => q.id === activeId);
      const to = p.questions.findIndex((q) => q.id === overId);
      if (from < 0 || to < 0 || from === to) return p;
      const arr = [...p.questions];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return { ...p, questions: arr };
    });
  }, []);

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
      
      const idx = p.questions.findIndex((q) => q.id === id);
      const clone: Question = { ...src, id: `${src.id}_dup_${Date.now()}` };
      const arr = [...p.questions];
      arr.splice(idx + 1, 0, clone);
      return { ...p, questions: arr };
    });
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setExam((p) => ({
      ...p,
      questions: p.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
  }, []);

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
