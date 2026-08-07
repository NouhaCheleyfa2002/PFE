"use client";

import React, { useState } from "react";
import { X, Save, Loader2, AlertCircle } from "lucide-react";

/**
 * TemplateSaveDialog Component
 * 
 * Dialog for saving templates with name validation.
 * Checks for duplicate names and validates length.
 * 
 * Requirements: 9.1-9.7 (Task 10.6)
 */

interface TemplateSaveDialogProps {
  isOpen: boolean;
  initialName?: string;
  existingNames?: string[];
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
  mode?: "create" | "update";
}

export function TemplateSaveDialog({
  isOpen,
  initialName = "",
  existingNames = [],
  onSave,
  onCancel,
  mode = "create",
}: TemplateSaveDialogProps) {
  const [templateName, setTemplateName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateName = (name: string): string | null => {
    // Check length
    if (!name || name.trim().length < 3) {
      return "Template name must be at least 3 characters";
    }

    if (name.length > 100) {
      return "Template name must be less than 100 characters";
    }

    // Check for duplicate (case-insensitive, excluding current template in update mode)
    const normalizedName = name.trim().toLowerCase();
    const normalizedInitial = initialName.trim().toLowerCase();
    
    const isDuplicate = existingNames.some(
      (existingName) =>
        existingName.toLowerCase() === normalizedName &&
        (mode === "create" || normalizedName !== normalizedInitial)
    );

    if (isDuplicate) {
      return `A template with the name "${name}" already exists`;
    }

    return null;
  };

  const handleSave = async () => {
    setError(null);

    // Validate name
    const validationError = validateName(templateName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      await onSave(templateName.trim());
      // Dialog will be closed by parent on success
    } catch (err: any) {
      console.error("Failed to save template:", err);
      setError(err.message || "Failed to save template");
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleNameChange = (value: string) => {
    setTemplateName(value);
    setError(null); // Clear error on change
  };

  const currentError = error || validateName(templateName);
  const canSave = !isSaving && templateName.trim().length >= 3 && !currentError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      {/* Dialog Container */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-gradient-to-r from-[#f9faff] to-white">
          <div>
            <h2 className="text-lg font-semibold text-[#0d1b3e]">
              {mode === "create" ? "Save Template" : "Rename Template"}
            </h2>
            <p className="text-sm text-[#8899bb] mt-1">
              {mode === "create"
                ? "Give your template a unique name"
                : "Update the template name"}
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-2 rounded-lg hover:bg-[#edf0f7] transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-[#8899bb]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Template Name Input */}
          <div>
            <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Final Exam Template"
              autoFocus
              disabled={isSaving}
              className={`w-full px-4 py-3 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                error
                  ? "border-red-300 focus:ring-red-200"
                  : "border-[#edf0f7] focus:ring-[#63b3ed]"
              }`}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[#c0d0e8]">
                {templateName.length} / 100 characters
              </p>
              {!error && templateName.length >= 3 && templateName.length <= 100 && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  ✓ Valid name
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Invalid Name</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Choose a descriptive name that helps you
              identify the template later, like "Math Final Exam" or "Science
              Midterm Header".
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-[#f9faff] border-t border-[#edf0f7]">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-white border border-[#edf0f7] text-[#0d1b3e] rounded-lg hover:bg-[#edf0f7] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {mode === "create" ? "Save Template" : "Update Name"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onCancel}
        aria-label="Close dialog"
      />
    </div>
  );
}
