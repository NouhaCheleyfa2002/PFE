"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  compressImage,
  blobToFile,
  validateImageFile,
  createImagePreview,
  revokeImagePreview,
  getImageDimensions,
} from "@/lib/utils/image-utils";
import { Image as ImageIcon, Upload, X, Loader2, CheckCircle } from "lucide-react";
import { authService } from "@/lib/auth";

/**
 * LogoUploader Component
 * 
 * Upload and manage institution logos for templates.
 * Compresses images while maintaining quality >90%.
 * 
 * Requirements: 15.1-15.6 (Task 15.2)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface LogoUploaderProps {
  currentLogoUrl?: string;
  onLogoUploaded?: (logoUrl: string, position: { x: number; y: number; width: number; height: number }) => void;
  onError?: (error: string) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function LogoUploader({
  currentLogoUrl,
  onLogoUploaded,
  onError,
}: LogoUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentLogoUrl changes
  useEffect(() => {
    if (currentLogoUrl) {
      setPreviewUrl(currentLogoUrl);
    }
  }, [currentLogoUrl]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        revokeImagePreview(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setErrorMessage(null);
    setUploadStatus("idle");

    // Validate file
    const validationError = validateImageFile(file, 10);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadStatus("error");
      if (onError) {
        onError(validationError);
      }
      return;
    }

    setSelectedFile(file);

    // Create preview
    const preview = createImagePreview(file);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      revokeImagePreview(previewUrl);
    }
    setPreviewUrl(preview);

    // Auto-upload
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploadStatus("uploading");
    setErrorMessage(null);

    try {
      // Compress image (maintain quality >90%)
      const compressedBlob = await compressImage(file, 2, 0.92);
      const compressedFile = blobToFile(
        compressedBlob,
        `logo_${Date.now()}.${file.type.split("/")[1]}`
      );

      console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)} KB`);

      // Get image dimensions for logo position
      const dimensions = await getImageDimensions(file);

      // Upload to backend
      const formData = new FormData();
      formData.append("files", compressedFile);

      const token = authService.getToken();
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      const uploadedDoc = data.documents?.[0];

      if (!uploadedDoc || !uploadedDoc.storageUrl) {
        throw new Error("Upload succeeded but no URL returned");
      }

      const logoUrl = uploadedDoc.storageUrl;

      // Calculate default logo position (top-left corner)
      const logoPosition = {
        x: 50,
        y: 20,
        width: Math.min(dimensions.width / 4, 100),
        height: Math.min(dimensions.height / 4, 100),
      };

      setUploadStatus("success");

      // Callback with logo URL and position
      if (onLogoUploaded) {
        onLogoUploaded(logoUrl, logoPosition);
      }
    } catch (error: any) {
      console.error("Failed to upload logo:", error);
      const errorMsg = error.message || "Failed to upload logo";
      setErrorMessage(errorMsg);
      setUploadStatus("error");
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      revokeImagePreview(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadStatus("idle");
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-[#0d1b3e] mb-2">
        Institution Logo
      </label>

      {/* Preview or Upload Zone */}
      {previewUrl ? (
        <div className="relative">
          {/* Preview */}
          <div className="relative w-full h-48 rounded-xl bg-[#f9faff] border-2 border-[#edf0f7] flex items-center justify-center overflow-hidden">
            <img
              src={previewUrl}
              alt="Logo preview"
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Loading Overlay */}
            {uploadStatus === "uploading" && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-[#63b3ed] animate-spin mx-auto mb-2" />
                  <p className="text-sm text-[#8899bb]">Uploading...</p>
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {uploadStatus === "success" && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-lg flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" />
                Uploaded
              </div>
            )}
          </div>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            aria-label="Remove logo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="relative w-full h-48 rounded-xl bg-[#f9faff] border-2 border-dashed border-[#dde2ef] hover:border-[#63b3ed] hover:bg-[rgba(99,179,237,0.02)] transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-full bg-[#e8f4fc] flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[#63b3ed]" />
          </div>
          <div className="text-center">
            <p className="font-medium text-[#0d1b3e] mb-1">
              Upload Institution Logo
            </p>
            <p className="text-sm text-[#8899bb]">
              PNG or JPG - Max 10 MB
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadStatus === "error" && errorMessage && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Info Text */}
      <p className="text-xs text-[#8899bb]">
        Images will be automatically compressed while maintaining high quality (&gt;90%).
        Your logo will appear in the top corner of all exam documents.
      </p>
    </div>
  );
}
