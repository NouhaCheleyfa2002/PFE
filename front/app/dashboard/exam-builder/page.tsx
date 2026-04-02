"use client";

import React from "react";
import { FileText, FileCheck, Bot } from "lucide-react";

export default function ExamBuilderPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
          Exam Builder
        </h1>
        <p className="text-sm text-[#8899bb] mt-1">
          Drag and drop questions to create your assessment
        </p>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Question bank sidebar */}
        <div className="w-80 shrink-0 bg-white rounded-xl border border-[#edf0f7] p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-[#0d1b3e] mb-4">Question Bank</h3>
          <input
            type="search"
            placeholder="Search questions..."
            className="w-full px-3 py-2 mb-4 rounded-lg border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] transition-all"
          />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                draggable
                className="p-3 rounded-lg border border-[#edf0f7] bg-[#f9faff] cursor-grab hover:border-[#63b3ed] hover:shadow-sm transition-all"
              >
                <p className="text-sm text-[#0d1b3e] mb-1 line-clamp-2">
                  {i === 1 && "What is the normal ejection fraction range?"}
                  {i === 2 && "Which ECG finding is pathognomonic for MI?"}
                  {i === 3 && "Describe the pathophysiology of heart failure."}
                  {i === 4 && "List the causes of dilated cardiomyopathy."}
                  {i === 5 && "What is the treatment for atrial fibrillation?"}
                </p>
                <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                  <span>Cardiology</span>
                  <span>•</span>
                  <span>Difficulty: 6/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exam workspace */}
        <div className="flex-1 bg-white rounded-xl border border-[#edf0f7] p-6">
          <div className="flex items-center justify-between mb-6">
            <input
              type="text"
              placeholder="Untitled Exam"
              className="text-xl font-bold text-[#0d1b3e] bg-transparent border-none outline-none placeholder:text-[#aab4cc]"
            />
            <div className="flex items-center gap-3 text-sm text-[#8899bb]">
              <span>0 questions</span>
              <span>•</span>
              <span>0 points</span>
              <span>•</span>
              <span>~0 min</span>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {["QCM", "Case Study", "Essay"].map((section) => (
              <div key={section} className="border-2 border-dashed border-[#edf0f7] rounded-xl p-6 text-center">
                <p className="text-sm font-medium text-[#4a5568] mb-1">{section} Section</p>
                <p className="text-xs text-[#aab4cc]">Drag questions here</p>
              </div>
            ))}
          </div>

          {/* AI Assistant */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#63b3ed]/10 to-[#a78bfa]/10 border border-[#63b3ed]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0d1b3e]">AI Assistant</p>
                <p className="text-xs text-[#8899bb]">Get suggestions or generate variants</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm font-medium hover:bg-[#1a2d5a] transition-colors">
                Suggest Questions
              </button>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-[#edf0f7] p-4">
          <h3 className="text-sm font-semibold text-[#0d1b3e] mb-4">Preview & Export</h3>
          <div className="aspect-[3/4] bg-[#f9faff] rounded-lg border border-[#edf0f7] flex items-center justify-center text-[#aab4cc] text-sm mb-4">
            Exam Preview
          </div>
          <div className="space-y-2">
            <button className="w-full py-2.5 rounded-lg border border-[#edf0f7] text-sm font-medium text-[#4a5568] hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Export PDF
            </button>
            <button className="w-full py-2.5 rounded-lg border border-[#edf0f7] text-sm font-medium text-[#4a5568] hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Export Word
            </button>
            <button className="w-full py-2.5 rounded-lg border border-[#edf0f7] text-sm font-medium text-[#4a5568] hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors flex items-center justify-center gap-2">
              <FileCheck className="w-4 h-4" /> Generate Answer Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
