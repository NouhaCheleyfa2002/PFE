"use client";

import React, { useState } from "react";
import { TemplateBuilder } from "./TemplateBuilder";
import { type TemplateResponse, updateTemplate } from "@/lib/api/templates";

/**
 * TemplateEditor Component
 * 
 * Wrapper that handles editing existing templates.
 * Opens TemplateBuilder with template data and handles updates.
 * 
 * Requirements: 11.1-11.5 (Task 12.1)
 */

interface TemplateEditorProps {
  template: TemplateResponse;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (template: TemplateResponse) => void;
}

export function TemplateEditor({
  template,
  isOpen,
  onClose,
  onUpdated,
}: TemplateEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (updatedTemplate: TemplateResponse) => {
    setIsSaving(true);
    setError(null);

    try {
      // Preserve the template ID for update operation
      const saved = await updateTemplate(template.id, {
        name: updatedTemplate.name,
        institutionName: updatedTemplate.institutionName,
        institutionAddress: updatedTemplate.institutionAddress,
        contactPhone: updatedTemplate.contactPhone,
        contactEmail: updatedTemplate.contactEmail,
        academicYear: updatedTemplate.academicYear,
        logoUrl: updatedTemplate.logoUrl,
        logoPosition: updatedTemplate.logoPosition,
        pageMargins: updatedTemplate.pageMargins,
        pageOrientation: updatedTemplate.pageOrientation,
        footerText: updatedTemplate.footerText,
        watermarkText: updatedTemplate.watermarkText,
        watermarkOpacity: updatedTemplate.watermarkOpacity,
        fontFamily: updatedTemplate.fontFamily,
        primaryColor: updatedTemplate.primaryColor,
        secondaryColor: updatedTemplate.secondaryColor,
        placeholders: updatedTemplate.placeholders,
      });

      // Notify parent of successful update
      onUpdated(saved);
      onClose();
    } catch (err: any) {
      console.error("Failed to update template:", err);
      setError(err.message || "Failed to update template");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative">
      <TemplateBuilder
        initialTemplate={template}
        onSave={handleSave}
        onCancel={onClose}
        isOpen={isOpen}
      />

      {/* Error Overlay */}
      {error && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Update Failed
            </h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setError(null)}
                className="flex-1 px-4 py-2 bg-[#f9faff] text-[#0d1b3e] rounded-lg hover:bg-[#edf0f7] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
