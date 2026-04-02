"use client";

import React, { useState } from "react";
import { ClipboardList, Microscope, Sparkles, FileText, BadgeCheck, Star, Search } from "lucide-react";

/* ── Icon components for document types ── */
const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  "QCM": <ClipboardList className="w-6 h-6" />,
  "Case Study": <Microscope className="w-6 h-6" />,
  "Exam": <Sparkles className="w-6 h-6" />,
  "default": <FileText className="w-6 h-6" />,
};

/* ── Mock data ── */
const DOCUMENTS = [
  { id: 1, title: "Cardiology QCM Pack 2026", author: "Dr. Karim Mansouri", type: "QCM", subject: "Cardiology", level: "3rd Year", rating: 4.9, questions: 45, region: "Tunis", verified: true },
  { id: 2, title: "Neurology Case Studies", author: "Dr. Amira Ben Ali", type: "Case Study", subject: "Neurology", level: "4th Year", rating: 4.7, questions: 23, region: "Sousse", verified: true },
  { id: 3, title: "Pediatrics Revision Notes", author: "Dr. Sami Trabelsi", type: "Course Notes", subject: "Pediatrics", level: "2nd Year", rating: 4.5, questions: 0, region: "Sfax", verified: false },
  { id: 4, title: "Surgery Final Exam 2025", author: "Dr. Leila Hamdi", type: "Exam", subject: "Surgery", level: "5th Year", rating: 4.8, questions: 60, region: "Monastir", verified: true },
  { id: 5, title: "Internal Medicine MCQs", author: "Dr. Mohamed Cherif", type: "QCM", subject: "Internal Medicine", level: "3rd Year", rating: 4.6, questions: 120, region: "Tunis", verified: true },
];

const SUBJECTS = ["All", "Cardiology", "Neurology", "Pediatrics", "Surgery", "Internal Medicine", "Radiology"];
const TYPES = ["All", "QCM", "Course Notes", "Case Study", "Exam"];
const LEVELS = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Master"];
const REGIONS = ["All", "Tunis", "Sousse", "Sfax", "Monastir", "Bizerte"];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [type, setType] = useState("All");
  const [level, setLevel] = useState("All");
  const [region, setRegion] = useState("All");

  const filtered = DOCUMENTS.filter((doc) => {
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (subject !== "All" && doc.subject !== subject) return false;
    if (type !== "All" && doc.type !== type) return false;
    if (level !== "All" && doc.level !== level) return false;
    if (region !== "All" && doc.region !== region) return false;
    return true;
  });

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar filters */}
      <aside className="w-64 shrink-0 space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-3">Subject</h3>
          <div className="space-y-1">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  subject === s
                    ? "bg-[#63b3ed]/10 text-[#63b3ed] font-medium"
                    : "text-[#4a5568] hover:bg-[#f6f8ff]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-3">Type</h3>
          <div className="space-y-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  type === t
                    ? "bg-[#63b3ed]/10 text-[#63b3ed] font-medium"
                    : "text-[#4a5568] hover:bg-[#f6f8ff]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-3">Level</h3>
          <div className="space-y-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  level === l
                    ? "bg-[#63b3ed]/10 text-[#63b3ed] font-medium"
                    : "text-[#4a5568] hover:bg-[#f6f8ff]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-3">Region</h3>
          <div className="space-y-1">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  region === r
                    ? "bg-[#63b3ed]/10 text-[#63b3ed] font-medium"
                    : "text-[#4a5568] hover:bg-[#f6f8ff]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aab4cc] pointer-events-none">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="search"
              placeholder="Search by concept (e.g., 'Infarctus du myocarde')"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#edf0f7] bg-white text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all"
            />
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#8899bb]">
            <span className="font-semibold text-[#0d1b3e]">{filtered.length}</span> resources found
          </p>
          <select className="text-sm text-[#4a5568] bg-transparent border-none outline-none cursor-pointer">
            <option>Sort by: Most Relevant</option>
            <option>Sort by: Newest</option>
            <option>Sort by: Highest Rated</option>
          </select>
        </div>

        {/* Results grid */}
        <div className="grid gap-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md hover:border-[#63b3ed]/30 transition-all cursor-pointer"
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
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium shrink-0">
                      <Star className="w-3 h-3" /> {doc.rating}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.type}</span>
                    <span className="px-2 py-1 rounded-md bg-[#f6f8ff] text-xs text-[#4a5568]">{doc.region}</span>
                    {doc.questions > 0 && (
                      <span className="text-xs text-[#63b3ed]">{doc.questions} AI-extracted questions</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
