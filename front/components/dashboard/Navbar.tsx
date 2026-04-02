"use client";


import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ICONS } from "@/components/icons";

const NOTIFICATIONS = [
  { icon: "sparkles", text: "Dr. Karim uploaded Neurology QCM Pack", time: "2m ago",  unread: true  },
  { icon: "star", text: "Your Cardio Exam received a 5-star rating", time: "1h ago",  unread: true  },
  { icon: "check", text: "Profile verified successfully",             time: "2h ago", unread: false },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/library": "Library",
  "/dashboard/resources": "My Resources",
  "/dashboard/upload": "Upload Course",
  "/dashboard/exam-builder": "Exam Builder",
  "/dashboard/ai-generator": "AI Generator",
  "/dashboard/questions": "Question Bank",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

export default function Navbar() {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;
  const pageTitle = PAGE_TITLES[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-7 bg-white border-b border-[#edf0f7] gap-5">

      {/* ── Left: page title + search ── */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <h1
          style={{ fontFamily: "var(--font-heading), sans-serif" }}
          className="text-[18px] font-bold text-[#0d1b3e] whitespace-nowrap"
        >
          {pageTitle}
        </h1>

        {/* search */}
        <div className="relative max-w-95 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aab4cc] text-[15px] pointer-events-none select-none">
            <ICONS.search className="w-4 h-4" />
          </span>
          <input
            type="search"
            placeholder="Search courses, exams, questions…"
            className="w-full pl-9 pr-14 py-2.5 rounded-[10px] border-[1.5px] border-[#edf0f7] bg-[#f6f8ff]
                       text-[13.5px] text-[#0d1b3e] placeholder:text-[#aab4cc] outline-none
                       focus:border-[#63b3ed] focus:bg-white focus:ring-2 focus:ring-[rgba(99,179,237,0.12)]
                       transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#edf0f7] font-mono text-[10px] text-[#aab4cc] pointer-events-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* upload CTA */}
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] bg-[#0d1b3e] text-[#f0f4ff]
                     text-[13px] font-semibold hover:bg-[#1a2d5a] hover:-translate-y-px
                     hover:shadow-[0_4px_14px_rgba(13,27,62,0.22)] transition-all"
        >
          ↑ Upload Course
        </Link>

        {/* notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9.5 h-9.5 flex items-center justify-center rounded-[9px]
                       border-[1.5px] border-[#edf0f7] bg-white text-[16px] text-[#7a8aaa]
                       hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[rgba(99,179,237,0.06)] transition-all"
          >
            <ICONS.bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {/* dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-75 bg-white border border-[#edf0f7] rounded-2xl shadow-[0_12px_40px_rgba(13,27,62,0.12)] overflow-hidden z-50">
              {/* header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#edf0f7]">
                <span style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[14px] font-bold text-[#0d1b3e]">
                  Notifications
                </span>
                <button className="text-[11px] text-[#63b3ed] font-semibold hover:underline">
                  Mark all read
                </button>
              </div>

              {/* items */}
              {NOTIFICATIONS.map((n, i) => {
                const Icon = ICONS[n.icon as keyof typeof ICONS];
                return (
                  <div
                    key={i}
                    className={[
                      "flex items-start gap-3 px-4 py-3 border-b border-[#f4f6fc] cursor-pointer transition-colors",
                      n.unread ? "bg-[rgba(99,179,237,0.04)] hover:bg-[rgba(99,179,237,0.08)]" : "hover:bg-[#f9faff]",
                    ].join(" ")}
                  >
                    <div className="w-8 h-8 rounded-[8px] bg-[rgba(99,179,237,0.1)] flex items-center justify-center text-[13px] shrink-0">
                      {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[12.5px] text-[#4a5568] leading-relaxed">{n.text}</p>
                      <p className="text-[11px] text-[#aab4cc] mt-0.5">{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* help */}
        <button className="w-9.5 h-9.5 flex items-center justify-center rounded-[9px]
                           border-[1.5px] border-[#edf0f7] bg-white text-[14px] font-semibold text-[#7a8aaa]
                           hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[rgba(99,179,237,0.06)] transition-all">
          ?
        </button>

        {/* avatar */}
        <button className="w-9 h-9 rounded-[9px] bg-linear-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-[12px] font-bold text-white border-0 cursor-pointer hover:opacity-85 transition-opacity">
          DA
        </button>
      </div>
    </header>
  );
}