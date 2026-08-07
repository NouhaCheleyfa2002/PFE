"use client";

import React, { useState } from "react";
import { TemplateManager } from "@/components/templates/TemplateManager";
import { TemplateBuilder } from "@/components/templates/TemplateBuilder";
import { type TemplateResponse } from "@/lib/api/templates";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TemplatesPage() {
  const router = useRouter();
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateResponse | null>(null);

  const handleSelectTemplate = (template: TemplateResponse) => {
    setSelectedTemplate(template);
    setShowBuilder(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setShowBuilder(true);
  };

  const handleSave = () => {
    setShowBuilder(false);
    setSelectedTemplate(null);
  };

  const handleCancel = () => {
    setShowBuilder(false);
    setSelectedTemplate(null);
    // Navigate back to exam builder if that's where we came from
    const referrer = document.referrer;
    if (referrer.includes('/exam-builder')) {
      router.push('/dashboard/exam-builder');
    }
  };

  if (showBuilder) {
    return (
      <TemplateBuilder
        initialTemplate={selectedTemplate}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f9faff] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => {
              const referrer = document.referrer;
              if (referrer.includes('/exam-builder')) {
                router.push('/dashboard/exam-builder');
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-2 text-[#63b3ed] hover:text-[#4299e1] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-[#0d1b3e]">Exam Templates</h1>
          <p className="text-[#8899bb] mt-2">
            Create and manage your exam templates with institutional branding
          </p>
        </div>

        {/* Template Manager */}
        <TemplateManager
          onSelectTemplate={handleSelectTemplate}
          onCreateNew={handleCreateNew}
          showCreateButton={true}
        />
      </div>
    </div>
  );
}
