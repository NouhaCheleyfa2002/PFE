"use client";

import React, { useState } from "react";
import {
  Plus,
  X,
  CheckSquare,
  AlignLeft,
  MessageSquare,
  List,
  LayoutList,
  Grid2X2,
} from "lucide-react";
import { Question, QuestionType } from "@/lib/types/question";
import { useExam } from "@/lib/exam-context";

interface Template {
  type: QuestionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  defaults: () => Partial<Question>;
}

const TEMPLATES: Template[] = [
  {
    type: "mcq",
    label: "Multiple Choice",
    description: "4 options A–D",
    icon: <List className="w-5 h-5" />,
    color: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    defaults: () => ({
      options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
      ],
      correctAnswer: "",
    }),
  },
  {
    type: "true_false",
    label: "True / False",
    description: "Binary choice",
    icon: <CheckSquare className="w-5 h-5" />,
    color: "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
    defaults: () => ({ correctAnswer: "" }),
  },
  {
    type: "open",
    label: "Short Answer",
    description: "Open response",
    icon: <AlignLeft className="w-5 h-5" />,
    color: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
    defaults: () => ({ lines: 4 }),
  },
  {
    type: "open",
    label: "Essay",
    description: "Long-form response",
    icon: <MessageSquare className="w-5 h-5" />,
    color: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
    defaults: () => ({ lines: 10 }),
  },
  {
    type: "fill_blank",
    label: "Fill in Blank",
    description: "______ completion",
    icon: <LayoutList className="w-5 h-5" />,
    color: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    defaults: () => ({ text: "Complete this sentence: ______" }),
  },
  {
    type: "match",
    label: "Matching",
    description: "Column A ↔ B",
    icon: <Grid2X2 className="w-5 h-5" />,
    color: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    defaults: () => ({
      matchPairs: [
        { left: "", right: "" },
        { left: "", right: "" },
        { left: "", right: "" },
      ],
    }),
  },
];

function makeQuestion(template: Template): Question {
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const defaults = template.defaults();
  return {
    id,
    type: template.type,
    text: (defaults as Question).text ?? "",
    category: "Custom",
    difficulty: 5,
    points: 1,
    ...defaults,
  };
}

export default function QuestionCreator() {
  const [open, setOpen] = useState(false);
  const { addQuestion } = useExam();

  const handleSelect = (template: Template) => {
    addQuestion(makeQuestion(template));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl border-2 border-dashed border-[#c5d0e8] text-[#6b7a99] text-sm font-medium hover:border-[#4a90d9] hover:text-[#0d1b3e] hover:bg-[#f0f7ff] transition-all group"
      >
        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Add question
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* popup */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#e8edf5] p-5 w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0d1b3e]">
                  Choose question type
                </h4>
                <p className="text-xs text-[#8899bb] mt-0.5">
                  Select a template to add instantly
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-[#aab4cc] hover:text-[#0d1b3e] hover:bg-[#f5f7fc] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={`${t.type}-${t.label}`}
                  onClick={() => handleSelect(t)}
                  className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all ${t.color}`}
                >
                  {t.icon}
                  <span className="text-xs font-semibold leading-tight">
                    {t.label}
                  </span>
                  <span className="text-[10px] opacity-60 leading-tight">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
