"use client";

import * as React from "react";
import { Upload, FileText, X, Check, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentPreview } from "@/components/preview/DocumentPreview";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface UploadedFile {
  fid: string;
  fileName: string;
  fileUrl: string;
  size: number;
}

interface FileUploadProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  className?: string;
  showPreview?: boolean;
}

export function FileUpload({
  onUploadComplete,
  onError,
  className,
  showPreview = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExtensions = [".pdf", ".docx"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Only PDF and DOCX files are allowed.";
    }
    if (file.size > maxSize) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setUploadedFile(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data: UploadedFile = await response.json();
      setUploadedFile(data);
      onUploadComplete?.(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during upload";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          selectedFile && "cursor-default",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedExtensions.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <Upload className="text-muted-foreground mb-4 h-10 w-10" />
            <p className="text-muted-foreground mb-1 text-sm font-medium">
              Drag & drop your file here
            </p>
            <p className="text-muted-foreground/70 text-xs">
              or click to browse
            </p>
            <p className="text-muted-foreground/50 mt-2 text-xs">
              PDF or DOCX • Max 10MB
            </p>
          </>
        ) : (
          <div className="flex w-full items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
              <FileText className="text-primary h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            {uploadedFile ? (
              <Check className="h-5 w-5 shrink-0 text-green-500" />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {selectedFile && !uploadedFile && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="mt-4 w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </>
          )}
        </Button>
      )}

      {uploadedFile && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            File uploaded successfully!
          </p>
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            File ID: {uploadedFile.fid}
          </p>
          {showPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="mt-2"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview File
            </Button>
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      {isPreviewOpen && uploadedFile && (
        <DocumentPreview
          fileUrl={uploadedFile.fileUrl}
          fileName={uploadedFile.fileName}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}
