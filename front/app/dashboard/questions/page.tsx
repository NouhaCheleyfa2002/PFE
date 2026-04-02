"use client";

import React from "react";

export default function QuestionsPage() {
  const questions = [
    { id: 1, text: "What is the normal ejection fraction range?", subject: "Cardiology", difficulty: 5, source: "Cardiology QCM Pack", isPublic: true },
    { id: 2, text: "Which ECG finding is pathognomonic for STEMI?", subject: "Cardiology", difficulty: 7, source: "ECG Masterclass", isPublic: true },
    { id: 3, text: "Describe the Cushing reflex mechanism.", subject: "Neurology", difficulty: 8, source: "Created manually", isPublic: false },
    { id: 4, text: "List 5 causes of splenomegaly.", subject: "Internal Medicine", difficulty: 4, source: "IM Finals 2025", isPublic: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
            Question Bank
          </h1>
          <p className="text-sm text-[#8899bb] mt-1">Your personal collection of questions</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1b3e] text-white text-sm font-semibold hover:bg-[#1a2d5a] transition-colors">
          + Add Question
        </button>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-[#edf0f7]">
        {["All Questions", "Cardiology", "Neurology", "Favorites"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              i === 0
                ? "border-[#63b3ed] text-[#63b3ed]"
                : "border-transparent text-[#8899bb] hover:text-[#4a5568]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[#0d1b3e] mb-2">{q.text}</p>
                <div className="flex items-center gap-3 text-xs text-[#8899bb]">
                  <span className="px-2 py-0.5 rounded bg-[#f6f8ff] text-[#4a5568]">{q.subject}</span>
                  <span>Difficulty: {q.difficulty}/10</span>
                  <span>•</span>
                  <span>From: {q.source}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  q.isPublic ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {q.isPublic ? "Public" : "Private"}
                </span>
                <button className="w-8 h-8 rounded-lg border border-[#edf0f7] flex items-center justify-center text-[#8899bb] hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors">
                  ✎
                </button>
                <button className="w-8 h-8 rounded-lg border border-[#edf0f7] flex items-center justify-center text-[#8899bb] hover:border-red-400 hover:text-red-400 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
