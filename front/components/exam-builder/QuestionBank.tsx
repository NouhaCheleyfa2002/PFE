"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Check } from "lucide-react";
import { Question } from "@/lib/types/question";
import { useExam } from "@/lib/exam-context";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  true_false: "True/False",
  fill_blank: "Fill Blank",
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

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { addQuestion, isQuestionAdded } = useExam();

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_URL}/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setQuestions(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  const filtered = questions.filter(
    (q) =>
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-80 shrink-0 flex flex-col bg-white rounded-xl border border-[#edf0f7] overflow-hidden">
      {/* header */}
      <div className="p-4 border-b border-[#edf0f7]">
        <h3 className="text-sm font-semibold text-[#0d1b3e] mb-3">Question Bank</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aab4cc]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] transition-all"
          />
        </div>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#aab4cc]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-[#aab4cc]">No questions found</div>
        ) : (
          filtered.map((q) => {
            const added = isQuestionAdded(q.id);
            return (
              <button
                key={q.id}
                onClick={() => !added && addQuestion(q)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  added
                    ? "border-green-300 bg-green-50 cursor-default"
                    : "border-[#edf0f7] bg-[#f9faff] hover:border-[#63b3ed] hover:shadow-sm cursor-pointer"
                }`}
              >
                <p className="text-sm text-[#0d1b3e] mb-1.5 line-clamp-2">{q.text}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[q.type] || "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABELS[q.type] || q.type}
                  </span>
                  <span className="text-[11px] text-[#8899bb]">{q.category}</span>
                  <span className="text-[11px] text-[#8899bb]">•</span>
                  <span className="text-[11px] text-[#8899bb]">{q.points} pts</span>
                  <span className="ml-auto">
                    {added ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#aab4cc]" />
                    )}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
