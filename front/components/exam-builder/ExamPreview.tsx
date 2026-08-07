"use client";

import React, { forwardRef, useState, useEffect, useRef } from "react";
import { useExam } from "@/lib/exam-context";
import { Question } from "@/lib/types/question";
import {
  X,
  GripVertical,
  Copy,
  Pencil,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QuestionCreator from "./QuestionCreator";

/* ─── Resizable, alignable image with caption ─────────────────────────────── */

const ALIGN_ICONS: Record<string, string> = { left: "⬛◻◻", center: "◻⬛◻", right: "◻◻⬛" };

function ResizableImage({
  q,
  isEditorMode,
  onUpdate,
}: {
  q: Question;
  isEditorMode: boolean;
  onUpdate: (id: string, updates: Partial<Question>) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const width = q.imageWidth ?? 340;
  const align = q.imageAlign ?? "center";
  const caption = q.imageCaption ?? "";

  // Resize drag handlers
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startXRef.current;
      const next = Math.max(80, startWidthRef.current + dx);
      onUpdate(q.id, { imageWidth: Math.round(next) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onUpdate, q.id]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWidthRef.current = q.imageWidth ?? 340;
    setDragging(true);
  };

  const src = q.imageUrl!;

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Alignment + size controls — editor only */}
      {isEditorMode && (
        <div
          data-html2canvas-ignore="true"
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
        >
          <div
            style={{
              display: "flex",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => onUpdate(q.id, { imageAlign: a })}
                title={`Align ${a}`}
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                  backgroundColor: align === a ? "#0d1b3e" : "#f8fafc",
                  color: align === a ? "#fff" : "#64748b",
                  border: "none",
                  fontWeight: align === a ? 700 : 400,
                  letterSpacing: 1,
                }}
              >
                {ALIGN_ICONS[a]}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            {Math.round(width)}px · drag handle →
          </span>
        </div>
      )}

      {/* Image wrapper with alignment */}
      <div
        style={{
          textAlign: align,
          position: "relative",
        }}
      >
        <div style={{ display: "inline-block", position: "relative" }}>
          {failed ? (
            <div
              style={{
                width,
                maxWidth: "100%",
                height: 110,
                border: "1px dashed #d1d5db",
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 11,
                backgroundColor: "#f9fafb",
              }}
            >
              <span style={{ fontSize: 20, marginBottom: 4 }}>🖼️</span>
              <span>Image unavailable</span>
              <span
                style={{
                  fontSize: 9,
                  marginTop: 3,
                  maxWidth: "85%",
                  textAlign: "center",
                  wordBreak: "break-all",
                  color: "#d1d5db",
                }}
              >
                {src}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={caption || "Question image"}
              crossOrigin="anonymous"
              onError={() => setFailed(true)}
              draggable={false}
              style={{
                width,
                maxWidth: "100%",
                height: "auto",
                display: "block",
                borderRadius: 4,
                border: isEditorMode ? "2px solid #e2e8f0" : "1px solid #e5e7eb",
                userSelect: "none",
              }}
            />
          )}

          {/* Right resize handle */}
          {isEditorMode && (
            <div
              data-html2canvas-ignore="true"
              onMouseDown={startResize}
              title="Drag to resize"
              style={{
                position: "absolute",
                right: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 36,
                backgroundColor: dragging ? "#1d4ed8" : "#3b82f6",
                borderRadius: 4,
                cursor: "ew-resize",
                boxShadow: "0 2px 6px rgba(59,130,246,0.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                zIndex: 10,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    height: 2,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.9)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      {isEditorMode ? (
        <input
          data-html2canvas-ignore="true"
          value={caption}
          onChange={(e) => onUpdate(q.id, { imageCaption: e.target.value })}
          placeholder="Add a caption (optional)…"
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            fontSize: 11,
            color: "#6b7280",
            fontStyle: "italic",
            border: "none",
            borderBottom: "1px dashed #e2e8f0",
            outline: "none",
            padding: "3px 0",
            marginTop: 5,
            backgroundColor: "transparent",
          }}
        />
      ) : (
        caption && (
          <p
            style={{
              fontSize: 11,
              textAlign: "center",
              color: "#6b7280",
              fontStyle: "italic",
              margin: "4px 0 0",
            }}
          >
            {caption}
          </p>
        )
      )}
    </div>
  );
}

/* ─── Inline question editor ──────────────────────────────────────────────── */

function QuestionEditorForm({
  q,
  onSave,
  onCancel,
  exam,
  totalPoints,
}: {
  q: Question;
  onSave: (updates: Partial<Question>) => void;
  onCancel: () => void;
  exam: any;
  totalPoints: number;
}) {
  const [draft, setDraft] = useState<Question>({ ...q });

  const handleSave = () => {
    // Check if updating points would exceed max
    if (exam.maxPoints) {
      const pointsDiff = draft.points - q.points;
      const newTotal = totalPoints + pointsDiff;
      if (newTotal > exam.maxPoints) {
        alert(`Cannot update question! This would exceed the maximum points limit by ${newTotal - exam.maxPoints} pts.`);
        return;
      }
    }
    onSave(draft);
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        border: "2px solid #3b82f6",
        backgroundColor: "#eff6ff",
        marginBottom: 16,
      }}
    >
      {/* Text + Points */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
        <textarea
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          placeholder="Enter question text…"
          autoFocus
          rows={2}
          style={{
            flex: 1,
            resize: "vertical",
            fontSize: 13,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: "6px 10px",
            fontFamily: "inherit",
            minHeight: 56,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 68 }}>
          <label style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>POINTS</label>
          <input
            type="number"
            value={draft.points}
            onChange={(e) =>
              setDraft((d) => ({ ...d, points: Math.max(0.5, Number(e.target.value)) }))
            }
            min={0.5}
            step={0.5}
            style={{
              width: 68,
              textAlign: "center",
              fontSize: 15,
              fontWeight: 600,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "6px 4px",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* MCQ options */}
      {draft.type === "mcq" && draft.options && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
            OPTIONS — click radio to mark correct:
          </p>
          {draft.options.map((opt) => (
            <div
              key={opt.label}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
            >
              <input
                type="radio"
                name={`correct-${draft.id}`}
                checked={draft.correctAnswer === opt.label}
                onChange={() => setDraft((d) => ({ ...d, correctAnswer: opt.label }))}
                style={{ accentColor: "#2563eb" }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, width: 18 }}>{opt.label}.</span>
              <input
                type="text"
                value={opt.text}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    options: d.options?.map((o) =>
                      o.label === opt.label ? { ...o, text: e.target.value } : o
                    ),
                  }))
                }
                placeholder={`Option ${opt.label}`}
                style={{
                  flex: 1,
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "4px 8px",
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* True / False */}
      {draft.type === "true_false" && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
            CORRECT ANSWER:
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["True", "False"].map((val) => (
              <label
                key={val}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name={`tf-${draft.id}`}
                  checked={draft.correctAnswer === val}
                  onChange={() => setDraft((d) => ({ ...d, correctAnswer: val }))}
                  style={{ accentColor: "#2563eb" }}
                />
                {val}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Open / Essay lines */}
      {draft.type === "open" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>ANSWER LINES:</label>
          <input
            type="number"
            value={draft.lines ?? 4}
            onChange={(e) =>
              setDraft((d) => ({ ...d, lines: Math.max(1, Math.min(20, Number(e.target.value))) }))
            }
            min={1}
            max={20}
            style={{
              width: 56,
              textAlign: "center",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "4px 8px",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Fill blank hint */}
      {draft.type === "fill_blank" && (
        <p style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
          Tip: use <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>______</code>{" "}
          (6 underscores) in the question text to mark blanks.
        </p>
      )}

      {/* Match pairs */}
      {draft.type === "match" && draft.matchPairs && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
            MATCH PAIRS:
          </p>
          {draft.matchPairs.map((pair, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
            >
              <input
                value={pair.left}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    matchPairs: d.matchPairs?.map((p, j) =>
                      j === i ? { ...p, left: e.target.value } : p
                    ),
                  }))
                }
                placeholder="Left item"
                style={{
                  flex: 1,
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "4px 8px",
                  outline: "none",
                }}
              />
              <span style={{ color: "#94a3b8", fontSize: 12 }}>↔</span>
              <input
                value={pair.right}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    matchPairs: d.matchPairs?.map((p, j) =>
                      j === i ? { ...p, right: e.target.value } : p
                    ),
                  }))
                }
                placeholder="Right item"
                style={{
                  flex: 1,
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "4px 8px",
                  outline: "none",
                }}
              />
              {draft.matchPairs && draft.matchPairs.length > 2 && (
                <button
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      matchPairs: d.matchPairs?.filter((_, j) => j !== i),
                    }))
                  }
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#ef4444",
                    padding: 2,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() =>
              setDraft((d) => ({
                ...d,
                matchPairs: [...(d.matchPairs ?? []), { left: "", right: "" }],
              }))
            }
            style={{
              fontSize: 11,
              color: "#3b82f6",
              cursor: "pointer",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            + Add pair
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            fontSize: 12,
            color: "#64748b",
            padding: "6px 16px",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            fontSize: 12,
            color: "#fff",
            padding: "6px 16px",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            backgroundColor: "#2563eb",
            fontWeight: 600,
          }}
        >
          Save question
        </button>
      </div>
    </div>
  );
}

/* ─── Question body (type-specific rendering) ──────────────────────────────── */

interface QuestionBodyProps {
  q: Question;
  isEditorMode?: boolean;
  onUpdate?: (id: string, updates: Partial<Question>) => void;
}

function QuestionBody({ q, isEditorMode = false, onUpdate }: QuestionBodyProps) {
  if (q.type === "mcq" && q.options) {
    return (
      <div style={{ paddingLeft: 20 }}>
        {q.options.map((o, idx) => (
          <div
            key={`${q.id}-option-${idx}`}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 5 }}
          >
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: "1px solid #9ca3af",
                flexShrink: 0,
              }}
            />
            <span>
              {o.label}.{" "}
              {o.text || <em style={{ color: "#9ca3af" }}>—</em>}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "true_false") {
    return (
      <div style={{ paddingLeft: 20, display: "flex", gap: 24, fontSize: 13 }}>
        {["True", "False"].map((v) => (
          <div key={v} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: "1px solid #9ca3af",
                flexShrink: 0,
              }}
            />
            <span>{v}</span>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "fill_blank") {
    return (
      <p style={{ paddingLeft: 20, fontSize: 13, lineHeight: "28px" }}>
        {q.text.split("______").map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <span
                style={{
                  display: "inline-block",
                  width: 100,
                  borderBottom: "1px solid #9ca3af",
                  margin: "0 4px",
                  verticalAlign: "bottom",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </p>
    );
  }

  if (q.type === "open") {
    return (
      <div style={{ paddingLeft: 20, marginTop: 6 }}>
        {Array.from({ length: q.lines || 4 }).map((_, i) => (
          <div
            key={i}
            style={{ borderBottom: "1px solid #d1d5db", height: 20, marginBottom: 11 }}
          />
        ))}
      </div>
    );
  }

  if (q.type === "image") {
    return (
      <div style={{ paddingLeft: 20 }}>
        {q.imageUrl && onUpdate ? (
          <ResizableImage q={q} isEditorMode={isEditorMode} onUpdate={onUpdate} />
        ) : q.imageUrl ? (
          // Student / print view — plain img, no controls
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.imageUrl}
            alt={q.imageCaption || "Question image"}
            crossOrigin="anonymous"
            style={{
              display: "block",
              width: q.imageWidth ?? 340,
              maxWidth: "100%",
              height: "auto",
              borderRadius: 4,
              border: "1px solid #e5e7eb",
              marginBottom: 8,
              ...(q.imageAlign === "center"
                ? { marginLeft: "auto", marginRight: "auto" }
                : q.imageAlign === "right"
                ? { marginLeft: "auto" }
                : {}),
            }}
          />
        ) : null}
        {q.imageCaption && !onUpdate && (
          <p style={{ fontSize: 11, textAlign: "center", color: "#6b7280", fontStyle: "italic", margin: "2px 0 6px" }}>
            {q.imageCaption}
          </p>
        )}
        {q.text && <p style={{ fontSize: 13, marginBottom: 8 }}>{q.text}</p>}
        {Array.from({ length: q.lines || 3 }).map((_, i) => (
          <div
            key={i}
            style={{ borderBottom: "1px solid #d1d5db", height: 20, marginBottom: 11 }}
          />
        ))}
      </div>
    );
  }

  if (q.type === "match" && q.matchPairs) {
    return (
      <div style={{ paddingLeft: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 28,
            rowGap: 4,
            fontSize: 13,
          }}
        >
          {["Column A", "Column B"].map((h) => (
            <div
              key={h}
              style={{
                fontWeight: 600,
                color: "#6b7280",
                borderBottom: "1px solid #d1d5db",
                paddingBottom: 4,
                marginBottom: 4,
                fontSize: 11,
              }}
            >
              {h}
            </div>
          ))}
          {q.matchPairs.map((p, i) => (
            <React.Fragment key={i}>
              <div>
                {String.fromCharCode(65 + i)}. {p.left || <em style={{ color: "#9ca3af" }}>—</em>}
              </div>
              <div>
                {i + 1}. {p.right || <em style={{ color: "#9ca3af" }}>—</em>}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Control button style ─────────────────────────────────────────────────── */

const ctrlBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 5,
  backgroundColor: "#f1f5f9",
  border: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#475569",
  padding: 0,
};

/* ─── Sortable question block ──────────────────────────────────────────────── */

function SortableQuestionBlock({
  q,
  index,
  isEditorMode,
  hasErrors,
  errorMessages,
  onRemove,
  onDuplicate,
  onUpdate,
  exam,
  totalPoints,
}: {
  q: Question;
  index: number;
  isEditorMode: boolean;
  hasErrors: boolean;
  errorMessages: string[];
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  exam: any;
  totalPoints: number;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    marginBottom: 22,
    breakInside: "avoid",
    pageBreakInside: "avoid",
  };

  const handleSave = (updates: Partial<Question>) => {
    onUpdate(q.id, updates);
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      {/* Editor controls — ignored by html2canvas via attribute */}
      {isEditorMode && !isEditing && (
        <div
          data-html2canvas-ignore="true"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{
            position: "absolute",
            right: 0,
            top: -14,
            display: "flex",
            gap: 4,
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {hasErrors && (
            <span title={errorMessages.join(" · ")} style={{ color: "#ef4444", display: "flex" }}>
              <AlertCircle style={{ width: 14, height: 14 }} />
            </span>
          )}
          <button onClick={() => setIsEditing(true)} style={ctrlBtn} title="Edit question">
            <Pencil style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={() => onDuplicate(q.id)}
            style={ctrlBtn}
            title="Duplicate question"
          >
            <Copy style={{ width: 11, height: 11 }} />
          </button>
          <button
            onClick={() => onRemove(q.id)}
            title="Remove question"
            style={{ ...ctrlBtn, backgroundColor: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5" }}
          >
            <X style={{ width: 11, height: 11 }} />
          </button>
        </div>
      )}

      {/* Drag handle */}
      {isEditorMode && !isEditing && (
        <div
          {...listeners}
          {...attributes}
          data-html2canvas-ignore="true"
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{
            position: "absolute",
            left: -22,
            top: 1,
            cursor: "grab",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
          }}
          title="Drag to reorder"
        >
          <GripVertical style={{ width: 14, height: 14 }} />
        </div>
      )}

      {/* Inline editor */}
      {isEditing ? (
        <QuestionEditorForm
          q={q}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          exam={exam}
          totalPoints={totalPoints}
        />
      ) : (
        <>
          {/* Question header */}
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#000", display: "flex", alignItems: "baseline", gap: 4 }}>
            <span>Q{index + 1}.</span>
            {q.type !== "image" && (
              <span style={{ flex: 1 }}>
                {q.text || (
                  <em
                    style={{ color: "#f59e0b", fontStyle: "normal", fontSize: 12 }}
                    onClick={isEditorMode ? () => setIsEditing(true) : undefined}
                  >
                    ⚠ Click edit to add question text
                  </em>
                )}
              </span>
            )}
            {q.type === "image" && <span style={{ flex: 1 }} />}
            <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11, flexShrink: 0 }}>
              ({q.points} pt{q.points !== 1 ? "s" : ""})
            </span>
          </p>

          {/* Show image if present (for any question type) */}
          {q.imageUrl && q.type !== "image" && (
            <div style={{ marginBottom: 12 }}>
              {onUpdate && isEditorMode ? (
                <ResizableImage q={q} isEditorMode={isEditorMode} onUpdate={onUpdate} />
              ) : (
                <div style={{ paddingLeft: 20 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={q.imageUrl}
                    alt={q.imageCaption || "Question image"}
                    crossOrigin="anonymous"
                    style={{
                      display: "block",
                      width: q.imageWidth ?? 340,
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 4,
                      border: "1px solid #e5e7eb",
                      marginBottom: 8,
                      ...(q.imageAlign === "center"
                        ? { marginLeft: "auto", marginRight: "auto" }
                        : q.imageAlign === "right"
                        ? { marginLeft: "auto" }
                        : {}),
                    }}
                  />
                  {q.imageCaption && (
                    <p style={{ fontSize: 11, textAlign: q.imageAlign || "left", color: "#6b7280", fontStyle: "italic", margin: "2px 0 6px", paddingLeft: 20 }}>
                      {q.imageCaption}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Type-specific body */}
          <QuestionBody q={q} isEditorMode={isEditorMode} onUpdate={onUpdate} />

        </>
      )}
    </div>
  );
}

/* ─── A4 page style ────────────────────────────────────────────────────────── */

const PAGE_STYLE: React.CSSProperties = {
  position: "relative",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  width: "210mm",
  minHeight: "297mm",
  padding: "20mm 20mm 20mm 24mm",
  fontFamily: "'Times New Roman', serif",
  color: "#000",
};

/* ─── Main ExamPreview component ───────────────────────────────────────────── */

interface ExamPreviewProps {
  importedTemplate?: any;
}

const ExamPreview = forwardRef<HTMLDivElement, ExamPreviewProps>(function ExamPreview({ importedTemplate }, ref) {
  const {
    exam,
    setTitle,
    setClassLevel,
    setSubject,
    setDuration,
    setInstructions,
    setTemplateId,
    removeQuestion,
    reorderQuestions,
    duplicateQuestion,
    updateQuestion,
    previewMode,
    validationErrors,
    totalPoints,
  } = useExam();

  const isEditorMode = previewMode === "edit";
  const isMobile = previewMode === "mobile";
  
  // Fetch selected template OR use imported template
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    async function loadTemplate() {
      // Use imported template if available and no templateId
      if (importedTemplate && !exam.templateId) {
        console.log('[ExamPreview] Using imported template:', {
          name: importedTemplate.name,
          hasLogoUrl: !!importedTemplate.logoUrl,
          logoUrlLength: importedTemplate.logoUrl?.length,
          logoPosition: importedTemplate.logoPosition,
          logoWidth: importedTemplate.logoPosition?.width,
          shouldShowImage: !!(importedTemplate.logoUrl && importedTemplate.logoPosition?.width > 200)
        });
        setSelectedTemplate(importedTemplate);
        return;
      }
      
      if (exam.templateId) {
        setLoadingTemplate(true);
        try {
          const { getTemplateById } = await import("@/lib/api/templates");
          const template = await getTemplateById(exam.templateId);
          console.log('[ExamPreview] Template loaded:', {
            id: template.id,
            name: template.name,
            hasLogoUrl: !!template.logoUrl,
            logoUrlLength: template.logoUrl?.length,
            logoPosition: template.logoPosition,
            logoWidth: template.logoPosition?.width,
            shouldShowImage: !!(template.logoUrl && template.logoPosition?.width > 200)
          });
          setSelectedTemplate(template);
        } catch (error) {
          console.error("Failed to load template:", error);
          setSelectedTemplate(null);
        } finally {
          setLoadingTemplate(false);
        }
      } else {
        setSelectedTemplate(null);
      }
    }
    loadTemplate();
  }, [exam.templateId, importedTemplate]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderQuestions(String(active.id), String(over.id));
    }
  };

  const mobilePageStyle: React.CSSProperties = isMobile
    ? {
        ...PAGE_STYLE,
        width: 390,
        minHeight: "auto",
        padding: "24px 18px",
        fontSize: "90%",
        boxShadow: "0 0 0 12px #1f2937, 0 0 0 14px #374151, 0 8px 32px rgba(0,0,0,0.4)",
        borderRadius: 24,
      }
    : PAGE_STYLE;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: isMobile ? "#1a1a2e" : "#f3f4f6",
        padding: isMobile ? "32px 24px" : "20px 24px 24px",
        transition: "background-color 0.3s",
      }}
    >
      {/* A4 document — everything inside ref goes to PDF */}
      <div
        ref={ref}
        style={{
          width: isMobile ? 390 : "210mm",
          margin: "0 auto",
          fontFamily: "'Times New Roman', serif",
          color: "#000",
        }}
      >
        <div style={mobilePageStyle}>
          {/* ── Header - Template Section ── */}
          {selectedTemplate && (
            // Render template header with layout settings
            <div
              style={{
                marginBottom: 20,
                paddingBottom: 14,
                fontFamily: selectedTemplate.fontFamily || "'Times New Roman', serif",
                lineHeight: (selectedTemplate.layoutSettings?.lineHeight || 14) / 10,
                position: "relative",
              }}
            >
              {/* Display imported image if logoUrl exists and is large */}
              {selectedTemplate.logoUrl && selectedTemplate.logoPosition?.width > 200 && (
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <img
                    src={selectedTemplate.logoUrl}
                    alt="Template Header"
                    {...(selectedTemplate.logoUrl.startsWith('http') ? { crossOrigin: 'anonymous' as const } : {})}
                    onLoad={() => console.log('[ExamPreview] Template image loaded successfully')}
                    onError={(e) => console.error('[ExamPreview] Template image failed to load:', e)}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 4,
                    }}
                  />
                </div>
              )}
              
              {selectedTemplate.layoutSettings?.showInstitutionName !== false && selectedTemplate.institutionName && (
                isEditorMode ? (
                  <input
                    data-html2canvas-ignore="true"
                    value={selectedTemplate.institutionName}
                    onChange={(e) => {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        institutionName: e.target.value
                      });
                    }}
                    placeholder="Institution Name"
                    style={{ 
                      fontSize: selectedTemplate.layoutSettings?.institutionNameSize || 18, 
                      fontWeight: 700, 
                      margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 8}px 0`,
                      color: selectedTemplate.primaryColor || "#000",
                      textAlign: selectedTemplate.layoutSettings?.institutionNameAlign || "center",
                      width: "100%",
                      backgroundColor: "transparent",
                      outline: "none",
                      border: "none",
                      borderBottom: "1px dashed #cbd5e1",
                    }}
                  />
                ) : (
                  <h1 
                    style={{ 
                      fontSize: selectedTemplate.layoutSettings?.institutionNameSize || 18, 
                      fontWeight: 700, 
                      margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 8}px 0`,
                      color: selectedTemplate.primaryColor || "#000",
                      textAlign: selectedTemplate.layoutSettings?.institutionNameAlign || "center"
                    }}
                  >
                    {selectedTemplate.institutionName}
                  </h1>
                )
              )}
              {selectedTemplate.layoutSettings?.showAddress !== false && selectedTemplate.institutionAddress && (
                isEditorMode ? (
                  <input
                    data-html2canvas-ignore="true"
                    value={selectedTemplate.institutionAddress}
                    onChange={(e) => {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        institutionAddress: e.target.value
                      });
                    }}
                    placeholder="Address"
                    style={{ 
                      fontSize: selectedTemplate.layoutSettings?.addressSize || 12, 
                      margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 6}px 0`,
                      color: selectedTemplate.secondaryColor || "#666",
                      textAlign: selectedTemplate.layoutSettings?.addressAlign || "center",
                      width: "100%",
                      backgroundColor: "transparent",
                      outline: "none",
                      border: "none",
                      borderBottom: "1px dashed #cbd5e1",
                    }}
                  />
                ) : (
                  <p style={{ 
                    fontSize: selectedTemplate.layoutSettings?.addressSize || 12, 
                    margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 6}px 0`,
                    color: selectedTemplate.secondaryColor || "#666",
                    textAlign: selectedTemplate.layoutSettings?.addressAlign || "center"
                  }}>
                    {selectedTemplate.institutionAddress}
                  </p>
                )
              )}
              {selectedTemplate.layoutSettings?.showContact !== false && (selectedTemplate.contactPhone || selectedTemplate.contactEmail) && (
                isEditorMode ? (
                  <div style={{ 
                    margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 6}px 0`,
                    textAlign: selectedTemplate.layoutSettings?.contactAlign || "center",
                    display: "flex",
                    gap: 8,
                    justifyContent: selectedTemplate.layoutSettings?.contactAlign === "left" ? "flex-start" : selectedTemplate.layoutSettings?.contactAlign === "right" ? "flex-end" : "center",
                  }}>
                    <input
                      data-html2canvas-ignore="true"
                      value={selectedTemplate.contactPhone || ""}
                      onChange={(e) => {
                        setSelectedTemplate({
                          ...selectedTemplate,
                          contactPhone: e.target.value
                        });
                      }}
                      placeholder="Phone"
                      style={{ 
                        fontSize: selectedTemplate.layoutSettings?.contactSize || 10, 
                        color: "#888",
                        backgroundColor: "transparent",
                        outline: "none",
                        border: "none",
                        borderBottom: "1px dashed #cbd5e1",
                        width: 140,
                        textAlign: "center",
                      }}
                    />
                    <span style={{ color: "#888", fontSize: selectedTemplate.layoutSettings?.contactSize || 10 }}>|</span>
                    <input
                      data-html2canvas-ignore="true"
                      value={selectedTemplate.contactEmail || ""}
                      onChange={(e) => {
                        setSelectedTemplate({
                          ...selectedTemplate,
                          contactEmail: e.target.value
                        });
                      }}
                      placeholder="Email"
                      style={{ 
                        fontSize: selectedTemplate.layoutSettings?.contactSize || 10, 
                        color: "#888",
                        backgroundColor: "transparent",
                        outline: "none",
                        border: "none",
                        borderBottom: "1px dashed #cbd5e1",
                        width: 180,
                        textAlign: "center",
                      }}
                    />
                  </div>
                ) : (
                  <p style={{ 
                    fontSize: selectedTemplate.layoutSettings?.contactSize || 10, 
                    margin: `0 0 ${selectedTemplate.layoutSettings?.headerSpacing || 6}px 0`, 
                    color: "#888",
                    textAlign: selectedTemplate.layoutSettings?.contactAlign || "center"
                  }}>
                    {[selectedTemplate.contactPhone, selectedTemplate.contactEmail].filter(Boolean).join(" | ")}
                  </p>
                )
              )}
              {selectedTemplate.layoutSettings?.showAcademicYear !== false && selectedTemplate.academicYear && (
                isEditorMode ? (
                  <input
                    data-html2canvas-ignore="true"
                    value={selectedTemplate.academicYear}
                    onChange={(e) => {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        academicYear: e.target.value
                      });
                    }}
                    placeholder="Academic Year"
                    style={{ 
                      fontSize: selectedTemplate.layoutSettings?.academicYearSize || 11, 
                      margin: "0 0 10px 0",
                      fontWeight: 600,
                      color: selectedTemplate.secondaryColor || "#666",
                      textAlign: selectedTemplate.layoutSettings?.academicYearAlign || "center",
                      width: "100%",
                      backgroundColor: "transparent",
                      outline: "none",
                      border: "none",
                      borderBottom: "1px dashed #cbd5e1",
                    }}
                  />
                ) : (
                  <p style={{ 
                    fontSize: selectedTemplate.layoutSettings?.academicYearSize || 11, 
                    margin: "0 0 10px 0",
                    fontWeight: 600,
                    color: selectedTemplate.secondaryColor || "#666",
                    textAlign: selectedTemplate.layoutSettings?.academicYearAlign || "center"
                  }}>
                    Academic Year: {selectedTemplate.academicYear}
                  </p>
                )
              )}
            </div>
          )}

          {/* Exam Title and Student Info Section - Toggleable */}
          <div style={{ position: "relative", marginTop: selectedTemplate ? 0 : 20 }}>
            {/* Hide/Show Button (Edit Mode Only) */}
            {isEditorMode && (
              <button
                data-html2canvas-ignore="true"
                onClick={() => {
                  const section = document.getElementById('exam-info-section');
                  if (section) {
                    section.style.display = section.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                className="absolute -top-8 right-0 text-xs text-[#8899bb] hover:text-[#0d1b3e] transition-colors z-10"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  backgroundColor: "#f9faff",
                  border: "1px solid #edf0f7",
                  borderRadius: 6,
                }}
                title="Toggle exam title and student info"
              >
                <Eye style={{ width: 12, height: 14 }} />
                Toggle Info
              </button>
            )}
            <div id="exam-info-section">
              {/* Exam Title */}
              <div style={{ borderTop: selectedTemplate ? "1px solid #ddd" : "2px solid #000", paddingTop: 10, marginTop: selectedTemplate ? 10 : 0, paddingBottom: 14, marginBottom: 20 }}>
                {isEditorMode ? (
                  <input
                    value={exam.title || ""}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Exam Title"
                    style={{
                      textAlign: "center",
                      fontSize: selectedTemplate ? 16 : 20,
                      fontWeight: selectedTemplate ? 600 : 700,
                      width: "100%",
                      backgroundColor: "transparent",
                      outline: "none",
                      border: "none",
                      color: "#000",
                    }}
                  />
                ) : (
                  <h2 style={{ fontSize: selectedTemplate ? 16 : 20, fontWeight: selectedTemplate ? 600 : 700, margin: 0, textAlign: "center" }}>{exam.title}</h2>
                )}
              </div>
              
              <div style={{ marginTop: 14 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}
            >
              <span>Name: ____________________________</span>
              <span>Date: _______________</span>
            </div>

            <div
              style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>Duration:</span>
                {isEditorMode ? (
                  <input
                    value={exam.duration || ""}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60 min"
                    style={{
                      width: 72,
                      backgroundColor: "transparent",
                      outline: "none",
                      borderBottom: "1px dashed #9ca3af",
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <span style={{ marginLeft: 4 }}>{exam.duration || "—"}</span>
                )}
              </div>
              <span>
                Total: {(() => {
                  const total = exam.questions.reduce((s, q) => s + (q.points || 0), 0);
                  return Number.isInteger(total) ? total : total.toFixed(1);
                })()} points
              </span>
            </div>

            {/* Class Level and Subject */}
            <div
              style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>Level:</span>
                {isEditorMode ? (
                  <input
                    value={exam.classLevel || ""}
                    onChange={(e) => setClassLevel(e.target.value as any)}
                    placeholder="e.g., 3rd Secondary"
                    style={{
                      width: 140,
                      backgroundColor: "transparent",
                      outline: "none",
                      borderBottom: "1px dashed #9ca3af",
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <span style={{ marginLeft: 4 }}>{exam.classLevel || "—"}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>Subject:</span>
                {isEditorMode ? (
                  <input
                    value={exam.subject || ""}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Mathematics"
                    style={{
                      width: 120,
                      backgroundColor: "transparent",
                      outline: "none",
                      borderBottom: "1px dashed #9ca3af",
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <span style={{ marginLeft: 4 }}>{exam.subject || "—"}</span>
                )}
              </div>
            </div>

            <div style={{ marginTop: 10, textAlign: "left" }}>
              {isEditorMode ? (
                <textarea
                  value={exam.instructions || ""}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instructions: Read all questions carefully before answering…"
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "#4b5563",
                    backgroundColor: "transparent",
                    outline: "none",
                    resize: "none",
                    border: "none",
                  }}
                />
              ) : (
                exam.instructions && (
                  <p style={{ fontSize: 12, fontStyle: "italic", color: "#4b5563", margin: 0 }}>
                    {exam.instructions}
                  </p>
                )
              )}
            </div>
            </div>
            </div>
          </div>

          {/* ── Body ── */}
          {exam.questions.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 220,
                color: "#d1d5db",
              }}
            >
              <p style={{ fontSize: 17, fontWeight: 500 }}>No questions yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {isEditorMode
                  ? 'Use "Add question" below or click questions from the bank'
                  : "No questions have been added to this exam"}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={exam.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {exam.questions.map((q, i) => (
                  <SortableQuestionBlock
                    key={q.id}
                    q={q}
                    index={i}
                    isEditorMode={isEditorMode}
                    hasErrors={!!validationErrors[q.id]}
                    errorMessages={validationErrors[q.id] ?? []}
                    onRemove={removeQuestion}
                    onDuplicate={duplicateQuestion}
                    onUpdate={updateQuestion}
                    exam={exam}
                    totalPoints={totalPoints}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Add question button — below the A4 page, not captured in PDF */}
      {isEditorMode && (
        <div
          style={{
            width: "210mm",
            margin: "12px auto 0",
          }}
        >
          <QuestionCreator />
        </div>
      )}
    </div>
  );
});

export default ExamPreview;
