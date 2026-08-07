"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Folder,
  Upload,
  FileEdit,
  Sparkles,
  ListChecks,
  BarChart2,
  Settings as SettingsIcon,
  ShieldCheck,
  ClipboardList,
  Users,
  LogOut,
  FileText,
  MessageSquare,
} from "lucide-react";
import { authService, User } from "@/lib/auth";

/* ── nav configs ─────────────────────────────────────────────────────────── */
const TEACHER_NAV = [
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
      { label: "Upload Resource", href: "/dashboard/upload",       icon: Upload },
      { label: "Exam Builder",  href: "/dashboard/exam-builder", icon: FileEdit },
      { label: "AI Generator",  href: "/dashboard/ai-generator", icon: Sparkles },
    ],
  },
  {
    section: "Manage",
    items: [
      { label: "Question Bank", href: "/dashboard/questions", icon: ListChecks },
      { label: "Analytics",     href: "/dashboard/analytics", icon: BarChart2 },
      { label: "Profile",       href: "/dashboard/profile",   icon: SettingsIcon },
    ],
  },
];

const ADMIN_NAV = [
  {
    section: "Overview",
    items: [
      { label: "Overview",     href: "/dashboard/admin/overview",   icon: LayoutDashboard },
    ],
  },
  {
    section: "Administration",
    items: [
      { label: "Users",        href: "/dashboard/admin/users",        icon: Users },
      { label: "Verification", href: "/dashboard/admin/verification", icon: ShieldCheck },
      { label: "Documents",    href: "/dashboard/admin/moderation",   icon: FileText },
      { label: "Ratings",      href: "/dashboard/admin/ratings-moderation", icon: MessageSquare },
      { label: "All Courses",  href: "/dashboard/library",            icon: BookOpen },
      { label: "Worker Tasks", href: "/dashboard/admin",              icon: ClipboardList },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Analytics",    href: "/dashboard/analytics",     icon: BarChart2 },
      { label: "Settings",     href: "/dashboard/settings",     icon: SettingsIcon },
    ],
  },
];

/* ── component ───────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname        = usePathname();
  const router          = useRouter();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const isAdmin = user?.role === "admin";
  const NAV     = isAdmin ? ADMIN_NAV : TEACHER_NAV;

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
        {isAdmin && <ShieldCheck className="w-5 h-5 text-[#f6ad55] shrink-0" />}
        <span
          style={{ fontFamily: "var(--font-heading), sans-serif", opacity: open ? 1 : 0, transition: "opacity 0.15s" }}
          className="text-[18px] font-black tracking-tight text-[#f0f4ff] whitespace-nowrap"
        >
          Edu<span className="text-[#63b3ed]">Share</span>
          {isAdmin && <span className="ml-1.5 text-[11px] font-semibold text-[#f6ad55]">Admin</span>}
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
                      ? isAdmin
                        ? "bg-[rgba(246,173,85,0.12)] text-[#f6ad55]"
                        : "bg-[rgba(99,179,237,0.12)] text-[#63b3ed]"
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

      {/* logout */}
      <div style={{ padding: open ? "0 16px 24px" : "0 10px 24px", transition: "padding 0.3s" }}>
        <button
          onClick={() => { authService.logout(); router.push("/auth"); }}
          style={{ paddingLeft: open ? 12 : 18, paddingRight: open ? 12 : 18, transition: "padding 0.3s" }}
          className="flex items-center gap-3 w-full py-2.5 rounded-[9px] text-sm font-medium text-[#5a7299] hover:bg-red-500/10 hover:text-red-400 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span style={{ opacity: open ? 1 : 0, transition: "opacity 0.15s" }} className="whitespace-nowrap">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}