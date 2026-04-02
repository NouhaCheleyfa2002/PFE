"use client";

import React from "react";
import { BookOpen, FileText, Sparkles, Star, Upload, Library, Check } from "lucide-react";

/* ── Icon mapping ── */
const ICON_MAP: Record<string, React.ReactNode> = {
  bookOpen: <BookOpen className="w-6 h-6" />,
  fileText: <FileText className="w-6 h-6" />,
  sparkles: <Sparkles className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  upload: <Upload className="w-5 h-5" />,
  library: <Library className="w-5 h-5" />,
  check: <Check className="w-6 h-6" />,
};

/* ── Stats cards data ── */
const STATS = [
  { icon: "bookOpen", label: "Total Questions", value: "12,456", change: "+234", trend: "up" },
  { icon: "fileText", label: "My Courses", value: "18", change: "+2", trend: "up" },
  { icon: "sparkles", label: "Exams Created", value: "7", change: "+1", trend: "up" },
  { icon: "star", label: "Average Rating", value: "4.8", change: "+0.2", trend: "up" },
];

/* ── Quick actions ── */
const QUICK_ACTIONS = [
  { icon: "upload", label: "Upload Course", desc: "Add PDFs, PPTX, or videos", href: "/dashboard/upload" },
  { icon: "sparkles", label: "Create Exam", desc: "Build a new assessment", href: "/dashboard/exam-builder" },
  { icon: "library", label: "Browse Library", desc: "Find resources from colleagues", href: "/dashboard/library" },
];

/* ── Recent activity mock data ── */
const RECENT_ACTIVITY = [
  { type: "upload", title: "Cardiology QCM Pack", time: "2 hours ago", icon: "fileText" },
  { type: "exam", title: "Neurology Final Exam 2026", time: "Yesterday", icon: "sparkles" },
  { type: "rating", title: "5-star rating on Pediatrics Notes", time: "2 days ago", icon: "star" },
  { type: "upload", title: "Surgery Case Studies", time: "3 days ago", icon: "fileText" },
];

/* ── Component ── */
export default function DashboardPage() {
  return (
    <div className="space-y-7">
      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
          Welcome back, Dr. Amira
        </h1>
        <p className="text-[14px] text-[#8899bb] mt-1">
          Here's what's happening with your resources today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#63b3ed]">{ICON_MAP[stat.icon]}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0d1b3e]">{stat.value}</p>
            <p className="text-xs text-[#8899bb] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-lg font-semibold text-[#0d1b3e] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="group flex items-center gap-4 bg-white rounded-xl border border-[#edf0f7] p-5 hover:border-[#63b3ed] hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] group-hover:bg-[rgba(99,179,237,0.1)] transition-colors">
                {ICON_MAP[action.icon]}
              </div>
              <div>
                <p className="font-semibold text-[#0d1b3e] group-hover:text-[#63b3ed] transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-[#8899bb]">{action.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-[#edf0f7] p-5">
          <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-base font-semibold text-[#0d1b3e] mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f4f6fc] last:border-0">
                <div className="w-9 h-9 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed]">
                  {ICON_MAP[item.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0d1b3e] truncate">{item.title}</p>
                  <p className="text-xs text-[#aab4cc]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification status */}
        <div className="bg-gradient-to-br from-[#0d1b3e] to-[#1a2d5a] rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Check className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-lg font-semibold mb-1">
                Profile Verified
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Your educator status has been verified. You have full access to all platform features including the AI exam generator.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Verified Educator
            </span>
            <span className="text-xs text-white/50">Since March 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
