"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Question } from "@/lib/types/question";

interface ExamState {
  title: string;
  duration: string;
  instructions: string;
  questions: Question[];
}

interface ExamContextType {
  exam: ExamState;
  setTitle: (title: string) => void;
  setDuration: (duration: string) => void;
  setInstructions: (instructions: string) => void;
  addQuestion: (question: Question) => void;
  removeQuestion: (id: string) => void;
  clearExam: () => void;
  isQuestionAdded: (id: string) => boolean;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const initialState: ExamState = {
  title: "Untitled Exam",
  duration: "",
  instructions: "",
  questions: [],
};

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExam] = useState<ExamState>(initialState);

  const setTitle = useCallback((title: string) => {
    setExam((prev) => ({ ...prev, title }));
  }, []);

  const setDuration = useCallback((duration: string) => {
    setExam((prev) => ({ ...prev, duration }));
  }, []);

  const setInstructions = useCallback((instructions: string) => {
    setExam((prev) => ({ ...prev, instructions }));
  }, []);

  const addQuestion = useCallback((question: Question) => {
    setExam((prev) => {
      if (prev.questions.some((q) => q.id === question.id)) return prev;
      return { ...prev, questions: [...prev.questions, question] };
    });
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setExam((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  }, []);

  const clearExam = useCallback(() => {
    setExam(initialState);
  }, []);

  const isQuestionAdded = useCallback(
    (id: string) => exam.questions.some((q) => q.id === id),
    [exam.questions]
  );

  return (
    <ExamContext.Provider
      value={{ exam, setTitle, setDuration, setInstructions, addQuestion, removeQuestion, clearExam, isQuestionAdded }}
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
