"use client";

import React, { useState } from "react";
import { type TemplateResponse, deleteTemplate } from "@/lib/api/templates";
import {
  FileText,
  Edit,
  Trash2,
  Calendar,
  Building2,
  MoreVertical,
  Check,
  Loader2,
  Copy,
} from "lucide-react";

/**
 * TemplateCard Component
 * 
 * Displays a single template with preview information and actions.
 * Supports glassmorphism styling and interactive states.
 * 
 * Requirements: 10.2, 10.3, 14.1-14.7
 */

interface TemplateCardProps {
  template: TemplateResponse;
  onSelect?: (template: TemplateResponse) => void;
  onEdit?: (template: TemplateResponse) => void;
  onDuplicate?: (template: TemplateResponse) => void;
  onDeleted?: (templateId: string) => void;
  onUpdated?: () => void;
}

export function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDuplicate,
  onDeleted,
  onUpdated,
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCardClick = () => {
    if (onSelect && !showMenu && !showDeleteConfirm) {
      onSelect(template);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) {
      onEdit(template);
    } else {
      // Default behavior: trigger selection which can open TemplateBuilder
      if (onSelect) {
        onSelect(template);
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDuplicate) {
      onDuplicate(template);
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTemplate(template.id);
      if (onDeleted) {
        onDeleted(template.id);
      }
    } catch (err: any) {
      console.error("Failed to delete template:", err);
      setDeleteError(err.message || "Failed to delete template");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    setDeleteError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Glassmorphism card styling
  const cardBaseClasses = `
    relative group
    bg-white
    rounded-2xl
    border border-[#edf0f7]
    p-6
    cursor-pointer
    transition-all duration-300
    hover:shadow-xl
    hover:border-[#63b3ed]
    hover:scale-[1.02]
  `;

  return (
    <div className={cardBaseClasses} onClick={handleCardClick}>
      {/* Header with Icon and Menu */}
      <div className="flex items-start justify-between mb-4">
        {/* Template Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8f4fc] to-[#d4ebf9] flex items-center justify-center">
          <FileText className="w-7 h-7 text-[#63b3ed]" />
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-5 h-5 text-[#8899bb]" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-[#edf0f7] py-2 z-10">
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[#0d1b3e] hover:bg-[#f9faff] transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm">Edit</span>
              </button>
              <button
                onClick={handleDuplicate}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[#0d1b3e] hover:bg-[#f9faff] transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm">Duplicate</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Template Name */}
      <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2 line-clamp-2">
        {template.name}
      </h3>

      {/* Institution Info */}
      {template.institutionName && (
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-[#8899bb]" />
          <p className="text-sm text-[#8899bb] line-clamp-1">
            {template.institutionName}
          </p>
        </div>
      )}

      {/* Academic Year Badge */}
      {template.academicYear && (
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e8f4fc] mb-3">
          <span className="text-xs font-medium text-[#63b3ed]">
            {template.academicYear}
          </span>
        </div>
      )}

      {/* Last Modified */}
      <div className="flex items-center gap-2 text-xs text-[#c0d0e8] mt-4 pt-4 border-t border-[#f0f3f9]">
        <Calendar className="w-3.5 h-3.5" />
        <span>Modified {formatDate(template.updatedAt)}</span>
      </div>

      {/* Default Template Badge */}
      {template.isDefault && (
        <div className="absolute top-4 right-4 px-2 py-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-medium">
          Default
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div
          className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h4 className="text-base font-semibold text-[#0d1b3e] mb-2">
            Delete Template?
          </h4>
          <p className="text-sm text-[#8899bb] text-center mb-4">
            This action cannot be undone.
          </p>

          {deleteError && (
            <p className="text-sm text-red-600 mb-3 text-center">{deleteError}</p>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-[#f9faff] text-[#0d1b3e] rounded-lg hover:bg-[#edf0f7] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Click backdrop to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}
