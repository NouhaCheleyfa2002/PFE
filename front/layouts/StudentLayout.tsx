"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Library, BookOpen, User, LogOut, GraduationCap } from "lucide-react";
import { authService, User as AuthUser } from "@/lib/auth";

const NAV_ITEMS = [
  { icon: Library, label: "Library", href: "/student/library" },
  { icon: BookOpen, label: "My Resources", href: "/student/resources" },
  { icon: User, label: "Profile", href: "/student/profile" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-[#f6f8ff]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-[#edf0f7] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#63b3ed] to-[#a78bfa] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#0d1b3e]">MedEd Student</span>
        </div>

        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 text-sm text-[#4a5568] hover:text-[#63b3ed] transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8899bb]">{user?.fullName || "Student"}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#8899bb] hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
