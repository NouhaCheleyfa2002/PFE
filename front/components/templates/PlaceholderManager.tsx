"use client";

import React, { useState } from "react";
import {
  Copy,
  Plus,
  Trash2,
  GripVertical,
  User,
  UserCheck,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  FileText,
  Award,
} from "lucide-react";

/**
 * PlaceholderManager Component
 * 
 * Manages placeholders for exam templates.
 * Allows adding, removing, and configuring placeholder positions.
 * 
 * Requirements: 6.1-6.6 (Task 10.5)
 */

interface Placeholder {
  id: string;
  key: string;
  label: string;
  position: { x: number; y: number };
  fontSize?: number;
  textColor?: string;
  showEmpty?: boolean;
  showUnderline?: boolean;
}

interface PlaceholderManagerProps {
  placeholders?: Placeholder[];
  onChange?: (placeholders: Placeholder[]) => void;
}

// Available placeholder types with sample data
const AVAILABLE_PLACEHOLDERS = [
  {
    key: "{{StudentName}}",
    label: "Student Name",
    icon: User,
    sampleData: "Ahmed Ben Ali",
  },
  {
    key: "{{Teacher}}",
    label: "Teacher",
    icon: UserCheck,
    sampleData: "Prof. Fatima Zahra",
  },
  {
    key: "{{Subject}}",
    label: "Subject",
    icon: BookOpen,
    sampleData: "Mathematics",
  },
  {
    key: "{{Class}}",
    label: "Class Level",
    icon: GraduationCap,
    sampleData: "4ème Sciences",
  },
  {
    key: "{{Date}}",
    label: "Exam Date",
    icon: Calendar,
    sampleData: "January 15, 2025",
  },
  {
    key: "{{Duration}}",
    label: "Duration",
    icon: Clock,
    sampleData: "2 hours",
  },
  {
    key: "{{AcademicYear}}",
    label: "Academic Year",
    icon: Calendar,
    sampleData: "2024-2025",
  },
  {
    key: "{{ExamTitle}}",
    label: "Exam Title",
    icon: FileText,
    sampleData: "Final Exam",
  },
  {
    key: "{{TotalMarks}}",
    label: "Total Marks",
    icon: Award,
    sampleData: "100",
  },
];

export function PlaceholderManager({
  placeholders = [],
  onChange,
}: PlaceholderManagerProps) {
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);

  const handleAddPlaceholder = (placeholderType: typeof AVAILABLE_PLACEHOLDERS[0]) => {
    // Check if already added
    const exists = placeholders.some((p) => p.key === placeholderType.key);
    if (exists) {
      alert(`${placeholderType.label} is already added`);
      return;
    }

    const newPlaceholder: Placeholder = {
      id: `placeholder-${Date.now()}`,
      key: placeholderType.key,
      label: placeholderType.label,
      position: { x: 50, y: 200 + placeholders.length * 30 },
      fontSize: 12,
      textColor: "#000000",
      showEmpty: true,
      showUnderline: true,
    };

    const updated = [...placeholders, newPlaceholder];
    if (onChange) {
      onChange(updated);
    }
  };

  const handleRemovePlaceholder = (id: string) => {
    const updated = placeholders.filter((p) => p.id !== id);
    if (onChange) {
      onChange(updated);
    }
  };

  const handleUpdatePlaceholder = (
    id: string,
    field: keyof Placeholder,
    value: any
  ) => {
    const updated = placeholders.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    if (onChange) {
      onChange(updated);
    }
  };

  const handlePositionChange = (id: string, axis: "x" | "y", value: number) => {
    const updated = placeholders.map((p) =>
      p.id === id ? { ...p, position: { ...p.position, [axis]: value } } : p
    );
    if (onChange) {
      onChange(updated);
    }
  };

  const validatePlaceholders = (): string | null => {
    for (const placeholder of placeholders) {
      if (!placeholder.key || !placeholder.key.match(/^\{\{[A-Za-z]+\}\}$/)) {
        return `Invalid placeholder syntax: ${placeholder.key}. Use format: {{PlaceholderName}}`;
      }
    }
    return null;
  };

  const validationError = validatePlaceholders();

  return (
    <div className="space-y-6">
      {/* Available Placeholders */}
      <div>
        <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
          Available Placeholders
        </h3>
        <p className="text-sm text-[#8899bb] mb-4">
          Click to add a placeholder to your template
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_PLACEHOLDERS.map((placeholder) => {
            const Icon = placeholder.icon;
            const isAdded = placeholders.some((p) => p.key === placeholder.key);
            
            return (
              <button
                key={placeholder.key}
                onClick={() => handleAddPlaceholder(placeholder)}
                disabled={isAdded}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  isAdded
                    ? "border-green-200 bg-green-50 cursor-not-allowed"
                    : "border-[#edf0f7] bg-white hover:border-[#63b3ed] hover:bg-[#f9faff]"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isAdded ? "bg-green-100" : "bg-[#e8f4fc]"
                }`}>
                  <Icon className={`w-4 h-4 ${isAdded ? "text-green-600" : "text-[#63b3ed]"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isAdded ? "text-green-900" : "text-[#0d1b3e]"}`}>
                    {placeholder.label}
                  </p>
                  <p className="text-xs text-[#8899bb] truncate">
                    {placeholder.sampleData}
                  </p>
                </div>
                {isAdded && (
                  <Copy className="w-4 h-4 text-green-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Added Placeholders */}
      {placeholders.length > 0 && (
        <div className="pt-6 border-t border-[#edf0f7]">
          <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
            Added Placeholders ({placeholders.length})
          </h3>
          
          <div className="space-y-3">
            {placeholders.map((placeholder) => (
              <div
                key={placeholder.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlaceholder === placeholder.id
                    ? "border-[#63b3ed] bg-[#f9faff]"
                    : "border-[#edf0f7] bg-white"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#c0d0e8] cursor-move" />
                    <span className="font-medium text-[#0d1b3e]">
                      {placeholder.label}
                    </span>
                    <code className="text-xs bg-[#f9faff] px-2 py-1 rounded text-[#63b3ed]">
                      {placeholder.key}
                    </code>
                  </div>
                  <button
                    onClick={() => handleRemovePlaceholder(placeholder.id)}
                    className="p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#8899bb] mb-1">
                      X Position (px)
                    </label>
                    <input
                      type="number"
                      value={placeholder.position.x}
                      onChange={(e) =>
                        handlePositionChange(
                          placeholder.id,
                          "x",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 text-sm bg-white border border-[#edf0f7] rounded focus:outline-none focus:ring-1 focus:ring-[#63b3ed]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8899bb] mb-1">
                      Y Position (px)
                    </label>
                    <input
                      type="number"
                      value={placeholder.position.y}
                      onChange={(e) =>
                        handlePositionChange(
                          placeholder.id,
                          "y",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 text-sm bg-white border border-[#edf0f7] rounded focus:outline-none focus:ring-1 focus:ring-[#63b3ed]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8899bb] mb-1">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={placeholder.fontSize}
                      onChange={(e) =>
                        handleUpdatePlaceholder(
                          placeholder.id,
                          "fontSize",
                          parseInt(e.target.value) || 12
                        )
                      }
                      min="8"
                      max="24"
                      className="w-full px-2 py-1 text-sm bg-white border border-[#edf0f7] rounded focus:outline-none focus:ring-1 focus:ring-[#63b3ed]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8899bb] mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={placeholder.textColor || "#000000"}
                      onChange={(e) =>
                        handleUpdatePlaceholder(placeholder.id, "textColor", e.target.value)
                      }
                      className="w-full h-8 rounded border border-[#edf0f7] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-4 mt-3">
                  <label className="flex items-center gap-2 text-sm text-[#0d1b3e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={placeholder.showEmpty ?? true}
                      onChange={(e) =>
                        handleUpdatePlaceholder(placeholder.id, "showEmpty", e.target.checked)
                      }
                      className="rounded border-[#edf0f7] text-[#63b3ed] focus:ring-[#63b3ed]"
                    />
                    Show if empty
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#0d1b3e] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={placeholder.showUnderline ?? true}
                      onChange={(e) =>
                        handleUpdatePlaceholder(placeholder.id, "showUnderline", e.target.checked)
                      }
                      className="rounded border-[#edf0f7] text-[#63b3ed] focus:ring-[#63b3ed]"
                    />
                    Show underline
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {validationError}
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 rounded-lg bg-[#f9faff] border border-[#edf0f7]">
        <p className="text-sm text-[#8899bb]">
          <strong className="text-[#0d1b3e]">💡 Tip:</strong> Placeholders will
          be automatically filled with exam data when you use this template.
          Adjust positions to match your desired layout.
        </p>
      </div>
    </div>
  );
}
