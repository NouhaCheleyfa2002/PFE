"use client";

import React, { useState } from "react";
import { TemplateManager } from "./TemplateManager";
import { type TemplateResponse } from "@/lib/api/templates";
import { X, FileText, FolderOpen, Plus, Sparkles } from "lucide-react";

/**
 * TemplateSelectionModal Component
 * 
 * Modal for selecting a template at the start of exam creation.
 * Offers three options: default template, saved template, or create new.
 * 
 * Requirements: 1.1-1.5
 */

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDefault: () => void;
  onSelectTemplate: (template: TemplateResponse) => void;
  onCreateNew: () => void;
}

type SelectionMode = "choose" | "browse" | "create";

export function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelectDefault,
  onSelectTemplate,
  onCreateNew,
}: TemplateSelectionModalProps) {
  const [mode, setMode] = useState<SelectionMode>("choose");

  if (!isOpen) return null;

  const handleSelectTemplate = (template: TemplateResponse) => {
    onSelectTemplate(template);
  };

  const handleCreateNew = () => {
    setMode("choose");
    onCreateNew();
  };

  const handleUseDefault = () => {
    setMode("choose");
    onSelectDefault();
  };

  const handleBrowseTemplates = () => {
    setMode("browse");
  };

  const handleBackToChoose = () => {
    setMode("choose");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-gradient-to-r from-[#f9faff] to-white">
          <div>
            <h2 className="text-xl font-semibold text-[#0d1b3e]">
              {mode === "choose" && "Choose Exam Template"}
              {mode === "browse" && "Select a Template"}
              {mode === "create" && "Create New Template"}
            </h2>
            <p className="text-sm text-[#8899bb] mt-1">
              {mode === "choose" && "Select how you'd like to format your exam"}
              {mode === "browse" && "Choose from your saved templates"}
              {mode === "create" && "Build a custom exam template"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#edf0f7] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-[#8899bb]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {mode === "choose" && (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Option 1: Use Default Template */}
                <button
                  onClick={handleUseDefault}
                  className="group relative p-6 rounded-xl border-2 border-[#edf0f7] hover:border-[#63b3ed] bg-white hover:bg-[#f9faff] transition-all duration-300 hover:shadow-lg text-left"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-7 h-7 text-[#63b3ed]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                    Use Default
                  </h3>
                  <p className="text-sm text-[#8899bb] leading-relaxed">
                    Quick start with clean template.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-[#63b3ed]">
                    Get Started
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                {/* Option 2: Select Saved Template */}
                <button
                  onClick={handleBrowseTemplates}
                  className="group relative p-6 rounded-xl border-2 border-[#edf0f7] hover:border-[#63b3ed] bg-white hover:bg-[#f9faff] transition-all duration-300 hover:shadow-lg text-left"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-7 h-7 text-[#63b3ed]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                    Saved Template
                  </h3>
                  <p className="text-sm text-[#8899bb] leading-relaxed">
                    Choose from your saved templates.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-[#63b3ed]">
                    Browse
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>

                {/* Option 3: Import Template */}
                <label className="group relative p-6 rounded-xl border-2 border-[#edf0f7] hover:border-[#63b3ed] bg-white hover:bg-[#f9faff] transition-all duration-300 hover:shadow-lg text-left cursor-pointer">
                  <input
                    type="file"
                    accept=".json,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          // Check if it's a JSON file
                          if (file.name.endsWith('.json')) {
                            const text = await file.text();
                            const imported = JSON.parse(text);
                            
                            // For imported templates, we create a temporary template object
                            const templateData: TemplateResponse = {
                              id: '', // Empty ID means temporary/imported
                              name: imported.name || "Imported Template",
                              userId: '',
                              institutionName: imported.institutionName,
                              institutionAddress: imported.institutionAddress,
                              contactPhone: imported.contactPhone,
                              contactEmail: imported.contactEmail,
                              academicYear: imported.academicYear,
                              logoUrl: imported.logoUrl,
                              logoPosition: imported.logoPosition,
                              pageMargins: imported.pageMargins || { top: 72, bottom: 72, left: 72, right: 72 },
                              pageOrientation: imported.pageOrientation || 'portrait',
                              footerText: imported.footerText,
                              watermarkText: imported.watermarkText,
                              watermarkOpacity: imported.watermarkOpacity || 30,
                              fontFamily: imported.fontFamily || 'Helvetica',
                              primaryColor: imported.primaryColor || '#000000',
                              secondaryColor: imported.secondaryColor || '#666666',
                              placeholders: imported.placeholders || [],
                              layoutSettings: imported.layoutSettings,
                              isDefault: false,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            
                            onSelectTemplate(templateData);
                            // Show success toast
                            const toast = document.createElement('div');
                            toast.className = 'fixed top-4 right-4 z-50 animate-slideIn';
                            toast.innerHTML = `
                              <div class="bg-white rounded-xl shadow-2xl border border-green-200 p-4 max-w-md">
                                <div class="flex items-start gap-3">
                                  <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </div>
                                  <div class="flex-1">
                                    <h4 class="text-sm font-semibold text-gray-900 mb-1">Template Imported!</h4>
                                    <p class="text-xs text-gray-600">Template loaded successfully.</p>
                                    <p class="text-xs text-gray-500 mt-1">This is temporary. Save it in Templates page to reuse.</p>
                                  </div>
                                  <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            `;
                            document.body.appendChild(toast);
                            setTimeout(() => toast.remove(), 5000);
                          } else {
                            // It's a document/image file - just use it as header image
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              const imageUrl = e.target?.result as string;
                              
                              // Create template with the image as logo/header
                              const templateData: TemplateResponse = {
                                id: '',
                                name: file.name.replace(/\.[^/.]+$/, '') || "Imported Template",
                                userId: '',
                                institutionName: '',
                                institutionAddress: '',
                                contactPhone: '',
                                contactEmail: '',
                                academicYear: '',
                                logoUrl: imageUrl, // Use the image directly
                                logoPosition: { x: 0, y: 0, width: 600, height: 150 },
                                pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
                                pageOrientation: 'portrait',
                                footerText: '',
                                watermarkText: '',
                                watermarkOpacity: 30,
                                fontFamily: 'Helvetica',
                                primaryColor: '#000000',
                                secondaryColor: '#666666',
                                placeholders: [],
                                layoutSettings: undefined,
                                isDefault: false,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                              
                              onSelectTemplate(templateData);
                              // Show success toast instead of alert
                              const toast = document.createElement('div');
                              toast.className = 'fixed top-4 right-4 z-50 animate-slideIn';
                              toast.innerHTML = `
                                <div class="bg-white rounded-xl shadow-2xl border border-green-200 p-4 max-w-md">
                                  <div class="flex items-start gap-3">
                                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    </div>
                                    <div class="flex-1">
                                      <h4 class="text-sm font-semibold text-gray-900 mb-1">Template Image Imported!</h4>
                                      <p class="text-xs text-gray-600">Your template will appear in the exam preview.</p>
                                      <p class="text-xs text-gray-500 mt-1">💡 Save it in Templates page to reuse later.</p>
                                    </div>
                                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(toast);
                              setTimeout(() => toast.remove(), 5000);
                            };
                            reader.readAsDataURL(file);
                          }
                        } catch (err) {
                          console.error('Import error:', err);
                          // Show error toast
                          const toast = document.createElement('div');
                          toast.className = 'fixed top-4 right-4 z-50 animate-slideIn';
                          toast.innerHTML = `
                            <div class="bg-white rounded-xl shadow-2xl border border-red-200 p-4 max-w-md">
                              <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                  <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </div>
                                <div class="flex-1">
                                  <h4 class="text-sm font-semibold text-gray-900 mb-1">Import Failed</h4>
                                  <p class="text-xs text-gray-600">Please check the file format and try again.</p>
                                </div>
                                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          `;
                          document.body.appendChild(toast);
                          setTimeout(() => toast.remove(), 5000);
                        }
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-[#63b3ed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                    Import Template
                  </h3>
                  <p className="text-sm text-[#8899bb] leading-relaxed">
                    JSON, PDF, Word, or Image file.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-[#63b3ed]">
                    Choose File
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </label>

                {/* Option 4: Create New Template */}
                <button
                  onClick={handleCreateNew}
                  className="group relative p-6 rounded-xl border-2 border-[#edf0f7] hover:border-[#63b3ed] bg-white hover:bg-[#f9faff] transition-all duration-300 hover:shadow-lg text-left"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-7 h-7 text-[#63b3ed]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                    Create New
                  </h3>
                  <p className="text-sm text-[#8899bb] leading-relaxed">
                    Design custom template from scratch.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-[#63b3ed]">
                    Start Building
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-8 p-4 rounded-xl bg-[#f9faff] border border-[#edf0f7]">
                <p className="text-sm text-[#8899bb]">
                  <strong className="text-[#0d1b3e]">💡 Tip:</strong> Templates save time by automatically adding your institution's header, logo, and formatting to every exam you create.
                </p>
              </div>
            </div>
          )}

          {mode === "browse" && (
            <div className="p-6">
              {/* Back Button */}
              <button
                onClick={handleBackToChoose}
                className="mb-4 flex items-center gap-2 text-sm text-[#63b3ed] hover:text-[#4299e1] transition-colors"
              >
                <span>←</span>
                Back to options
              </button>

              {/* Template Manager */}
              <TemplateManager
                onSelectTemplate={handleSelectTemplate}
                onCreateNew={handleCreateNew}
                showCreateButton={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close modal"
      />
    </div>
  );
}
