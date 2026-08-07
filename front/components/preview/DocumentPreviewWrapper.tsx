"use client";

import React, { Component, ReactNode } from "react";
import { DocumentPreview } from "./DocumentPreview";
import { X, AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DocumentPreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DocumentPreview Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <button
              onClick={this.props.onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#f9faff] transition-colors"
            >
              <X className="w-5 h-5 text-[#8899bb]" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                Preview Error
              </h3>
              
              <p className="text-sm text-[#8899bb] mb-4">
                Unable to preview this document. The file may be corrupted or in an unsupported format.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={this.props.onClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-[#edf0f7] text-[#4a5568] text-sm font-medium hover:bg-[#f9faff] transition-colors"
                >
                  Close
                </button>
                <a
                  href={this.props.fileUrl}
                  download={this.props.fileName}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors text-center"
                >
                  Download File
                </a>
              </div>
              
              {this.state.error && (
                <details className="mt-4 w-full text-left">
                  <summary className="text-xs text-[#8899bb] cursor-pointer hover:text-[#0d1b3e]">
                    Error details
                  </summary>
                  <pre className="mt-2 p-2 bg-[#f9faff] rounded text-xs text-red-600 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function DocumentPreviewWrapper({
  fileUrl,
  fileName,
  onClose,
}: {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}) {
  return (
    <DocumentPreviewErrorBoundary fileUrl={fileUrl} fileName={fileName} onClose={onClose}>
      <DocumentPreview fileUrl={fileUrl} fileName={fileName} onClose={onClose} />
    </DocumentPreviewErrorBoundary>
  );
}
