"use client";

import React, { useState, useCallback, useRef } from "react";
import { extractMetadata, type ExtractedMetadata } from "@/lib/api/templates";
import { Upload, FileImage, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

/**
 * HeaderUploadZone Component
 * 
 * Drag-and-drop file upload zone for header documents.
 * Validates file type/size, uploads to storage, and extracts metadata via AI.
 * 
 * Requirements: 2.1-2.5 (Task 10.2)
 */

interface HeaderUploadZoneProps {
  onMetadataExtracted?: (metadata: ExtractedMetadata) => void;
  onError?: (error: string) => void;
}

type UploadStatus = "idle" | "uploading" | "extracting" | "success" | "error";

export function HeaderUploadZone({
  onMetadataExtracted,
  onError,
}: HeaderUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allowed file types
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Only PDF, PNG, and JPG files are allowed.";
    }
    if (file.size > maxSizeInBytes) {
      return "File size exceeds the maximum limit of 10MB.";
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Reset state
    setErrorMessage(null);
    setUploadProgress(0);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadStatus("error");
      if (onError) {
        onError(validationError);
      }
      return;
    }

    setUploadedFile(file);
    setUploadStatus("uploading");

    // Simulate upload progress (since extractMetadata doesn't provide progress)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Call extractMetadata API
      setUploadStatus("extracting");
      setUploadProgress(90);

      const metadata = await extractMetadata(file);

      // Success!
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("success");

      // Callback with extracted metadata
      if (onMetadataExtracted) {
        onMetadataExtracted(metadata);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error("Failed to extract metadata:", error);
      const errorMsg = error.message || "Failed to extract metadata from document";
      setErrorMessage(errorMsg);
      setUploadStatus("error");
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileImage className="w-6 h-6 text-red-500" />;
    if (ext === "png" || ext === "jpg" || ext === "jpeg")
      return <FileImage className="w-6 h-6 text-blue-500" />;
    return <FileImage className="w-6 h-6 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {uploadStatus === "idle" && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
              : "border-[#dde2ef] bg-[#f9faff] hover:border-[#63b3ed] hover:bg-[rgba(99,179,237,0.02)]"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-full bg-[#e8f4fc] flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-[#63b3ed]" />
          </div>
          <h3 className="font-semibold text-[#0d1b3e] mb-2">
            Upload Header Document
          </h3>
          <p className="text-sm text-[#8899bb] mb-1">
            Drop your institution header document here or click to browse
          </p>
          <p className="text-xs text-[#c0d0e8]">
            PDF, PNG, or JPG - Max 10 MB
          </p>
        </div>
      )}

      {/* Uploading/Extracting State */}
      {(uploadStatus === "uploading" || uploadStatus === "extracting") && uploadedFile && (
        <div className="p-6 rounded-xl bg-white border border-[#edf0f7]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#f9faff] border border-[#edf0f7] flex items-center justify-center">
              {getFileIcon(uploadedFile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0d1b3e] truncate">
                {uploadedFile.name}
              </p>
              <p className="text-sm text-[#8899bb]">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            <Loader2 className="w-6 h-6 text-[#63b3ed] animate-spin" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8899bb]">
                {uploadStatus === "uploading" ? "Uploading..." : "Extracting metadata..."}
              </span>
              <span className="font-medium text-[#0d1b3e]">
                {uploadProgress}%
              </span>
            </div>
            <div className="h-2 bg-[#edf0f7] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#63b3ed] to-[#4299e1] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {uploadStatus === "extracting" && (
            <p className="text-xs text-[#8899bb] mt-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#63b3ed] rounded-full animate-pulse" />
              AI is analyzing your document...
            </p>
          )}
        </div>
      )}

      {/* Success State */}
      {uploadStatus === "success" && uploadedFile && (
        <div className="p-6 rounded-xl bg-green-50 border border-green-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                Metadata Extracted Successfully
              </h4>
              <p className="text-sm text-green-700 mb-3">
                Institution information has been automatically extracted from{" "}
                <strong>{uploadedFile.name}</strong>
              </p>
              <button
                onClick={handleReset}
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                Upload a different document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadStatus === "error" && (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Upload Failed</h4>
              <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
              <button
                onClick={handleReset}
                className="text-sm text-red-700 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {uploadStatus === "idle" && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">AI-Powered Extraction</p>
            <p className="text-blue-700">
              Our AI will automatically detect your institution's name, address,
              contact information, and logo from the uploaded document.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
