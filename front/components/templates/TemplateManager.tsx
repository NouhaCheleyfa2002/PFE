"use client";

import React, { useState, useEffect, useRef } from "react";
import { getTemplates, type TemplateResponse } from "@/lib/api/templates";
import { TemplateCard } from "./TemplateCard";
import { Search, Plus, Loader2, AlertCircle, FileText, Upload, CheckCircle, X } from "lucide-react";

/**
 * TemplateManager Component
 * 
 * Manages display and interaction with exam templates.
 * Allows users to browse, search, and select templates.
 * 
 * Requirements: 1.1-1.5, 10.1-10.6
 */

interface TemplateManagerProps {
  onSelectTemplate?: (template: TemplateResponse) => void;
  onCreateNew?: () => void;
  showCreateButton?: boolean;
}

export function TemplateManager({
  onSelectTemplate,
  onCreateNew,
  showCreateButton = true,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filter templates when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter((template) =>
      template.name.toLowerCase().includes(query) ||
      template.institutionName?.toLowerCase().includes(query) ||
      template.academicYear?.toLowerCase().includes(query)
    );

    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTemplates();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (err: any) {
      console.error("Failed to fetch templates:", err);
      setError(err.message || "Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: TemplateResponse) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
  };

  const handleTemplateDeleted = (templateId: string) => {
    // Remove deleted template from list
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleTemplateUpdated = () => {
    // Refresh templates list after update
    fetchTemplates();
  };

  const handleDuplicate = (template: TemplateResponse) => {
    // Create a copy of the template data without the ID
    // This will create a new template when saved
    const duplicatedTemplate: Partial<TemplateResponse> = {
      ...template,
      name: `${template.name} (Copy)`,
      id: undefined, // Remove ID to create new template
      createdAt: undefined,
      updatedAt: undefined,
    };

    // Pass to onSelectTemplate which should open TemplateBuilder with the copied data
    if (onSelectTemplate) {
      onSelectTemplate(duplicatedTemplate as TemplateResponse);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === "application/json") {
        // Import JSON template
        const text = await file.text();
        const jsonData = JSON.parse(text);
        
        // Validate it's a template
        if (!jsonData.name || !jsonData.institutionName) {
          throw new Error("Invalid template JSON structure");
        }
        
        // Remove ID so it creates a new template when saved
        const template: TemplateResponse = {
          ...jsonData,
          id: undefined,
          name: `${jsonData.name} (Imported)`,
        };
        
        // Pass to onSelectTemplate to open in builder
        if (onSelectTemplate) {
          onSelectTemplate(template);
        }
        
        setToastType("success");
        setToastMessage("Template imported successfully! Edit and save to make it permanent.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else if (file.type.startsWith("image/")) {
        // Import image as template logo
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          
          const template: TemplateResponse = {
            name: `Template from ${file.name}`,
            institutionName: "Your Institution",
            logoUrl: base64,
            logoPosition: { x: 10, y: 10, width: 600, height: 400 },
            fontFamily: "Times New Roman",
            id: undefined,
          };
          
          if (onSelectTemplate) {
            onSelectTemplate(template);
          }
          
          setToastType("success");
          setToastMessage("Image imported successfully! Edit and save to create a permanent template.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        };
        reader.readAsDataURL(file);
      } else {
        throw new Error("Unsupported file type. Use JSON or image files.");
      }
    } catch (error: any) {
      console.error("Import failed:", error);
      setToastType("error");
      setToastMessage(error.message || "Failed to import template");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-[#63b3ed] animate-spin mb-4" />
        <p className="text-[#8899bb]">Loading templates...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium mb-2">Failed to Load Templates</p>
        <p className="text-[#8899bb] text-sm mb-4">{error}</p>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-[#63b3ed] text-white rounded-lg hover:bg-[#4299e1] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Create Button */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#8899bb]" />
          <input
            type="text"
            placeholder="Search templates by name, institution, or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-[#edf0f7] rounded-lg text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] focus:border-transparent transition-all"
          />
        </div>

        {/* Import Template Button */}
        <button
          onClick={handleImportClick}
          className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-[#63b3ed] text-[#63b3ed] rounded-lg hover:bg-[#f0f8ff] transition-all duration-200 font-medium"
          title="Import template from JSON or image file"
        >
          <Upload className="w-5 h-5" />
          Import
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,image/*"
          onChange={handleFileImport}
          className="hidden"
        />

        {/* Create New Template Button */}
        {showCreateButton && (
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        )}
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="text-sm text-[#8899bb]">
          {filteredTemplates.length === 0 ? (
            <span>No templates found matching &quot;{searchQuery}&quot;</span>
          ) : (
            <span>
              Found {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 && !searchQuery ? (
        // Empty state - no templates at all
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#edf0f7]">
          <div className="w-20 h-20 rounded-full bg-[#e8f4fc] flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-[#63b3ed]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">No Templates Yet</h3>
          <p className="text-[#8899bb] text-sm mb-6 max-w-md text-center">
            Create your first exam template to streamline your exam creation process.
          </p>
          {showCreateButton && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create First Template
            </button>
          )}
        </div>
      ) : (
        // Templates grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelectTemplate}
              onDuplicate={handleDuplicate}
              onDeleted={handleTemplateDeleted}
              onUpdated={handleTemplateUpdated}
            />
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-md animate-slideIn"
          style={{
            backgroundColor: toastType === "success" ? "#d1fae5" : "#fee2e2",
            border: toastType === "success" ? "2px solid #6ee7b7" : "2px solid #fca5a5",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: toastType === "success"
              ? "0 8px 24px rgba(16, 185, 129, 0.3)"
              : "0 8px 24px rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                toastType === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {toastType === "success" ? (
                <CheckCircle className="w-4 h-4 text-white" style={{ strokeWidth: 3 }} />
              ) : (
                <X className="w-4 h-4 text-white" style={{ strokeWidth: 3 }} />
              )}
            </div>
            <div className="flex-1">
              <h4
                className={`text-sm font-semibold mb-1 ${
                  toastType === "success" ? "text-green-900" : "text-red-900"
                }`}
              >
                {toastType === "success" ? "Template Imported!" : "Import Failed"}
              </h4>
              <p className={`text-sm ${toastType === "success" ? "text-green-700" : "text-red-700"}`}>
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className={`flex-shrink-0 transition-colors ${
                toastType === "success"
                  ? "text-green-400 hover:text-green-600"
                  : "text-red-400 hover:text-red-600"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
