"use client";

import React, { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Folder,
  Upload,
  FileEdit,
  Sparkles,
  ListChecks,
  BarChart2,
  Settings as SettingsIcon
} from "lucide-react";

/* ── nav config ─────────────────────────────────────────────────────────── */
const NAV = [
  {
    section: "Main",
    items: [
      { label: "Dashboard",    href: "/dashboard",              icon: LayoutDashboard },
      { label: "Library",      href: "/dashboard/library",      icon: BookOpen },
      { label: "My Resources", href: "/dashboard/resources",    icon: Folder },
    ],
  },
  {
    section: "Create",
    items: [
      { label: "Upload Course", href: "/dashboard/upload",       icon: Upload },
      { label: "Exam Builder",  href: "/dashboard/exam-builder", icon: FileEdit },
      { label: "AI Generator",  href: "/dashboard/ai-generator", icon: Sparkles },
    ],
  },
  {
    section: "Manage",
    items: [
      { label: "Question Bank", href: "/dashboard/questions", icon: ListChecks },
      { label: "Analytics",     href: "/dashboard/analytics", icon: BarChart2 },
      { label: "Settings",      href: "/dashboard/settings",  icon: SettingsIcon },
    ],
  },
];

/* ── component ───────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname      = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <aside
      style={{ width: open ? 240 : 72, transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)" }}
      className="relative flex flex-col shrink-0 h-screen overflow-hidden bg-[#0B1120] border-r border-white/5"
    >
      {/* collapse toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute top-7 right-4 z-20 w-6 h-6 rounded-full flex items-center justify-center
                   bg-[#1a2340] border border-white/10 text-[#5a7299] text-[11px]
                   hover:bg-[#253050] hover:text-[#63b3ed] transition-colors"
      >
        {open ? "‹" : "›"}
      </button>

      {/* brand */}
      <div className="flex items-center gap-2.5 px-6 pt-7 pb-9 whitespace-nowrap">
        
        <span
          style={{ fontFamily: "var(--font-heading), sans-serif", opacity: open ? 1 : 0, transition: "opacity 0.15s" }}
          className="text-[18px] font-black tracking-tight text-[#f0f4ff] whitespace-nowrap"
        >
          Edu<span className="text-[#63b3ed]">Share</span>
        </span>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-7">
            <p
              style={{ opacity: open ? 1 : 0, transition: "opacity 0.15s" }}
              className="px-6 mb-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#3a4a6a] whitespace-nowrap"
            >
              {section}
            </p>

            {items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{ paddingLeft: open ? 24 : 18, paddingRight: open ? 24 : 18, transition: "padding 0.3s" }}
                  className={[
                    "flex items-center gap-3 py-2.5 mx-2 rounded-[9px] text-sm font-medium whitespace-nowrap transition-colors duration-150",
                    active
                      ? "bg-[rgba(99,179,237,0.12)] text-[#63b3ed]"
                      : "text-[#5a7299] hover:bg-white/5 hover:text-[#d0dff7]",
                  ].join(" ")}
                >
                  <span className="w-5 h-5 flex items-center justify-center text-[15px] shrink-0">
                    {Icon && <Icon className="w-5 h-5" />}
                  </span>
                  <span style={{ opacity: open ? 1 : 0, transition: "opacity 0.15s" }} className="whitespace-nowrap">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* user card */}
      <div style={{ padding: open ? "0 16px 24px" : "0 10px 24px", transition: "padding 0.3s" }}>
        <div className="flex items-center gap-2.5 p-3 rounded-[10px] bg-white/4 border border-white/6 cursor-pointer hover:bg-white/[0.07] transition-colors whitespace-nowrap">
          <div className="w-8 h-8 rounded-[8px] bg-linear-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center text-xs font-bold text-white shrink-0">
            DA
          </div>
          <div style={{ opacity: open ? 1 : 0, transition: "opacity 0.15s" }} className="overflow-hidden">
            <p className="text-[13px] font-semibold text-[#d0dff7] truncate">Dr. Amira Ben Ali</p>
            <div className="flex items-center gap-1 text-[11px] text-[#3d8b3d] mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#48bb78] shrink-0" />
              Verified Educator
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}