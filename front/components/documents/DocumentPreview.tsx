"use client";

import React, { useState, useEffect } from "react";
import { X, Download, ExternalLink, FileText } from "lucide-react";

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    title: string;
    fileUrl: string;
    fileName: string;
    type: string;
    author?: string;
  };
}

export default function DocumentPreview({ isOpen, onClose, document }: DocumentPreviewProps) {
  if (!isOpen) return null;

  const fileExtension = document.fileName.split(".").pop()?.toLowerCase();
  const isPDF = fileExtension === "pdf";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "");

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.fileUrl;
    link.download = document.fileName;
    link.click();
  };

  const handleOpenNewTab = () => {
    window.open(document.fileUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-white">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-[#0d1b3e] truncate">{document.title}</h2>
            {document.author && (
              <p className="text-sm text-[#8899bb]">by {document.author}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f9faff] text-[#63b3ed] hover:bg-[#63b3ed] hover:text-white transition-colors text-sm font-medium"
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
        <div className="flex-1 overflow-auto bg-[#f6f8ff] p-6">
          <div className="flex justify-center">
            {isPDF ? (
              <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-4xl">
                {/* Use iframe for PDF preview as a simpler alternative */}
                <iframe
                  src={document.fileUrl}
                  className="w-full h-[calc(90vh-200px)]"
                  title={document.title}
                  style={{ border: "none" }}
                />
              </div>
            ) : isImage ? (
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <img
                  src={document.fileUrl}
                  alt={document.title}
                  className="max-w-full h-auto"
                  style={{ maxHeight: "calc(90vh - 200px)" }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center bg-white rounded-lg shadow-lg p-8">
                <FileText className="w-16 h-16 text-[#8899bb] mb-4" />
                <p className="text-[#8899bb] mb-6">
                  Preview not available for {fileExtension?.toUpperCase()} files.
                </p>
                <div className="flex gap-3">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
