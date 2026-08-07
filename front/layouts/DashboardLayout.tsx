import React from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#f6f8ff]">
      {/* ── Fixed sidebar ── */}
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* ── Scrollable right column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ── Sticky top navbar ── */}
        <div className="sticky top-0 z-10">
          <Navbar />
        </div>

        {/* ── Page content ── */}
        <main className="flex-1 px-5 py-5">
          {children}
        </main>
      </div>
    </div>
  );
}