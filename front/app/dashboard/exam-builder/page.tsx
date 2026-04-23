"use client";

import { useRef, ReactNode } from "react";
import {
  FileText,
  Trash2,
  Eye,
  Pencil,
  Smartphone,
  AlertTriangle,
  Cloud,
  Loader2,
} from "lucide-react";
import { ExamProvider, useExam, PreviewMode } from "@/lib/exam-context";
import QuestionBank from "@/components/exam-builder/QuestionBank";
import ExamPreview from "@/components/exam-builder/ExamPreview";

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
  { id: "mobile", label: "Mobile", icon: <Smartphone className="w-3.5 h-3.5" /> },
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
  const { exam, clearExam, totalPoints, previewMode } = useExam();
  const isEditorMode = previewMode === "edit";

  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    const html2canvas = (await import("html2canvas-pro")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = pdfWidth / canvas.width;
    const scaledHeight = canvas.height * ratio;

    let position = 0;
    let remaining = scaledHeight;
    while (remaining > 0) {
      if (position > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, scaledHeight);
      position += pdfHeight;
      remaining -= pdfHeight;
    }

    pdf.save(`${exam.title || "exam"}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-2xl font-bold text-[#0d1b3e]"
          >
            Exam Builder
          </h1>
          <p className="text-sm text-[#8899bb] mt-0.5">
            {exam.questions.length} question{exam.questions.length !== 1 && "s"} ·{" "}
            {totalPoints} pts total
          </p>
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

      {/* Main panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        {isEditorMode && <QuestionBank />}
        <ExamPreview ref={previewRef} />
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
