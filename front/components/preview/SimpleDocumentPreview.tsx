"use client";

import React, { useState, useEffect } from "react";
import { X, Download, ExternalLink, FileText, Loader2 } from "lucide-react";

interface SimpleDocumentPreviewProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

type FileType = "pdf" | "image" | "other";

function getFileType(fileName: string | undefined): FileType {
  if (!fileName) return "other";
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "image";
  return "other";
}

export function SimpleDocumentPreview({ fileUrl, fileName, onClose }: SimpleDocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileType = getFileType(fileName);

  useEffect(() => {
    // Reset states when fileUrl changes
    setLoading(fileType === "pdf" || fileType === "image"); // Only show loading for PDF and images
    setError(null);
  }, [fileUrl, fileType]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError("Failed to load document");
  };

  const handleDownload = () => {
    try {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      window.open(fileUrl, "_blank");
    }
  };

  const handleOpenNewTab = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-white shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-[#0d1b3e] truncate">{fileName}</h2>
            <p className="text-sm text-[#8899bb]">{fileType.toUpperCase()} File</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f9faff] text-[#63b3ed] hover:bg-[#63b3ed] hover:text-white transition-colors text-sm font-medium"
              title="Download"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handleOpenNewTab}
              className="p-2 rounded-lg hover:bg-[#f9faff] text-[#8899bb] hover:text-[#0d1b3e] transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#f9faff] text-[#8899bb] hover:text-red-500 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-[#f6f8ff] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#63b3ed] mx-auto mb-2" />
                <p className="text-sm text-[#8899bb]">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center p-8">
                <FileText className="w-16 h-16 text-[#8899bb] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                  Unable to Preview
                </h3>
                <p className="text-sm text-[#8899bb] mb-6 max-w-md">
                  This document cannot be previewed in the browser. Please download it to view.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download File
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-lg border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {fileType === "pdf" && (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}

          {fileType === "image" && (
            <div className="flex items-center justify-center h-full p-6 overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          )}

          {fileType === "other" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <FileText className="w-16 h-16 text-[#8899bb] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                  Preview Not Available
                </h3>
                <p className="text-sm text-[#8899bb] mb-2 max-w-md">
                  Preview is not available for {fileName?.split(".").pop()?.toUpperCase() || 'this'} files in the browser.
                </p>
                <p className="text-xs text-[#aab4cc] mb-6 max-w-md">
                  Download the file to view it with the appropriate application on your device.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download File
                  </button>
                  <button
                    onClick={handleOpenNewTab}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-[#edf0f7] text-[#0d1b3e] font-medium hover:bg-[#f9faff] transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open in New Tab
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
