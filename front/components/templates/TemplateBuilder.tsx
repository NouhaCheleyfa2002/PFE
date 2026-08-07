"use client";

import React, { useState, useEffect } from "react";
import {
  type TemplateResponse,
  type CreateTemplateDto,
  type UpdateTemplateDto,
  createTemplate,
  updateTemplate,
} from "@/lib/api/templates";
import { TemplateLimitGuard } from "./TemplateLimitGuard";
import { X, Save, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

/**
 * TemplateBuilder Component
 * 
 * Two-panel layout for creating and editing exam templates.
 * Left panel (40%): Settings and configuration
 * Right panel (60%): Live preview
 * Responsive: Stacks vertically on screens <1024px
 * 
 * Requirements: 8.1-8.6, 18.1-18.5 (Task 10.1)
 */

interface TemplateBuilderProps {
  initialTemplate?: TemplateResponse | null;
  onSave?: (template: TemplateResponse) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

// Default template values
const DEFAULT_TEMPLATE: Partial<CreateTemplateDto> = {
  name: "",
  institutionName: "",
  institutionAddress: "",
  contactPhone: "",
  contactEmail: "",
  academicYear: "",
  logoUrl: "",
  logoPosition: { x: 50, y: 20, width: 80, height: 80 },
  pageMargins: { top: 72, bottom: 72, left: 72, right: 72 },
  pageOrientation: "portrait",
  footerText: "",
  watermarkText: "",
  watermarkOpacity: 30,
  fontFamily: "Helvetica",
  primaryColor: "#000000",
  secondaryColor: "#666666",
  placeholders: [],
  isDefault: false,
};

export function TemplateBuilder({
  initialTemplate,
  onSave,
  onCancel,
  isOpen = true,
}: TemplateBuilderProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<CreateTemplateDto>>(DEFAULT_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Advanced styling state
  const [institutionNameSize, setInstitutionNameSize] = useState(18);
  const [addressSize, setAddressSize] = useState(12);
  const [contactSize, setContactSize] = useState(10);
  const [academicYearSize, setAcademicYearSize] = useState(12);
  const [headerSpacing, setHeaderSpacing] = useState(8);
  
  // Layout controls
  const [institutionNameAlign, setInstitutionNameAlign] = useState<"left" | "center" | "right">("center");
  const [addressAlign, setAddressAlign] = useState<"left" | "center" | "right">("center");
  const [contactAlign, setContactAlign] = useState<"left" | "center" | "right">("center");
  const [academicYearAlign, setAcademicYearAlign] = useState<"left" | "center" | "right">("center");
  
  // Show/hide controls
  const [showInstitutionName, setShowInstitutionName] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [showAcademicYear, setShowAcademicYear] = useState(true);
  
  // Line height
  const [lineHeight, setLineHeight] = useState(1.4);

  // Initialize form with initial template data
  useEffect(() => {
    if (initialTemplate) {
      setFormData({
        name: initialTemplate.name,
        institutionName: initialTemplate.institutionName || "",
        institutionAddress: initialTemplate.institutionAddress || "",
        contactPhone: initialTemplate.contactPhone || "",
        contactEmail: initialTemplate.contactEmail || "",
        academicYear: initialTemplate.academicYear || "",
        logoUrl: initialTemplate.logoUrl || "",
        logoPosition: initialTemplate.logoPosition || DEFAULT_TEMPLATE.logoPosition,
        pageMargins: initialTemplate.pageMargins || DEFAULT_TEMPLATE.pageMargins,
        pageOrientation: initialTemplate.pageOrientation || "portrait",
        footerText: initialTemplate.footerText || "",
        watermarkText: initialTemplate.watermarkText || "",
        watermarkOpacity: initialTemplate.watermarkOpacity || 30,
        fontFamily: initialTemplate.fontFamily || "Helvetica",
        primaryColor: initialTemplate.primaryColor || "#000000",
        secondaryColor: initialTemplate.secondaryColor || "#666666",
        placeholders: initialTemplate.placeholders || [],
        isDefault: initialTemplate.isDefault || false,
      });
      
      // Load layout settings if available
      if (initialTemplate.layoutSettings) {
        setInstitutionNameSize(initialTemplate.layoutSettings.institutionNameSize || 18);
        setInstitutionNameAlign(initialTemplate.layoutSettings.institutionNameAlign || "center");
        setAddressSize(initialTemplate.layoutSettings.addressSize || 12);
        setAddressAlign(initialTemplate.layoutSettings.addressAlign || "center");
        setContactSize(initialTemplate.layoutSettings.contactSize || 10);
        setContactAlign(initialTemplate.layoutSettings.contactAlign || "center");
        setAcademicYearSize(initialTemplate.layoutSettings.academicYearSize || 12);
        setAcademicYearAlign(initialTemplate.layoutSettings.academicYearAlign || "center");
        setHeaderSpacing(initialTemplate.layoutSettings.headerSpacing || 8);
        setLineHeight((initialTemplate.layoutSettings.lineHeight || 14) / 10); // Convert 14 to 1.4
        setShowInstitutionName(initialTemplate.layoutSettings.showInstitutionName !== false);
        setShowAddress(initialTemplate.layoutSettings.showAddress !== false);
        setShowContact(initialTemplate.layoutSettings.showContact !== false);
        setShowAcademicYear(initialTemplate.layoutSettings.showAcademicYear !== false);
      }
    } else {
      setFormData(DEFAULT_TEMPLATE);
    }
  }, [initialTemplate]);

  const handleInputChange = (field: keyof CreateTemplateDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      errors.name = "Template name must be at least 3 characters";
    }

    if (formData.name && formData.name.length > 100) {
      errors.name = "Template name must be less than 100 characters";
    }

    if (formData.contactEmail && !isValidEmail(formData.contactEmail)) {
      errors.contactEmail = "Invalid email address";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setError("Please fix the validation errors before saving");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let savedTemplate: TemplateResponse;

      // Remove isDefault from the data being sent (only backend can set this)
      const { isDefault, ...dataToSend } = formData;
      
      // Add layout settings (convert lineHeight to integer by multiplying by 10)
      const dataWithLayout = {
        ...dataToSend,
        layoutSettings: {
          institutionNameSize,
          institutionNameAlign,
          addressSize,
          addressAlign,
          contactSize,
          contactAlign,
          academicYearSize,
          academicYearAlign,
          headerSpacing,
          lineHeight: Math.round(lineHeight * 10), // Convert 1.4 to 14
          showInstitutionName,
          showAddress,
          showContact,
          showAcademicYear,
        }
      };

      if (initialTemplate) {
        // Update existing template
        savedTemplate = await updateTemplate(initialTemplate.id, dataWithLayout as UpdateTemplateDto);
      } else {
        // Create new template
        savedTemplate = await createTemplate(dataWithLayout as CreateTemplateDto);
      }

      if (onSave) {
        onSave(savedTemplate);
      }
    } catch (err: any) {
      console.error("Failed to save template:", err);
      setError(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  // Render component
  const renderContent = () => (
    <div className="fixed inset-0 z-50 bg-[#f9faff] overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-white border-b border-[#edf0f7] flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0d1b3e]">
            {initialTemplate ? "Edit Template" : "Create New Template"}
          </h1>
          <p className="text-sm text-[#8899bb]">
            {initialTemplate ? `Editing: ${initialTemplate.name}` : "Design your exam template"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview Toggle (mobile) */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="lg:hidden p-2 rounded-lg bg-[#f9faff] hover:bg-[#edf0f7] transition-colors"
            aria-label="Toggle preview"
          >
            {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Template
              </>
            )}
          </button>

          {/* Export Button */}
          {initialTemplate && (
            <button
              onClick={() => {
                const exportData = {
                  name: formData.name,
                  institutionName: formData.institutionName,
                  institutionAddress: formData.institutionAddress,
                  contactPhone: formData.contactPhone,
                  contactEmail: formData.contactEmail,
                  academicYear: formData.academicYear,
                  logoUrl: formData.logoUrl,
                  logoPosition: formData.logoPosition,
                  pageMargins: formData.pageMargins,
                  pageOrientation: formData.pageOrientation,
                  footerText: formData.footerText,
                  watermarkText: formData.watermarkText,
                  watermarkOpacity: formData.watermarkOpacity,
                  fontFamily: formData.fontFamily,
                  primaryColor: formData.primaryColor,
                  secondaryColor: formData.secondaryColor,
                  placeholders: formData.placeholders,
                  layoutSettings: {
                    institutionNameSize,
                    institutionNameAlign,
                    addressSize,
                    addressAlign,
                    contactSize,
                    contactAlign,
                    academicYearSize,
                    academicYearAlign,
                    headerSpacing,
                    lineHeight: Math.round(lineHeight * 10),
                    showInstitutionName,
                    showAddress,
                    showContact,
                    showAcademicYear,
                  }
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${formData.name?.replace(/[^a-z0-9]/gi, '_') || 'template'}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#edf0f7] text-[#0d1b3e] rounded-lg hover:border-[#63b3ed] transition-all font-medium"
              title="Export template as JSON"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Export
            </button>
          )}

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-[#edf0f7] transition-colors"
            aria-label="Cancel"
          >
            <X className="w-6 h-6 text-[#8899bb]" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>
      )}

      {/* Main Content - Two Panel Layout */}
      <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row">
        {/* Left Panel - Settings (40%) */}
        <div className={`
          w-full lg:w-[40%] 
          bg-white border-r border-[#edf0f7] 
          overflow-y-auto
          ${!showPreview && 'lg:w-full'}
        `}>
          <div className="p-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0d1b3e]">Basic Information</h2>
              
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Final Exam Template"
                  className={`w-full px-4 py-2 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
                    validationErrors.name ? "border-red-300" : "border-[#edf0f7]"
                  }`}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                )}
              </div>
            </div>

            {/* Institution Metadata Section */}
            <div className="space-y-4 pt-6 border-t border-[#edf0f7]">
              <h2 className="text-lg font-semibold text-[#0d1b3e]">Institution Information</h2>
              
              {/* Institution Name */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Institution Name
                </label>
                <input
                  type="text"
                  value={formData.institutionName}
                  onChange={(e) => handleInputChange("institutionName", e.target.value)}
                  placeholder="e.g., lycée Ibn Sina Mahdia"
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                />
              </div>

              {/* Institution Address */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.institutionAddress}
                  onChange={(e) => handleInputChange("institutionAddress", e.target.value)}
                  placeholder="e.g., 123 Main Street, Tunis"
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                  placeholder="e.g., +216 71 123 456"
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                  placeholder="e.g., contact@school.tn"
                  className={`w-full px-4 py-2 bg-white border rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all ${
                    validationErrors.contactEmail ? "border-red-300" : "border-[#edf0f7]"
                  }`}
                />
                {validationErrors.contactEmail && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.contactEmail}</p>
                )}
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange("academicYear", e.target.value)}
                  placeholder="e.g., 2024-2025"
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                />
              </div>
            </div>

            {/* Page Configuration Section */}
            <div className="space-y-4 pt-6 border-t border-[#edf0f7]">
              <h2 className="text-lg font-semibold text-[#0d1b3e]">Page Configuration</h2>
              
              {/* Logo Position & Size */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#0d1b3e]">
                  Logo Position & Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#8899bb]">X Position (px)</label>
                    <input
                      type="number"
                      value={formData.logoPosition?.x || 0}
                      onChange={(e) => handleInputChange("logoPosition", {
                        ...formData.logoPosition,
                        x: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Y Position (px)</label>
                    <input
                      type="number"
                      value={formData.logoPosition?.y || 0}
                      onChange={(e) => handleInputChange("logoPosition", {
                        ...formData.logoPosition,
                        y: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Width (px)</label>
                    <input
                      type="number"
                      value={formData.logoPosition?.width || 0}
                      onChange={(e) => handleInputChange("logoPosition", {
                        ...formData.logoPosition,
                        width: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Height (px)</label>
                    <input
                      type="number"
                      value={formData.logoPosition?.height || 0}
                      onChange={(e) => handleInputChange("logoPosition", {
                        ...formData.logoPosition,
                        height: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Page Margins */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#0d1b3e]">
                  Page Margins (mm)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#8899bb]">Top</label>
                    <input
                      type="number"
                      value={formData.pageMargins?.top || 0}
                      onChange={(e) => handleInputChange("pageMargins", {
                        ...formData.pageMargins,
                        top: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Bottom</label>
                    <input
                      type="number"
                      value={formData.pageMargins?.bottom || 0}
                      onChange={(e) => handleInputChange("pageMargins", {
                        ...formData.pageMargins,
                        bottom: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Left</label>
                    <input
                      type="number"
                      value={formData.pageMargins?.left || 0}
                      onChange={(e) => handleInputChange("pageMargins", {
                        ...formData.pageMargins,
                        left: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8899bb]">Right</label>
                    <input
                      type="number"
                      value={formData.pageMargins?.right || 0}
                      onChange={(e) => handleInputChange("pageMargins", {
                        ...formData.pageMargins,
                        right: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Page Orientation */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Page Orientation
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleInputChange("pageOrientation", "portrait")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      formData.pageOrientation === "portrait"
                        ? "border-[#63b3ed] bg-[#e8f4fc] text-[#0d1b3e]"
                        : "border-[#edf0f7] bg-white text-[#8899bb] hover:border-[#c0d0e8]"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => handleInputChange("pageOrientation", "landscape")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      formData.pageOrientation === "landscape"
                        ? "border-[#63b3ed] bg-[#e8f4fc] text-[#0d1b3e]"
                        : "border-[#edf0f7] bg-white text-[#8899bb] hover:border-[#c0d0e8]"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Font Family
                </label>
                <select
                  value={formData.fontFamily}
                  onChange={(e) => handleInputChange("fontFamily", e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>
            </div>

            {/* Typography & Spacing Section */}
            <div className="space-y-4 pt-6 border-t border-[#edf0f7]">
              <h2 className="text-lg font-semibold text-[#0d1b3e]">Typography & Layout Controls</h2>
              
              {/* Institution Name Controls */}
              <div className="p-4 bg-[#f9faff] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#0d1b3e]">Institution Name</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInstitutionName}
                      onChange={(e) => setShowInstitutionName(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#63b3ed]"
                    />
                    <span className="text-xs text-[#8899bb]">Show</span>
                  </label>
                </div>
                
                {showInstitutionName && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">
                        Font Size: {institutionNameSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={institutionNameSize}
                        onChange={(e) => setInstitutionNameSize(parseInt(e.target.value))}
                        className="w-full accent-[#63b3ed]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setInstitutionNameAlign(align)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                              institutionNameAlign === align
                                ? "bg-[#63b3ed] text-white"
                                : "bg-white text-[#8899bb] border border-[#edf0f7] hover:border-[#63b3ed]"
                            }`}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Address Controls */}
              <div className="p-4 bg-[#f9faff] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#0d1b3e]">Address</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAddress}
                      onChange={(e) => setShowAddress(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#63b3ed]"
                    />
                    <span className="text-xs text-[#8899bb]">Show</span>
                  </label>
                </div>
                
                {showAddress && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">
                        Font Size: {addressSize}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="18"
                        value={addressSize}
                        onChange={(e) => setAddressSize(parseInt(e.target.value))}
                        className="w-full accent-[#63b3ed]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setAddressAlign(align)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                              addressAlign === align
                                ? "bg-[#63b3ed] text-white"
                                : "bg-white text-[#8899bb] border border-[#edf0f7] hover:border-[#63b3ed]"
                            }`}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Contact Info Controls */}
              <div className="p-4 bg-[#f9faff] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#0d1b3e]">Contact Info</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showContact}
                      onChange={(e) => setShowContact(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#63b3ed]"
                    />
                    <span className="text-xs text-[#8899bb]">Show</span>
                  </label>
                </div>
                
                {showContact && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">
                        Font Size: {contactSize}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="16"
                        value={contactSize}
                        onChange={(e) => setContactSize(parseInt(e.target.value))}
                        className="w-full accent-[#63b3ed]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setContactAlign(align)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                              contactAlign === align
                                ? "bg-[#63b3ed] text-white"
                                : "bg-white text-[#8899bb] border border-[#edf0f7] hover:border-[#63b3ed]"
                            }`}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Academic Year Controls */}
              <div className="p-4 bg-[#f9faff] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#0d1b3e]">Academic Year</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAcademicYear}
                      onChange={(e) => setShowAcademicYear(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#63b3ed]"
                    />
                    <span className="text-xs text-[#8899bb]">Show</span>
                  </label>
                </div>
                
                {showAcademicYear && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">
                        Font Size: {academicYearSize}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="18"
                        value={academicYearSize}
                        onChange={(e) => setAcademicYearSize(parseInt(e.target.value))}
                        className="w-full accent-[#63b3ed]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-[#8899bb] mb-2">Alignment</label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setAcademicYearAlign(align)}
                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                              academicYearAlign === align
                                ? "bg-[#63b3ed] text-white"
                                : "bg-white text-[#8899bb] border border-[#edf0f7] hover:border-[#63b3ed]"
                            }`}
                          >
                            {align.charAt(0).toUpperCase() + align.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Header Element Spacing */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Element Spacing: {headerSpacing}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={headerSpacing}
                  onChange={(e) => setHeaderSpacing(parseInt(e.target.value))}
                  className="w-full accent-[#63b3ed]"
                />
                <p className="text-xs text-[#8899bb] mt-1">Space between header elements</p>
              </div>

              {/* Line Height */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Line Height: {lineHeight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full accent-[#63b3ed]"
                />
                <p className="text-xs text-[#8899bb] mt-1">Space between lines of text</p>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#edf0f7] cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                    Secondary Color
                  </label>
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#edf0f7] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Footer & Watermark Section */}
            <div className="space-y-4 pt-6 border-t border-[#edf0f7]">
              <h2 className="text-lg font-semibold text-[#0d1b3e]">Footer & Watermark</h2>
              
              {/* Footer Text */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Footer Text
                </label>
                <textarea
                  value={formData.footerText}
                  onChange={(e) => handleInputChange("footerText", e.target.value)}
                  placeholder="e.g., For official use only"
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all resize-none"
                />
                <p className="text-xs text-[#c0d0e8] mt-1">
                  {formData.footerText?.length || 0} / 500 characters
                </p>
              </div>

              {/* Watermark Text */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={formData.watermarkText}
                  onChange={(e) => handleInputChange("watermarkText", e.target.value)}
                  placeholder="e.g., CONFIDENTIAL"
                  maxLength={200}
                  className="w-full px-4 py-2 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] transition-all"
                />
              </div>

              {/* Watermark Opacity */}
              <div>
                <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
                  Watermark Opacity: {formData.watermarkOpacity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.watermarkOpacity}
                  onChange={(e) => handleInputChange("watermarkOpacity", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview (60%) */}
        {showPreview && (
          <div className="flex-1 bg-[#f9faff] overflow-y-auto p-6 hidden lg:block">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-semibold text-[#0d1b3e] mb-4">Live Preview</h2>
              <div className="bg-white rounded-lg shadow-lg p-8 border border-[#edf0f7]">
                <div style={{ 
                  fontFamily: formData.fontFamily || 'Helvetica',
                  lineHeight: lineHeight 
                }}>
                  {/* Institution Name */}
                  {showInstitutionName && formData.institutionName && (
                    <h1 
                      className="font-bold"
                      style={{ 
                        color: formData.primaryColor,
                        fontSize: `${institutionNameSize}px`,
                        marginBottom: `${headerSpacing}px`,
                        textAlign: institutionNameAlign
                      }}
                    >
                      {formData.institutionName}
                    </h1>
                  )}
                  
                  {/* Address */}
                  {showAddress && formData.institutionAddress && (
                    <p 
                      style={{ 
                        color: formData.secondaryColor,
                        fontSize: `${addressSize}px`,
                        marginBottom: `${headerSpacing}px`,
                        textAlign: addressAlign
                      }}
                    >
                      {formData.institutionAddress}
                    </p>
                  )}
                  
                  {/* Contact Info */}
                  {showContact && (formData.contactPhone || formData.contactEmail) && (
                    <p 
                      className="text-[#8899bb]"
                      style={{ 
                        fontSize: `${contactSize}px`,
                        marginBottom: `${headerSpacing}px`,
                        textAlign: contactAlign
                      }}
                    >
                      {[formData.contactPhone, formData.contactEmail].filter(Boolean).join(" | ")}
                    </p>
                  )}
                  
                  {/* Academic Year */}
                  {showAcademicYear && formData.academicYear && (
                    <p 
                      className="font-medium"
                      style={{ 
                        color: formData.secondaryColor,
                        fontSize: `${academicYearSize}px`,
                        textAlign: academicYearAlign
                      }}
                    >
                      Academic Year: {formData.academicYear}
                    </p>
                  )}
                  
                  {/* Divider */}
                  <div className="border-t-2 border-[#edf0f7] my-6"></div>
                  
                  {/* Sample Exam Title */}
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold text-[#0d1b3e]">
                      [Exam Title]
                    </h2>
                  </div>
                  
                  {/* Sample Student Info */}
                  <div className="text-sm space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span>Name: _________________________</span>
                      <span>Date: ______________</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Level: ______________</span>
                      <span>Subject: ______________</span>
                    </div>
                  </div>
                  
                  {/* Sample Question */}
                  <div className="mt-6">
                    <p className="font-semibold mb-2">Q1. Sample question text goes here? (2 pts)</p>
                    <div className="ml-4 space-y-1 text-sm">
                      <div>○ Option A</div>
                      <div>○ Option B</div>
                      <div>○ Option C</div>
                      <div>○ Option D</div>
                    </div>
                  </div>
                </div>
                
                {/* Watermark */}
                {formData.watermarkText && (
                  <div
                    className="mt-8 text-center transform -rotate-45 text-6xl font-bold pointer-events-none"
                    style={{
                      color: "#CCCCCC",
                      opacity: formData.watermarkOpacity ? formData.watermarkOpacity / 100 : 0.3,
                    }}
                  >
                    {formData.watermarkText}
                  </div>
                )}

                {/* Footer */}
                {formData.footerText && (
                  <div className="mt-8 pt-4 border-t border-[#edf0f7] text-center text-xs text-[#8899bb]">
                    {formData.footerText}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Wrap in limit guard for new templates
  if (!initialTemplate) {
    return (
      <TemplateLimitGuard onCancel={onCancel}>
        {renderContent()}
      </TemplateLimitGuard>
    );
  }

  return renderContent();
}
