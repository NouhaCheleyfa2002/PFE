"use client";

import React, { forwardRef } from "react";
import { useExam } from "@/lib/exam-context";
import { Question } from "@/lib/types/question";
import { X } from "lucide-react";

/* ── single question renderer ─────────────────────────────────────────── */
function QuestionBlock({ q, index, onRemove }: { q: Question; index: number; onRemove: (id: string) => void }) {
  return (
    <div style={{ marginBottom: 24, position: "relative" }} className="group">
      {/* remove btn (hidden in print) */}
      <button
        onClick={() => onRemove(q.id)}
        style={{ position: "absolute", right: -8, top: -8, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#ef4444", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
        className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
      >
        <X className="w-3 h-3" />
      </button>

      {/* question header */}
      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#000" }}>
        <span style={{ marginRight: 4 }}>Q{index + 1}.</span>
        {q.type === "image" ? "" : q.text}
        <span style={{ marginLeft: 8, fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>({q.points} pt{q.points > 1 ? "s" : ""})</span>
      </p>

      {/* ── type-specific body ── */}
      {q.type === "mcq" && q.options && (
        <div style={{ paddingLeft: 24 }}>
          {q.options.map((o) => (
            <div key={o.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid #9ca3af", flexShrink: 0 }} />
              <span>{o.label}. {o.text}</span>
            </div>
          ))}
        </div>
      )}

      {q.type === "true_false" && (
        <div style={{ paddingLeft: 24, display: "flex", alignItems: "center", gap: 24, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid #9ca3af", flexShrink: 0 }} />
            <span>True</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1px solid #9ca3af", flexShrink: 0 }} />
            <span>False</span>
          </div>
        </div>
      )}

      {q.type === "fill_blank" && (
        <p style={{ paddingLeft: 24, fontSize: 13, lineHeight: "28px" }}>
          {q.text.split("______").map((part, i, arr) => (
            <React.Fragment key={i}>
              {part}
              {i < arr.length - 1 && (
                <span style={{ display: "inline-block", width: 112, borderBottom: "1px solid #9ca3af", margin: "0 4px", verticalAlign: "bottom" }} />
              )}
            </React.Fragment>
          ))}
        </p>
      )}

      {q.type === "open" && (
        <div style={{ paddingLeft: 24, marginTop: 8 }}>
          {Array.from({ length: q.lines || 4 }).map((_, i) => (
            <div key={i} style={{ borderBottom: "1px solid #d1d5db", height: 20, marginBottom: 12 }} />
          ))}
        </div>
      )}

      {q.type === "image" && (
        <div style={{ paddingLeft: 24 }}>
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.imageUrl}
              alt="Question image"
              style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 4, border: "1px solid #e5e7eb", marginBottom: 8 }}
            />
          )}
          <p style={{ fontSize: 13, marginBottom: 8 }}>{q.text}</p>
          <div style={{ marginTop: 8 }}>
            {Array.from({ length: q.lines || 3 }).map((_, i) => (
              <div key={i} style={{ borderBottom: "1px solid #d1d5db", height: 20, marginBottom: 12 }} />
            ))}
          </div>
        </div>
      )}

      {q.type === "match" && q.matchPairs && (
        <div style={{ paddingLeft: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32, rowGap: 4, fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: "#6b7280", borderBottom: "1px solid #d1d5db", paddingBottom: 4, marginBottom: 4 }}>Column A</div>
            <div style={{ fontWeight: 500, color: "#6b7280", borderBottom: "1px solid #d1d5db", paddingBottom: 4, marginBottom: 4 }}>Column B</div>
            {q.matchPairs.map((p, i) => (
              <React.Fragment key={i}>
                <div>{String.fromCharCode(65 + i)}. {p.left}</div>
                <div>{i + 1}. {p.right}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── A4 page constants ────────────────────────────────────────────────── */
const PAGE_STYLE: React.CSSProperties = {
  position: "relative",
  margin: "0 auto 32px auto",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  width: "210mm",
  minHeight: "297mm",
  padding: "20mm 18mm",
  fontFamily: "'Times New Roman', serif",
  color: "#000",
  pageBreakAfter: "always",
  breakAfter: "page",
};

/* ── A4 document preview ──────────────────────────────────────────────── */
const ExamPreview = forwardRef<HTMLDivElement>(function ExamPreview(_, ref) {
  const { exam, setTitle, setDuration, setInstructions, removeQuestion } = useExam();

  return (
    <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#f3f4f6", padding: 24 }}>
      <div
        ref={ref}
        style={{
          width: "210mm",
          margin: "0 auto",
          fontFamily: "'Times New Roman', serif",
          color: "#000",
        }}
      >
        {/* ── Page wrapper — CSS columns handle visual page breaks ── */}
        <div style={{ ...PAGE_STYLE, margin: "0 auto" }}>
          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #000", paddingBottom: 16 }}>
            <input
              value={exam.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exam Title"
              style={{ textAlign: "center", fontSize: 20, fontWeight: 700, width: "100%", backgroundColor: "transparent", outline: "none", border: "none", color: "#000" }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
              <span>Name: ____________________________</span>
              <span>Date: _______________</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>Duration:</span>
                <input
                  value={exam.duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60 min"
                  style={{ width: 80, backgroundColor: "transparent", outline: "none", borderBottom: "1px dashed #9ca3af", textAlign: "center", fontSize: 13 }}
                />
              </div>
              <span>
                Total: {exam.questions.reduce((s, q) => s + q.points, 0)} points
              </span>
            </div>

            {/* instructions */}
            <div style={{ marginTop: 12, textAlign: "left" }}>
              <textarea
                value={exam.instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions: Read all questions carefully before answering..."
                rows={2}
                style={{ width: "100%", fontSize: 12, fontStyle: "italic", color: "#4b5563", backgroundColor: "transparent", outline: "none", resize: "none", border: "none" }}
              />
            </div>
          </div>

          {/* ── Body ── */}
          {exam.questions.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, color: "#d1d5db" }}>
              <p style={{ fontSize: 18, fontWeight: 500 }}>No questions added yet</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>Click questions from the bank to add them</p>
            </div>
          ) : (
            exam.questions.map((q, i) => (
              <div key={q.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                <QuestionBlock q={q} index={i} onRemove={removeQuestion} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

export default ExamPreview;
