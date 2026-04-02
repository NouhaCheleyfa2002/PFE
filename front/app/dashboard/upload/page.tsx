"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DocumentPreview } from "@/components/preview/DocumentPreview";
import { useResources } from "@/lib/resources-context";
import {
  Upload,
  FileText,
  File,
  X,
  Check,
  Eye,
  Unlock,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CloudUpload,
  Sparkles,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const SUBJECTS = [
  "Cardiology",
  "Neurology",
  "Pediatrics",
  "Surgery",
  "Internal Medicine",
  "Radiology",
  "Oncology",
  "Emergency Medicine",
];
const LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Master",
  "Residency",
];
const TYPES = [
  "Course Notes",
  "QCM",
  "Case Study",
  "Exam",
  "Video Lecture",
  "Presentation",
];

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadedFileInfo {
  fid: string;
  fileUrl: string;
  fileName: string;
  size: number;
}

export default function UploadPage() {
  const router = useRouter();
  const { addResource } = useResources();
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [license, setLicense] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Only PDF, DOCX, and PPTX files are allowed.";
    }
    if (file.size > 100 * 1024 * 1024) {
      return "File too large. Maximum size is 100MB.";
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
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setUploadStatus("idle");
      setUploadProgress(0);
      setUploadedFile(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setUploadStatus("idle");
      setUploadProgress(0);
      setUploadedFile(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          setUploadedFile({
            fid: data.fid,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            size: data.size,
          });
          setUploadStatus("success");
        } catch {
          setErrorMessage("Failed to parse server response");
          setUploadStatus("error");
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          setErrorMessage(error.message || "Upload failed");
        } catch {
          setErrorMessage("Upload failed");
        }
        setUploadStatus("error");
      }
    });

    xhr.addEventListener("error", () => {
      setErrorMessage("Network error occurred");
      setUploadStatus("error");
    });

    xhr.addEventListener("abort", () => {
      setErrorMessage("Upload cancelled");
      setUploadStatus("idle");
      setUploadProgress(0);
    });

    xhr.open("POST", `${API_URL}/upload`);
    xhr.send(formData);
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
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
    if (ext === "pdf") return <FileText className="w-6 h-6 text-red-500" />;
    if (ext === "docx" || ext === "doc")
      return <File className="w-6 h-6 text-blue-500" />;
    if (ext === "pptx" || ext === "ppt")
      return <File className="w-6 h-6 text-orange-500" />;
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const isFormValid = title && subject && level && type;

  const handlePublish = () => {
    if (!uploadedFile || !isFormValid) return;
    
    setIsPublishing(true);
    
    // Simulate a small delay for UX
    setTimeout(() => {
      addResource({
        title,
        subject,
        level,
        type,
        keywords,
        description,
        license,
        price,
        fileUrl: uploadedFile.fileUrl,
        fileName: uploadedFile.fileName,
        fid: uploadedFile.fid,
        fileSize: uploadedFile.size,
      });
      
      setCurrentStep(3);
      setIsPublishing(false);
    }, 500);
  };

  const goToNextStep = () => {
    if (currentStep === 1 && uploadStatus === "success") {
      setCurrentStep(2);
    } else if (currentStep === 2 && isFormValid) {
      handlePublish();
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 1: Upload File
  const renderUploadStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#e8f4fc] flex items-center justify-center mx-auto mb-4">
            <CloudUpload className="w-8 h-8 text-[#63b3ed]" />
          </div>
          <h2
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-xl font-semibold text-[#0d1b3e] mb-2"
          >
            Upload Your File
          </h2>
          <p className="text-sm text-[#8899bb]">
            Select a PDF, Word, or PowerPoint file to upload
          </p>
        </div>

        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
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
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-[#c0d0e8] mx-auto mb-4" />
            <p className="font-semibold text-[#0d1b3e] mb-1">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-[#8899bb]">
              PDF, Word, or PowerPoint - Max 100 MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f9faff] border border-[#edf0f7]">
              <div className="w-14 h-14 rounded-lg bg-white border border-[#edf0f7] flex items-center justify-center">
                {getFileIcon(selectedFile.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0d1b3e] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-[#8899bb]">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {uploadStatus === "success" ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="p-2 rounded-lg hover:bg-[#edf0f7] transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-5 h-5 text-[#63b3ed]" />
                  </button>
                </div>
              ) : uploadStatus === "uploading" ? (
                <button
                  onClick={handleCancelUpload}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={handleRemoveFile}
                  className="p-2 rounded-lg hover:bg-[#edf0f7] transition-colors"
                >
                  <X className="w-5 h-5 text-[#8899bb]" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {uploadStatus === "uploading" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8899bb]">Uploading...</span>
                  <span className="font-medium text-[#0d1b3e]">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="h-3 bg-[#edf0f7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#63b3ed] to-[#4299e1] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadStatus === "success" && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-600">
                  File uploaded successfully! Click &quot;Continue&quot; to add details.
                </p>
              </div>
            )}

            {/* Upload Button */}
            {uploadStatus === "idle" && (
              <button
                onClick={handleUpload}
                className="w-full py-3.5 rounded-xl bg-[#0d1b3e] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#1a2d5a] transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload File
              </button>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      {uploadStatus === "success" && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={goToNextStep}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#63b3ed] text-white font-medium hover:bg-[#4299e1] transition-colors"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  // Step 2: Add Details
  const renderDetailsStep = () => (
    <div className="max-w-2xl mx-auto">
      {/* Uploaded File Preview Card */}
      {uploadedFile && selectedFile && (
        <div className="bg-white rounded-2xl border border-[#edf0f7] p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#f9faff] border border-[#edf0f7] flex items-center justify-center">
              {getFileIcon(selectedFile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0d1b3e] truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-[#8899bb]">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f9faff] border border-[#edf0f7] text-[#63b3ed] hover:bg-[#edf0f7] transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#edf0f7] p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#e8f4fc] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[#63b3ed]" />
          </div>
          <h2
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-xl font-semibold text-[#0d1b3e] mb-2"
          >
            Add Resource Details
          </h2>
          <p className="text-sm text-[#8899bb]">
            Provide information about your educational resource
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Cardiology QCM Pack 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
                Subject *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all bg-white text-[#0d1b3e]"
              >
                <option value="">Select...</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
                Level *
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all bg-white text-[#0d1b3e]"
              >
                <option value="">Select...</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all bg-white text-[#0d1b3e]"
              >
                <option value="">Select...</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
              Keywords
            </label>
            <input
              type="text"
              placeholder="e.g., ECG, arrhythmia, infarctus (comma separated)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all bg-white text-[#0d1b3e]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
              Description
            </label>
            <textarea
              placeholder="Brief description of the content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all resize-none bg-white text-[#0d1b3e]"
            />
          </div>

          {/* License */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-3">
              License
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  license === "free"
                    ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
                    : "border-[#edf0f7] hover:border-[#c0d0e8]"
                }`}
              >
                <input
                  type="radio"
                  name="license"
                  value="free"
                  checked={license === "free"}
                  onChange={() => setLicense("free")}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    license === "free"
                      ? "bg-[#63b3ed] text-white"
                      : "bg-[#f0f4f8] text-[#8899bb]"
                  }`}
                >
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#0d1b3e]">Free</p>
                  <p className="text-xs text-[#8899bb]">Open access</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  license === "paid"
                    ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]"
                    : "border-[#edf0f7] hover:border-[#c0d0e8]"
                }`}
              >
                <input
                  type="radio"
                  name="license"
                  value="paid"
                  checked={license === "paid"}
                  onChange={() => setLicense("paid")}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    license === "paid"
                      ? "bg-[#63b3ed] text-white"
                      : "bg-[#f0f4f8] text-[#8899bb]"
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#0d1b3e]">Paid</p>
                  <p className="text-xs text-[#8899bb]">Set your price</p>
                </div>
              </label>
            </div>

            {license === "paid" && (
              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8899bb] mb-2">
                  Price (TND)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 15"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-40 px-4 py-3 rounded-xl border border-[#edf0f7] text-sm outline-none focus:border-[#63b3ed] transition-all bg-white text-[#0d1b3e]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={goToPreviousStep}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={goToNextStep}
          disabled={!isFormValid || isPublishing}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            isFormValid && !isPublishing
              ? "bg-[#63b3ed] text-white hover:bg-[#4299e1]"
              : "bg-[#edf0f7] text-[#aab4cc] cursor-not-allowed"
          }`}
        >
          {isPublishing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              Publish Resource
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Step 3: Success
  const renderSuccessStep = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#edf0f7] p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-green-600" />
        </div>
        <h2
          style={{ fontFamily: "var(--font-heading), sans-serif" }}
          className="text-2xl font-bold text-[#0d1b3e] mb-3"
        >
          Resource Published!
        </h2>
        <p className="text-[#8899bb] mb-6 max-w-md mx-auto">
          Your resource &quot;{title}&quot; has been successfully published and is now available in your resources library.
        </p>

        {/* Preview Button */}
        {uploadedFile && (
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f9faff] border border-[#edf0f7] text-[#63b3ed] font-medium hover:bg-[#edf0f7] transition-colors mb-8"
          >
            <Eye className="w-5 h-5" />
            Preview Document
          </button>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/dashboard/resources")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0d1b3e] text-white font-medium hover:bg-[#1a2d5a] transition-colors"
          >
            <FileText className="w-5 h-5" />
            View My Resources
          </button>
          <button
            onClick={() => {
              // Reset form
              setSelectedFile(null);
              setUploadedFile(null);
              setUploadStatus("idle");
              setUploadProgress(0);
              setErrorMessage(null);
              setCurrentStep(1);
              setTitle("");
              setSubject("");
              setLevel("");
              setType("");
              setKeywords("");
              setDescription("");
              setLicense("free");
              setPrice("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#edf0f7] text-[#4a5568] font-medium hover:bg-[#f9faff] transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1
          style={{ fontFamily: "var(--font-heading), sans-serif" }}
          className="text-2xl font-bold text-[#0d1b3e]"
        >
          Upload Course Material
        </h1>
        <p className="text-sm text-[#8899bb] mt-1">
          Share your educational resources with the community
        </p>
      </div>

      {/* Steps Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <button
          onClick={() => currentStep > 1 && uploadStatus === "success" && setCurrentStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentStep === 1
              ? "bg-[#63b3ed] text-white"
              : currentStep > 1
              ? "bg-green-500 text-white"
              : "bg-[#edf0f7] text-[#8899bb]"
          }`}
        >
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
            {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
          </span>
          Upload File
        </button>
        <ChevronRight className="w-5 h-5 text-[#c0d0e8]" />
        <button
          onClick={() => currentStep > 2 && setCurrentStep(2)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentStep === 2
              ? "bg-[#63b3ed] text-white"
              : currentStep > 2
              ? "bg-green-500 text-white"
              : "bg-[#edf0f7] text-[#8899bb]"
          }`}
        >
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
            {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
          </span>
          Add Details
        </button>
        <ChevronRight className="w-5 h-5 text-[#c0d0e8]" />
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            currentStep === 3
              ? "bg-green-500 text-white"
              : "bg-[#edf0f7] text-[#8899bb]"
          }`}
        >
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
            {currentStep === 3 ? <Check className="w-4 h-4" /> : "3"}
          </span>
          Published
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderUploadStep()}
      {currentStep === 2 && renderDetailsStep()}
      {currentStep === 3 && renderSuccessStep()}

      {/* Document Preview Modal */}
      {showPreview && uploadedFile && (
        <DocumentPreview
          fileUrl={uploadedFile.fileUrl}
          fileName={uploadedFile.fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
