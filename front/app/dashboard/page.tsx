"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Sparkles, Star, Upload, Library, Check, AlertCircle, Clock } from "lucide-react";
import { authService, User } from "@/lib/auth";
import { useResources } from "@/lib/resources-context";
import Link from "next/link";

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

/* ── Component ── */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const { resources } = useResources();
  const router = useRouter();

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
    
    // Redirect admins to overview page
    if (currentUser?.role === "admin") {
      router.push("/dashboard/admin/overview");
    }
  }, [router]);

  // Calculate real stats from user's resources
  const stats = {
    totalCourses: resources.length,
    totalViews: resources.reduce((sum, r) => sum + r.views, 0),
    totalDownloads: resources.reduce((sum, r) => sum + r.downloads, 0),
    avgRating: resources.length > 0 
      ? (resources.reduce((sum, r) => sum + r.rating, 0) / resources.length).toFixed(1)
      : "0.0",
  };

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-2xl font-bold text-[#0d1b3e]">
          Welcome back, {user?.fullName || "Teacher"}
        </h1>
        <p className="text-[14px] text-[#8899bb] mt-1">
          Here's what's happening with your resources today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#63b3ed]">{ICON_MAP.fileText}</span>
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.totalCourses}</p>
          <p className="text-xs text-[#8899bb] mt-1">My Resources</p>
        </div>

        <div className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#63b3ed]">{ICON_MAP.bookOpen}</span>
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.totalViews}</p>
          <p className="text-xs text-[#8899bb] mt-1">Total Views</p>
        </div>

        <div className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#63b3ed]">{ICON_MAP.sparkles}</span>
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.totalDownloads}</p>
          <p className="text-xs text-[#8899bb] mt-1">Total Downloads</p>
        </div>

        <div className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#63b3ed]">{ICON_MAP.star}</span>
          </div>
          <p className="text-2xl font-bold text-[#0d1b3e]">{stats.avgRating}</p>
          <p className="text-xs text-[#8899bb] mt-1">Average Rating</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-lg font-semibold text-[#0d1b3e] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/upload"
            className="group flex items-center gap-4 bg-white rounded-xl border border-[#edf0f7] p-5 hover:border-[#63b3ed] hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] group-hover:bg-[rgba(99,179,237,0.1)] transition-colors">
              {ICON_MAP.upload}
            </div>
            <div>
              <p className="font-semibold text-[#0d1b3e] group-hover:text-[#63b3ed] transition-colors">
                Upload Resource
              </p>
              <p className="text-xs text-[#8899bb]">Add PDFs, PPTX, or videos</p>
            </div>
          </Link>

          <Link
            href="/dashboard/exam-builder"
            className="group flex items-center gap-4 bg-white rounded-xl border border-[#edf0f7] p-5 hover:border-[#63b3ed] hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] group-hover:bg-[rgba(99,179,237,0.1)] transition-colors">
              {ICON_MAP.sparkles}
            </div>
            <div>
              <p className="font-semibold text-[#0d1b3e] group-hover:text-[#63b3ed] transition-colors">
                Create Exam
              </p>
              <p className="text-xs text-[#8899bb]">Build a new assessment</p>
            </div>
          </Link>

          <Link
            href="/dashboard/library"
            className="group flex items-center gap-4 bg-white rounded-xl border border-[#edf0f7] p-5 hover:border-[#63b3ed] hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed] group-hover:bg-[rgba(99,179,237,0.1)] transition-colors">
              {ICON_MAP.library}
            </div>
            <div>
              <p className="font-semibold text-[#0d1b3e] group-hover:text-[#63b3ed] transition-colors">
                Browse Library
              </p>
              <p className="text-xs text-[#8899bb]">Find resources from colleagues</p>
            </div>
          </Link>
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
            {resources.length === 0 ? (
              <div className="text-center py-8 text-[#8899bb]">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-1">Upload your first resource to get started</p>
              </div>
            ) : (
              resources.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#f4f6fc] last:border-0">
                  <div className="w-9 h-9 rounded-lg bg-[#f6f8ff] flex items-center justify-center text-[#63b3ed]">
                    {ICON_MAP.fileText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0d1b3e] truncate">{item.title}</p>
                    <p className="text-xs text-[#aab4cc]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification status */}
        {user?.verified ? (
          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Check className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-lg font-semibold mb-1">
                  Profile Verified
                </h3>
                <p className="text-sm text-white/90 leading-relaxed">
                  Your educator status has been verified. You have full access to all platform features including the AI exam generator.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Verified Educator
              </span>
              <span className="text-xs text-white/70">
                Since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#63b3ed] to-[#4299e1] rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-lg font-semibold mb-1">
                  Verify Your Profile
                </h3>
                <p className="text-sm text-white/90 leading-relaxed mb-4">
                  Get verified to unlock AI-powered exam generation and other premium features. The verification process is quick and secure.
                </p>
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#63b3ed] font-medium hover:bg-white/90 transition-colors"
                >
                  Start Verification
                  <Check className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                <Clock className="w-3 h-3" />
                Not Verified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
