"use client";

import React, { useState } from "react";
import { ClipboardList, Microscope, Sparkles, FileText, BadgeCheck, Star, Search, Download, BookOpen } from "lucide-react";

/* ── Icon components for document types ── */
const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  "QCM": <ClipboardList className="w-6 h-6" />,
  "Case Study": <Microscope className="w-6 h-6" />,
  "Exam": <Sparkles className="w-6 h-6" />,
  "default": <FileText className="w-6 h-6" />,
};

/* ── Mock data ── */
const DOCUMENTS = [
  { id: 1, title: "Cardiology QCM Pack 2026", author: "Dr. Karim Mansouri", type: "QCM", subject: "Cardiology", level: "3rd Year", rating: 4.9, questions: 45, region: "Tunis", verified: true, free: true },
  { id: 2, title: "Neurology Case Studies", author: "Dr. Amira Ben Ali", type: "Case Study", subject: "Neurology", level: "4th Year", rating: 4.7, questions: 23, region: "Sousse", verified: true, free: true },
  { id: 3, title: "Pediatrics Revision Notes", author: "Dr. Sami Trabelsi", type: "Course Notes", subject: "Pediatrics", level: "2nd Year", rating: 4.5, questions: 0, region: "Sfax", verified: false, free: true },
  { id: 4, title: "Surgery Final Exam 2025", author: "Dr. Leila Hamdi", type: "Exam", subject: "Surgery", level: "5th Year", rating: 4.8, questions: 60, region: "Monastir", verified: true, free: false },
  { id: 5, title: "Internal Medicine MCQs", author: "Dr. Mohamed Cherif", type: "QCM", subject: "Internal Medicine", level: "3rd Year", rating: 4.6, questions: 120, region: "Tunis", verified: true, free: true },
];

const SUBJECTS = ["All", "Cardiology", "Neurology", "Pediatrics", "Surgery", "Internal Medicine", "Radiology"];
const TYPES = ["All", "QCM", "Course Notes", "Case Study", "Exam"];
const LEVELS = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Master"];

export default function StudentLibraryPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");
  const [level, setLevel] = useState("All");

  const filtered = DOCUMENTS.filter((doc) => {
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (subject !== "All" && doc.subject !== subject) return false;
    if (type !== "All" && doc.type !== type) return false;
    if (level !== "All" && doc.level !== level) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
          Resource Library
        </h1>
        <p className="text-sm text-[#8899bb] mt-1">
          Browse educational resources from verified educators
        </p>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl border border-[#edf0f7] p-6 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aab4cc] pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="search"
              placeholder="Search resources by title or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#edf0f7] bg-white text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#4a5568] outline-none focus:border-[#63b3ed] transition-all bg-white"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Subjects" : s}</option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#4a5568] outline-none focus:border-[#63b3ed] transition-all bg-white"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#4a5568] outline-none focus:border-[#63b3ed] transition-all bg-white"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l === "All" ? "All Levels" : l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-[#8899bb]">
          <span className="font-semibold text-[#0d1b3e]">{filtered.length}</span> resources found
        </p>

        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] shrink-0">
                {DOC_TYPE_ICONS[doc.type] || DOC_TYPE_ICONS.default}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#0d1b3e] mb-1">{doc.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                      <span className="flex items-center gap-1">
                        {doc.author}
                        {doc.verified && <span title="Verified Educator"><BadgeCheck className="w-4 h-4 text-green-500" /></span>}
                      </span>
                      <span>•</span>
                      <span>{doc.subject}</span>
                      <span>•</span>
                      <span>{doc.level}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium shrink-0">
                      <Star className="w-3 h-3" /> {doc.rating}
                    </div>
                    {doc.free ? (
                      <span className="px-2 py-1 rounded-lg bg-green-50 text-green-600 text-xs font-medium">Free</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium">Premium</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.type}</span>
                    {doc.questions > 0 && (
                      <span className="text-xs text-[#63b3ed]">{doc.questions} questions</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f6f8ff] text-sm text-[#4a5568] hover:bg-[#63b3ed]/10 hover:text-[#63b3ed] transition-colors">
                      <BookOpen className="w-4 h-4" /> Preview
                    </button>
                    {doc.free && (
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1b3e] text-sm text-white hover:bg-[#1a2d5a] transition-colors">
                        <Download className="w-4 h-4" /> Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
