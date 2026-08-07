"use client";

import { useRef, ReactNode, useState, useEffect } from "react";
import {
  FileText,
  Trash2,
  Eye,
  Pencil,
  AlertTriangle,
  Cloud,
  Loader2,
  GraduationCap,
  Layout,
  X,
} from "lucide-react";
import { ExamProvider, useExam, PreviewMode } from "@/lib/exam-context";
import { EDUCATION_LEVELS, type EducationLevel } from "@/lib/education-config";
import QuestionBank from "@/components/exam-builder/QuestionBank";
import ExamPreview from "@/components/exam-builder/ExamPreview";
import { TemplateSelectionModal } from "@/components/templates/TemplateSelectionModal";
import { type TemplateResponse } from "@/lib/api/templates";

/* ─── Save indicator ───────────────────────────────────────────────────────── */

function SaveIndicator() {
  const { savedAt, isSaving } = useExam();

  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#aab4cc]">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (savedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#aab4cc]">
        <Cloud className="w-3 h-3" />
        Saved{" "}
        {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }

  return null;
}

/* ─── Preview mode toggle ──────────────────────────────────────────────────── */

const MODES: { id: PreviewMode; label: string; icon: ReactNode }[] = [
  { id: "edit", label: "Edit", icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: "student", label: "Student view", icon: <Eye className="w-3.5 h-3.5" /> },
];

function PreviewModeToggle() {
  const { previewMode, setPreviewMode } = useExam();

  return (
    <div className="flex items-center rounded-lg border border-[#edf0f7] overflow-hidden bg-[#f9faff] p-0.5 gap-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setPreviewMode(m.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            previewMode === m.id
              ? "bg-white text-[#0d1b3e] shadow-sm"
              : "text-[#8899bb] hover:text-[#0d1b3e]"
          }`}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Validation summary ───────────────────────────────────────────────────── */

function ValidationBadge() {
  const { validationErrors } = useExam();
  const count = Object.keys(validationErrors).length;
  if (!count) return null;

  return (
    <span
      title={Object.values(validationErrors).flat().join("\n")}
      className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg cursor-help"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      {count} issue{count !== 1 && "s"}
    </span>
  );
}

/* ─── Inner builder ────────────────────────────────────────────────────────── */

function ExamBuilderInner() {
  const previewRef = useRef<HTMLDivElement>(null);
  const { exam, clearExam, totalPoints, pointsRemaining, previewMode, setClassLevel, setTemplateId, setMaxPoints } = useExam();
  const isEditorMode = previewMode === "edit";
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [importedTemplate, setImportedTemplate] = useState<TemplateResponse | null>(null);
  const [showMaxPointsInput, setShowMaxPointsInput] = useState(false);

  // Don't force template selection on load - let user choose when they want

  const handleSelectTemplate = (template: TemplateResponse) => {
    console.log('[ExamBuilder] Template selected:', {
      hasId: !!template.id,
      name: template.name,
      hasLogoUrl: !!template.logoUrl,
      logoWidth: template.logoPosition?.width
    });
    
    // If template has an ID, it's a saved template - use the ID
    // If template has no ID, it's imported - store it in state
    if (template.id) {
      setTemplateId(template.id);
      setImportedTemplate(null); // Clear imported template
    } else {
      setTemplateId(null); // Imported template - no ID
      setImportedTemplate(template); // Store imported template data
    }
    setSelectedTemplateName(template.name);
    setShowTemplateModal(false);
  };

  const handleSelectDefault = async () => {
    try {
      const { getDefaultTemplate } = await import("@/lib/api/templates");
      const defaultTemplate = await getDefaultTemplate();
      
      if (defaultTemplate) {
        setTemplateId(defaultTemplate.id);
        setSelectedTemplateName(defaultTemplate.name);
      } else {
        setTemplateId(null);
        setSelectedTemplateName("Default Template");
      }
      
      setShowTemplateModal(false);
    } catch (error) {
      console.error("Failed to load default template:", error);
      setTemplateId(null);
      setSelectedTemplateName("Default Template");
      setShowTemplateModal(false);
    }
  };

  const handleCreateNewTemplate = () => {
    setShowTemplateModal(false);
    window.open("/dashboard/templates", "_blank");
  };

  const handleChangeTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      let pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // If a template is selected, apply it
      if (exam.templateId) {
        const { getTemplateById } = await import("@/lib/api/templates");
        try {
          const template = await getTemplateById(exam.templateId);
          
          // Apply template header
          let yOffset = 10;
          
          // Add logo if present
          if (template.logoUrl) {
            try {
              const logoImg = await loadImage(template.logoUrl);
              const logoX = template.logoPosition?.x || 10;
              const logoY = template.logoPosition?.y || 10;
              const logoWidth = template.logoPosition?.width || 30;
              const logoHeight = template.logoPosition?.height || 20;
              pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight);
              yOffset = Math.max(yOffset, logoY + logoHeight + 5);
            } catch (err) {
              console.warn("Failed to load logo:", err);
            }
          }

          // Add institution metadata
          pdf.setFontSize(14);
          pdf.setFont(template.fontFamily || "helvetica", "bold");
          if (template.institutionName) {
            pdf.text(template.institutionName, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 7;
          }

          pdf.setFontSize(10);
          pdf.setFont(template.fontFamily || "helvetica", "normal");
          if (template.institutionAddress) {
            pdf.text(template.institutionAddress, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 5;
          }
          if (template.contactPhone || template.contactEmail) {
            const contact = [template.contactPhone, template.contactEmail].filter(Boolean).join(" • ");
            pdf.text(contact, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 5;
          }
          if (template.academicYear) {
            pdf.text(`Academic Year: ${template.academicYear}`, pdfWidth / 2, yOffset, { align: "center" });
            yOffset += 8;
          }

          // Add separator line
          pdf.setDrawColor(200, 200, 200);
          pdf.line(15, yOffset, pdfWidth - 15, yOffset);
          yOffset += 10;

          // Render exam content
          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const ratio = pdfWidth / canvas.width;
          const scaledHeight = canvas.height * ratio;
          const availableHeight = pdfHeight - yOffset - 10;

          let contentPosition = 0;
          let remaining = scaledHeight;
          let isFirstPage = true;

          while (remaining > 0) {
            if (!isFirstPage) {
              pdf.addPage();
              yOffset = 10;
            }
            const pageHeight = isFirstPage ? availableHeight : pdfHeight - 20;
            pdf.addImage(imgData, "PNG", 0, yOffset - contentPosition, pdfWidth, scaledHeight);
            contentPosition += pageHeight;
            remaining -= pageHeight;
            isFirstPage = false;
          }

          // Add watermark if present
          if (template.watermarkText) {
            const totalPages = pdf.internal.pages.length - 1;
            pdf.setFontSize(50);
            pdf.setTextColor(200, 200, 200);
            pdf.setFont(template.fontFamily || "helvetica", "bold");
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.saveGraphicsState();
              pdf.setGState(new pdf.GState({ opacity: template.watermarkOpacity || 0.1 }));
              pdf.text(template.watermarkText, pdfWidth / 2, pdfHeight / 2, {
                align: "center",
                angle: 45,
              });
              pdf.restoreGraphicsState();
            }
          }

          // Add footer if present
          if (template.footerText) {
            const totalPages = pdf.internal.pages.length - 1;
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont(template.fontFamily || "helvetica", "normal");
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.text(template.footerText, pdfWidth / 2, pdfHeight - 10, { align: "center" });
            }
          }
        } catch (error) {
          console.error("Failed to apply template, using default export:", error);
          // Fall back to default export
          await exportWithoutTemplate(pdf, previewRef.current, html2canvas, pdfWidth, pdfHeight);
        }
      } else {
        // No template selected, use default export
        await exportWithoutTemplate(pdf, previewRef.current, html2canvas, pdfWidth, pdfHeight);
      }

      pdf.save(`${exam.title || "exam"}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const exportWithoutTemplate = async (
    pdf: any,
    element: HTMLDivElement,
    html2canvas: any,
    pdfWidth: number,
    pdfHeight: number
  ) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const ratio = pdfWidth / canvas.width;
    const scaledHeight = canvas.height * ratio;

    let position = 0;
    let remaining = scaledHeight;
    let isFirst = true;
    while (remaining > 0) {
      if (!isFirst) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, scaledHeight);
      position += pdfHeight;
      remaining -= pdfHeight;
      isFirst = false;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectDefault={handleSelectDefault}
        onSelectTemplate={handleSelectTemplate}
        onCreateNew={handleCreateNewTemplate}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex-1">
          <h1
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-2xl font-bold text-[#0d1b3e]"
          >
            Exam Builder
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-[#8899bb]">
              {exam.questions.length} question{exam.questions.length !== 1 && "s"}
            </p>
            <span className="text-[#cbd5e1]">·</span>
            <div className="flex items-center gap-2">
              {exam.maxPoints ? (
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    totalPoints > exam.maxPoints ? 'text-red-600' :
                    totalPoints === exam.maxPoints ? 'text-green-600' :
                    pointsRemaining <= 5 ? 'text-amber-600' :
                    'text-[#0d1b3e]'
                  }`}>
                    {totalPoints} / {exam.maxPoints} pts
                  </span>
                  {totalPoints > exam.maxPoints && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Exceeded!
                    </span>
                  )}
                  {totalPoints === exam.maxPoints && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      Complete
                    </span>
                  )}
                  {totalPoints < exam.maxPoints && pointsRemaining <= 5 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {pointsRemaining} pts left
                    </span>
                  )}
                  <button
                    onClick={() => setMaxPoints(null)}
                    className="text-xs text-[#8899bb] hover:text-red-600 transition-colors"
                    title="Remove points limit"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : showMaxPointsInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Max points"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (value > 0) {
                          setMaxPoints(value);
                          setShowMaxPointsInput(false);
                        }
                      } else if (e.key === 'Escape') {
                        setShowMaxPointsInput(false);
                      }
                    }}
                    className="w-24 px-2 py-1 text-sm border border-[#edf0f7] rounded focus:outline-none focus:border-[#63b3ed]"
                  />
                  <button
                    onClick={() => setShowMaxPointsInput(false)}
                    className="text-xs text-[#8899bb] hover:text-[#0d1b3e]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMaxPointsInput(true)}
                  className="text-sm text-[#8899bb] hover:text-[#63b3ed] transition-colors flex items-center gap-1"
                >
                  {totalPoints} pts · <span className="text-xs underline">Set limit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SaveIndicator />
          <ValidationBadge />
          <PreviewModeToggle />

          {isEditorMode && (
            <button
              onClick={clearExam}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#8899bb] hover:border-red-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}

          <button
            onClick={handleExportPDF}
            disabled={exam.questions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm font-medium hover:bg-[#1a2d5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Class Level Selector - NEW */}
      {isEditorMode && (
        <div className="mb-4 space-y-4">
          {/* Template Selection */}
          <div className="bg-white rounded-xl border border-[#edf0f7] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0d1b3e]">
                  <Layout className="w-5 h-5 text-[#63b3ed]" />
                  <span>Template:</span>
                </div>
                <span className="text-sm text-[#8899bb]">
                  {selectedTemplateName || "No template selected"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTemplateName && (
                  <button
                    onClick={() => {
                      setTemplateId(null);
                      setSelectedTemplateName(null);
                      setImportedTemplate(null);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                    title="Remove template"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                )}
                <button
                  onClick={handleChangeTemplate}
                  className="px-3 py-1.5 text-sm text-white bg-[#63b3ed] hover:bg-[#4299e1] rounded-lg transition-colors"
                >
                  {selectedTemplateName ? "Change Template" : "Select Template"}
                </button>
              </div>
            </div>
          </div>

          {/* Class Level Selector */}
          <div className="bg-white rounded-xl border border-[#edf0f7] p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#0d1b3e]">
                <GraduationCap className="w-5 h-5 text-[#63b3ed]" />
                <span>Class Level:</span>
              </div>
              <select
                value={exam.classLevel || ""}
                onChange={(e) => setClassLevel(e.target.value as EducationLevel | "")}
                className="flex-1 max-w-md px-4 py-2.5 rounded-lg border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
              >
                <option value="">Select a class level to filter questions...</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {exam.classLevel && (
                <span className="text-xs text-[#8899bb]">
                  Questions will be filtered by this level
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        {isEditorMode && <QuestionBank />}
        <ExamPreview ref={previewRef} importedTemplate={importedTemplate} />
      </div>
    </div>
  );
}

export default function ExamBuilderPage() {
  return (
    <ExamProvider>
      <ExamBuilderInner />
    </ExamProvider>
  );
}
