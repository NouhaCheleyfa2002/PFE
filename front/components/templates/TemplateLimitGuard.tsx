"use client";

import React from "react";
import { useTemplateLimit } from "@/lib/hooks/useTemplateLimit";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";

/**
 * TemplateLimitGuard Component
 * 
 * Displays a warning when user approaches or reaches template limit.
 * Suggests deleting old templates or upgrading.
 * 
 * Requirements: 17.4, 17.5 (Task 14.4)
 */

interface TemplateLimitGuardProps {
  onProceed?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function TemplateLimitGuard({
  onProceed,
  onCancel,
  children,
}: TemplateLimitGuardProps) {
  const { count, limit, canCreate, isLoading, error } = useTemplateLimit();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 text-[#63b3ed] animate-spin" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900 mb-1">Unable to Check Template Limit</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show limit reached error
  if (!canCreate) {
    return (
      <div className="p-6 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-2">
              Template Limit Reached
            </h3>
            <p className="text-sm text-amber-800 mb-3">
              You've reached the maximum of <strong>{limit} templates</strong>. 
              You currently have <strong>{count} templates</strong>.
            </p>
            <p className="text-sm text-amber-700">
              To create a new template, please delete an existing one or upgrade your plan.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors font-medium"
            >
              Go Back
            </button>
          )}
          <button
            onClick={() => {
              // Navigate to templates page to delete
              window.location.href = "/dashboard/templates";
            }}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Manage Templates
          </button>
        </div>
      </div>
    );
  }

  // Show warning when approaching limit (80% = 8 templates)
  const warningThreshold = Math.floor(limit * 0.8);
  if (count >= warningThreshold) {
    return (
      <div className="mb-6">
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                You're using <strong>{count} of {limit}</strong> available templates. 
                Consider deleting unused templates to free up space.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    );
  }

  // Limit OK - render children normally
  return <>{children}</>;
}

/**
 * Simple banner component to show current template count
 */
export function TemplateLimitBanner() {
  const { count, limit, isLoading } = useTemplateLimit();

  if (isLoading) return null;

  const percentage = (count / limit) * 100;
  const isNearLimit = percentage >= 80;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-medium ${isNearLimit ? "text-amber-600" : "text-[#8899bb]"}`}>
        {count} / {limit} templates
      </span>
      <div className="flex-1 h-2 bg-[#edf0f7] rounded-full overflow-hidden max-w-[100px]">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? "bg-amber-500" : "bg-[#63b3ed]"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
