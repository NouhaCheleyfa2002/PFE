"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "teacher" | "student" | "admin" | "teacher-or-admin";
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = authService.getToken();
      const user = authService.getUser();

      // No token or user - redirect to login
      if (!token || !user) {
        console.log("[ProtectedRoute] No token or user, redirecting to login");
        router.push("/");
        return;
      }

      // Check role if required
      if (requiredRole) {
        let hasAccess = false;
        
        if (requiredRole === "teacher-or-admin") {
          hasAccess = user.role === "teacher" || user.role === "admin";
        } else {
          hasAccess = user.role === requiredRole;
        }
        
        if (!hasAccess) {
          console.log(`[ProtectedRoute] User role ${user.role} doesn't match required role ${requiredRole}`);
          
          // Redirect based on actual role
          if (user.role === "student") {
            router.push("/student/library");
          } else if (user.role === "teacher" || user.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
          return;
        }
      }

      // All checks passed
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [router, requiredRole]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9faff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#63b3ed] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8899bb]">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authorized (redirect is in progress)
  if (!isAuthorized) {
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
}
