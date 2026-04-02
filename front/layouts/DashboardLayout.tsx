import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8ff]">
      {/* ── Fixed sidebar ── */}
      <Sidebar />

      {/* ── Scrollable right column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* ── Sticky top navbar ── */}
        <Navbar />

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
    </div>
  );
}