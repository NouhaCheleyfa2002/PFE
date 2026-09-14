"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, Check, Sparkles, FileText, Brain } from "lucide-react";
import toast from "react-hot-toast";
import {
  EDUCATION_LEVELS,
  BAC_SECTIONS,
  getSubjectsForLevel,
  getSubjectsForBacSection,
  requiresBacSection,
  type EducationLevel,
  type BacSection,
} from "@/lib/education-config";

interface PublishExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: string;
  examTitle: string;
  questionCount?: number; // Number of questions in the exam
  onPublished: () => void;
  previewRef?: React.RefObject<HTMLDivElement> | React.RefObject<HTMLDivElement | null>; // Reference to exam preview for PDF generation
  previewMode?: string; // Current preview mode
  setPreviewMode?: (mode: any) => void; // Function to change preview mode
}

interface Collaborator {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  role: string;
  status: string;
  permissions?: {
    revenue?: number;
  };
}

export function PublishExamModal({
  isOpen,
  onClose,
  examId,
  examTitle,
  questionCount = 0,
  onPublished,
  previewRef,
  previewMode,
  setPreviewMode,
}: PublishExamModalProps) {
  const [title, setTitle] = useState(examTitle || "");
  const [level, setLevel] = useState<EducationLevel | "">("");
  const [bacSection, setBacSection] = useState<BacSection | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [license, setLicense] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [revenueShares, setRevenueShares] = useState<Record<string, number>>({});
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Dynamic subjects based on level
  const availableSubjects = level
    ? requiresBacSection(level as EducationLevel) && bacSection
      ? getSubjectsForBacSection(level as EducationLevel, bacSection as BacSection)
      : getSubjectsForLevel(level as EducationLevel)
    : [];

  useEffect(() => {
    if (isOpen) {
      setTitle(examTitle || "");
      setError(null);
      fetchCollaborators();
    }
  }, [isOpen, examTitle]);

  // Fetch accepted collaborators
  const fetchCollaborators = async () => {
    setLoadingCollaborators(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3000/collaboration/exams/${examId}/collaborators`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only accepted collaborators
        const acceptedCollaborators = data.filter((c: Collaborator) => c.status === 'accepted');
        setCollaborators(acceptedCollaborators);
        
        // Initialize revenue shares from existing permissions
        const initialShares: Record<string, number> = {};
        acceptedCollaborators.forEach((c: Collaborator) => {
          initialShares[c.userId] = c.permissions?.revenue || 0;
        });
        setRevenueShares(initialShares);
      }
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  // Reset subject when level changes
  useEffect(() => {
    setSubject("");
  }, [level, bacSection]);

  // Calculate total revenue share
  const totalRevenueShare = Object.values(revenueShares).reduce((sum, val) => sum + val, 0);
  const hostShare = 100 - totalRevenueShare;

  const isFormValid =
    title &&
    level &&
    subject &&
    (!requiresBacSection(level as EducationLevel) || bacSection) &&
    (license === "free" || (license === "paid" && price && parseFloat(price) > 0)) &&
    (license === "free" || totalRevenueShare <= 100); // Ensure revenue shares don't exceed 100%

  const handlePublish = async () => {
    if (!isFormValid) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate price if paid
    if (license === "paid" && (!price || parseFloat(price) <= 0)) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

      // Convert keywords string to array
      const keywordsArray = keywords
        ? keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
        : [];

      const publishPayload = {
        title,
        classLevel: level,
        subject,
        bacSection: bacSection || undefined,
        description: description.trim() || undefined,
        keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
        license,
        price: license === "paid" && price ? parseFloat(price) : undefined,
        revenueShares: license === "paid" && Object.keys(revenueShares).length > 0 ? revenueShares : undefined,
      };

      console.log("Publishing exam:", examId, publishPayload);

      // Generate PDF from preview if ref is available
      let pdfBlob: Blob | null = null;
      if (previewRef && previewRef.current) {
        try {
          toast.loading("Generating PDF...", { id: "pdf-gen" });
          
          // Save current preview mode and switch to student mode for clean PDF capture
          const originalMode = previewMode;
          if (setPreviewMode) {
            setPreviewMode("student");
            // Wait for DOM to update
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const html2canvas = (await import("html2canvas-pro")).default;
          const { jsPDF } = await import("jspdf");

          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            letterRendering: true,
            imageTimeout: 0,
            removeContainer: true,
          });

          // Restore original preview mode
          if (setPreviewMode && originalMode) {
            setPreviewMode(originalMode as any);
          }

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

          pdfBlob = pdf.output("blob");
          toast.success("PDF generated!", { id: "pdf-gen" });
          console.log("PDF generated successfully, size:", pdfBlob.size);
        } catch (pdfError) {
          console.error("PDF generation failed:", pdfError);
          toast.error("PDF generation failed, publishing without PDF", { id: "pdf-gen" });
          
          // Restore original preview mode on error
          if (setPreviewMode && previewMode) {
            setPreviewMode(previewMode as any);
          }
        }
      }

      // Create FormData to send PDF + metadata
      const formData = new FormData();
      formData.append("metadata", JSON.stringify(publishPayload));
      if (pdfBlob) {
        formData.append("pdf", pdfBlob, `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      }

      const response = await fetch(`${API_URL}/exams/${examId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Exam published successfully:", result);
        toast.success("📧 Exam published! Confirmation email sent", {
          duration: 5000,
          icon: "✅",
        });
        onPublished();
        onClose();
      } else {
        const errorText = await response.text();
        console.error("Failed to publish exam:", response.status, errorText);
        setError(`Failed to publish exam: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to publish exam:", error);
      setError("Failed to publish exam. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Publish Exam</h2>
              <p className="text-sm text-gray-500">Fill in metadata for marketplace submission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isPublishing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Question Summary Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Publishing Features</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Your exam will be published with <strong>{questionCount} questions</strong> in two formats
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">PDF (Read-only)</span>
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">Interactive Practice</span>
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Bac Sciences SVT - Biology Final Exam"
            />
          </div>

          {/* Education Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Education Level <span className="text-red-500">*</span>
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as EducationLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Level</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Bac Section (conditional) */}
          {level && requiresBacSection(level as EducationLevel) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bac Section <span className="text-red-500">*</span>
              </label>
              <select
                value={bacSection}
                onChange={(e) => setBacSection(e.target.value as BacSection)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Section</option>
                {BAC_SECTIONS.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!level || (requiresBacSection(level as EducationLevel) && !bacSection)}
            >
              <option value="">Select Subject</option>
              {availableSubjects.map((subj) => (
                <option key={subj.id} value={subj.name}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the exam content and scope..."
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., biology, cell structure, genetics, photosynthesis"
            />
          </div>

          {/* License */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLicense("free")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  license === "free"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  {license === "free" && <Check className="w-5 h-5 text-blue-600" />}
                  <span className="font-medium">Free</span>
                </div>
                <p className="text-xs text-gray-600">Available to all users</p>
              </button>

              <button
                type="button"
                onClick={() => setLicense("paid")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  license === "paid"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  {license === "paid" && <Check className="w-5 h-5 text-blue-600" />}
                  <span className="font-medium">Paid</span>
                </div>
                <p className="text-xs text-gray-600">Requires purchase</p>
              </button>
            </div>
          </div>

          {/* Price (conditional) */}
          {license === "paid" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (TND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Revenue Share Distribution - Only for paid exams with collaborators */}
              {collaborators.length > 0 && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">%</span>
                    </div>
                    Revenue Share Distribution
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Set the percentage of revenue each collaborator will receive from sales of this exam
                  </p>

                  <div className="space-y-3">
                    {collaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{collab.userName}</p>
                          <p className="text-xs text-gray-500">{collab.userEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={revenueShares[collab.userId] || 0}
                            onChange={(e) => {
                              const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setRevenueShares(prev => ({
                                ...prev,
                                [collab.userId]: value
                              }));
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">%</span>
                        </div>
                      </div>
                    ))}

                    {/* Host Share Display */}
                    <div className="flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-300">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <span>Your Share (Host)</span>
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">You</span>
                        </p>
                        <p className="text-xs text-gray-600">Remaining revenue after collaborator shares</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          hostShare < 0 ? 'text-red-600' :
                          hostShare === 0 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {hostShare}%
                        </p>
                      </div>
                    </div>

                    {/* Warning if total exceeds 100% */}
                    {totalRevenueShare > 100 && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          Total revenue share cannot exceed 100%. Please reduce the percentages.
                        </p>
                      </div>
                    )}

                    {/* Info */}
                    <p className="text-xs text-gray-500 italic">
                      Revenue is automatically distributed when students purchase this exam. You can adjust these percentages later in the exam settings.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What happens when you publish:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
              <li>• PDF file will be automatically generated</li>
              <li>• Interactive practice mode will be enabled for students</li>
              <li>• Your exam will be submitted for admin review</li>
              <li>• Once approved, it will appear in the marketplace</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!isFormValid || isPublishing}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Publish Exam
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
