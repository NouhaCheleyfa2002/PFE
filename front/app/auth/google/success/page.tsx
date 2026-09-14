"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function GoogleSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const isNewUser = searchParams.get("isNewUser") === "true";

    if (token) {
      // Decode JWT to get user info
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        
        const user = {
          id: payload.sub,
          email: payload.email,
          fullName: payload.fullName,
          role: payload.role,
          verified: true,
        };

        // Save to localStorage
        authService.setToken(token);
        authService.setUser(user);

        // Redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } catch (error) {
        console.error("Failed to process Google login:", error);
        router.push("/auth/login?error=google_auth_failed");
      }
    } else {
      router.push("/auth/login?error=no_token");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Signing you in...
        </h2>
        <p className="text-gray-600">Please wait while we complete your login</p>
      </div>
    </div>
  );
}
