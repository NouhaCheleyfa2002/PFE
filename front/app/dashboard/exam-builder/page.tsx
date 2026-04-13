"use client";

import React, { useRef } from "react";
import { FileText, Trash2 } from "lucide-react";
import { ExamProvider, useExam } from "@/lib/exam-context";
import QuestionBank from "@/components/exam-builder/QuestionBank";
import ExamPreview from "@/components/exam-builder/ExamPreview";

function ExamBuilderInner() {
  const previewRef = useRef<HTMLDivElement>(null);
  const { exam, clearExam } = useExam();

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
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    let position = 0;
    let remaining = scaledHeight;

    // multi-page support
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
      {/* top bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-2xl font-bold text-[#0d1b3e]"
          >
            Exam Builder
          </h1>
          <p className="text-sm text-[#8899bb] mt-1">
            Click questions to add them to your exam document
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8899bb]">
            {exam.questions.length} question{exam.questions.length !== 1 && "s"} ·{" "}
            {exam.questions.reduce((s, q) => s + q.points, 0)} pts
          </span>

          <button
            onClick={clearExam}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#edf0f7] text-sm text-[#8899bb] hover:border-red-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exam.questions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm font-medium hover:bg-[#1a2d5a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* main panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        <QuestionBank />
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
