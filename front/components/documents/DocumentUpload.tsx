"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";

interface UploadedDocument {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
}

interface DocumentWithStatus extends UploadedDocument {
  fileSize?: number;
  processedAt?: string;
  ocrResultUrl?: string;
  errorMessage?: string;
}

export default function DocumentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [myDocuments, setMyDocuments] = useState<DocumentWithStatus[]>([]);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate PDF files only
      const pdfFiles = selectedFiles.filter(file => file.type === "application/pdf");
      
      if (pdfFiles.length !== selectedFiles.length) {
        setError("Only PDF files are allowed");
        return;
      }
      
      setFiles(pdfFiles);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one PDF file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const token = authService.getToken();
      const response = await fetch("http://localhost:3000/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      setUploadedDocs(result.documents);
      setFiles([]);
      
      // Refresh document list
      await fetchMyDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const fetchMyDocuments = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch("http://localhost:3000/documents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyDocuments(data.documents);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  React.useEffect(() => {
    fetchMyDocuments();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMyDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200";
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0d1b3e] mb-2">Document Processing</h1>
        <p className="text-[#5a7299]">Upload PDF documents for OCR processing</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-[#edf0f7] p-6 mb-6">
        <h2 className="text-xl font-bold text-[#0d1b3e] mb-4">Upload Documents</h2>
        
        <div className="mb-4">
          <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-[#edf0f7] border-dashed rounded-lg appearance-none cursor-pointer hover:border-[#63b3ed] focus:outline-none">
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-[#5a7299]" />
              <span className="font-medium text-[#5a7299]">
                Click to select PDF files
              </span>
              <span className="text-xs text-[#aab4cc]">
                Multiple files supported (max 10 files, 100MB each)
              </span>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept="application/pdf"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#0d1b3e] mb-2">
              Selected Files ({files.length})
            </h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-[#f9faff] rounded-lg"
                >
                  <FileText className="w-4 h-4 text-[#63b3ed]" />
                  <span className="text-sm text-[#0d1b3e]">{file.name}</span>
                  <span className="text-xs text-[#5a7299] ml-auto">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full px-4 py-3 bg-[#63b3ed] text-white font-semibold rounded-lg hover:bg-[#5aa3d9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </span>
          ) : (
            "Upload Documents"
          )}
        </button>
      </div>

      {/* My Documents */}
      <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#0d1b3e]">My Documents</h2>
          <button
            onClick={fetchMyDocuments}
            className="text-sm text-[#63b3ed] hover:underline"
          >
            Refresh
          </button>
        </div>

        {myDocuments.length === 0 ? (
          <div className="text-center py-8 text-[#5a7299]">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-3">
            {myDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 border border-[#edf0f7] rounded-lg hover:shadow-md transition-shadow"
              >
                <FileText className="w-8 h-8 text-[#63b3ed] shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0d1b3e] truncate">
                    {doc.originalName}
                  </h3>
                  <p className="text-xs text-[#5a7299]">
                    Uploaded: {new Date(doc.createdAt).toLocaleString()}
                  </p>
                  {doc.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {getStatusIcon(doc.status)}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(doc.status)}`}
                  >
                    {doc.status.toUpperCase()}
                  </span>
                </div>

                {doc.ocrResultUrl && (
                  <a
                    href={doc.ocrResultUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-[#63b3ed] text-white text-xs font-semibold rounded-lg hover:bg-[#5aa3d9] transition-colors"
                  >
                    View OCR
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
