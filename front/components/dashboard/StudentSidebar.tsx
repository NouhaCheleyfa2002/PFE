"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  BookOpen,
  Library,
  FileText,
  Heart,
  BarChart3,
  Bot,
  ShoppingCart,
  Receipt,
  Bell,
  User,
  Settings,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { authService } from "@/lib/auth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { icon: Home, label: "Home", href: "/dashboard" },
    ],
  },
  {
    title: "EXPLORE",
    items: [
      { icon: Search, label: "Explore", href: "/dashboard/library" },
    ],
  },
  {
    title: "MY LIBRARY",
    items: [
      { icon: Library, label: "My Library", href: "/dashboard/resources" },
      { icon: FileText, label: "Exams & Practice", href: "/dashboard/exams" },
      { icon: Heart, label: "Saved", href: "/dashboard/bookmarks" },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { icon: BarChart3, label: "My Performance", href: "/dashboard/performance" },
      { icon: Bot, label: "AI Study Assistant", href: "/dashboard/ai-assistant" },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { icon: ShoppingCart, label: "Cart", href: "/dashboard/cart" },
      { icon: Receipt, label: "Purchase History", href: "/dashboard/orders" },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
  { icon: User, label: "Profile", href: "/dashboard/profile" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = authService.getUser();

  const handleLogout = () => {
    authService.logout();
    router.push("/auth");
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">EduShare</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3">
        {STUDENT_NAV.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {section.title && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-200 p-3">
        <div className="space-y-1 mb-3">
          {BOTTOM_NAV.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                {item.label}
              </a>
            );
          })}
        </div>

        {/* User info + Logout */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.fullName?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {user?.fullName || "Student"}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
