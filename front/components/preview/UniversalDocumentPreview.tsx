"use client";

import React from "react";
import { X, Download } from "lucide-react";

interface UniversalDocumentPreviewProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

export function UniversalDocumentPreview({ fileUrl, fileName, onClose }: UniversalDocumentPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-[#f9faff]">
          <h3 className="text-lg font-semibold text-[#0d1b3e]">
            {fileName || 'Document Preview'}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#e8ecf4] text-[#8899bb] hover:text-[#0d1b3e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content - Simple iframe that works for PDF, and browser handles other types */}
        <div className="flex-1 relative bg-[#525659]">
          <iframe
            src={fileUrl}
            className="absolute inset-0 w-full h-full border-0"
            title={fileName || 'Document'}
          />
        </div>
      </div>
    </div>
  );
}
