"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import StudentSidebar from "@/components/dashboard/StudentSidebar";
import Navbar from "@/components/dashboard/Navbar";
import { authService } from "@/lib/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const user = authService.getUser();
    setUserRole(user?.role || null);
  }, []);

  // Show student sidebar for students
  const SidebarComponent = userRole === "student" ? StudentSidebar : Sidebar;

  return (
    <div className="flex min-h-screen bg-[#f6f8ff]">
      {/* ── Fixed sidebar ── */}
      <div className="sticky top-0 h-screen">
        <SidebarComponent />
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