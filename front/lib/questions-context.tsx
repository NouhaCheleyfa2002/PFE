"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Question } from "./types/question";
import { authService } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface QuestionsContextType {
  questions: Question[];
  loading: boolean;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  refreshQuestions: () => Promise<void>;
}

const QuestionsContext = createContext<QuestionsContextType | null>(null);

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuestion = useCallback((question: Question) => {
    setQuestions((prev) => [question, ...prev]);
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const refreshQuestions = useCallback(async () => {
    await fetchQuestions();
  }, [fetchQuestions]);

  return (
    <QuestionsContext.Provider
      value={{
        questions,
        loading,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        refreshQuestions,
      }}
    >
      {children}
    </QuestionsContext.Provider>
  );
}

export function useQuestions() {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error("useQuestions must be used within QuestionsProvider");
  }
  return context;
}
