"use client";

import React, { useState, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize, Loader2 } from "lucide-react";

/**
 * LivePreview Component
 * 
 * Displays a live preview of the exam template.
 * Generates PDF preview with 500ms debounce.
 * 
 * Requirements: 7.1, 7.4, 7.5, 7.6 (Task 11.1)
 */

interface TemplateConfig {
  institutionName?: string;
  institutionAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  academicYear?: string;
  logoUrl?: string;
  logoPosition?: { x: number; y: number; width: number; height: number };
  pageMargins?: { top: number; bottom: number; left: number; right: number };
  pageOrientation?: "portrait" | "landscape";
  footerText?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  fontFamily?: string;
  primaryColor?: string;
  secondaryColor?: string;
  placeholders?: Array<{
    key: string;
    label: string;
    position: { x: number; y: number };
    fontSize?: number;
  }>;
}

interface LivePreviewProps {
  config: TemplateConfig;
  zoomLevel?: number;
}

export function LivePreview({ config, zoomLevel = 100 }: LivePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [zoom, setZoom] = useState(zoomLevel);
  const previewRef = useRef<HTMLDivElement>(null);
  const [debouncedConfig, setDebouncedConfig] = useState(config);

  // Debounce config updates (500ms)
  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
      setIsGenerating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [config]);

  // Generate preview when debounced config changes
  useEffect(() => {
    generatePreview(debouncedConfig);
  }, [debouncedConfig]);

  const generatePreview = (templateConfig: TemplateConfig) => {
    // Generate HTML preview (simplified version - real PDF generation would use jsPDF)
    const html = `
      <div style="
        width: ${templateConfig.pageOrientation === "landscape" ? "800px" : "600px"};
        height: ${templateConfig.pageOrientation === "landscape" ? "565px" : "800px"};
        margin: 0 auto;
        padding: ${templateConfig.pageMargins?.top || 72}px 
                 ${templateConfig.pageMargins?.right || 72}px 
                 ${templateConfig.pageMargins?.bottom || 72}px 
                 ${templateConfig.pageMargins?.left || 72}px;
        background: white;
        border: 1px solid #edf0f7;
        border-radius: 8px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-family: ${templateConfig.fontFamily || "Helvetica"}, sans-serif;
      ">
        ${
          templateConfig.logoUrl
            ? `
          <div style="
            position: absolute;
            left: ${templateConfig.logoPosition?.x || 50}px;
            top: ${templateConfig.logoPosition?.y || 20}px;
            width: ${templateConfig.logoPosition?.width || 80}px;
            height: ${templateConfig.logoPosition?.height || 80}px;
          ">
            <img src="${templateConfig.logoUrl}" 
                 alt="Logo" 
                 style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        `
            : ""
        }
        
        <div style="text-align: center; margin-bottom: 30px;">
          ${
            templateConfig.institutionName
              ? `<h1 style="
              font-size: 20px;
              font-weight: bold;
              color: ${templateConfig.primaryColor || "#000000"};
              margin: 0 0 12px 0;
            ">${templateConfig.institutionName}</h1>`
              : ""
          }
          
          ${
            templateConfig.institutionAddress
              ? `<p style="
              font-size: 12px;
              color: ${templateConfig.secondaryColor || "#666666"};
              margin: 0 0 8px 0;
            ">${templateConfig.institutionAddress}</p>`
              : ""
          }
          
          ${
            templateConfig.contactPhone || templateConfig.contactEmail
              ? `<p style="font-size: 11px; color: #8899bb; margin: 0 0 8px 0;">
              ${[templateConfig.contactPhone, templateConfig.contactEmail].filter(Boolean).join(" | ")}
            </p>`
              : ""
          }
          
          ${
            templateConfig.academicYear
              ? `<p style="
              font-size: 11px;
              color: ${templateConfig.secondaryColor || "#666666"};
              font-weight: 600;
              background: #f0f0f0;
              display: inline-block;
              padding: 4px 16px;
              border-radius: 12px;
              margin: 8px 0 0 0;
            ">Academic Year: ${templateConfig.academicYear}</p>`
              : ""
          }
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-bottom: 20px;"></div>
        
        ${
          templateConfig.placeholders && templateConfig.placeholders.length > 0
            ? templateConfig.placeholders
                .map(
                  (p) => `
          <div style="
            position: absolute;
            left: ${p.position.x}px;
            top: ${p.position.y}px;
            font-size: ${p.fontSize || 12}px;
            color: #000000;
          ">
            <strong>${p.label}:</strong> <span style="color: #63b3ed;">[Sample Data]</span>
          </div>
        `
                )
                .join("")
            : ""
        }
        
        ${
          templateConfig.watermarkText
            ? `<div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            font-weight: bold;
            color: #DDDDDD;
            opacity: ${(templateConfig.watermarkOpacity || 30) / 100};
            pointer-events: none;
            white-space: nowrap;
          ">${templateConfig.watermarkText}</div>`
            : ""
        }
        
        ${
          templateConfig.footerText
            ? `<div style="
            position: absolute;
            bottom: ${templateConfig.pageMargins?.bottom || 72}px;
            left: ${templateConfig.pageMargins?.left || 72}px;
            right: ${templateConfig.pageMargins?.right || 72}px;
            text-align: center;
            font-size: 9px;
            color: #888888;
            border-top: 1px solid #e0e0e0;
            padding-top: 8px;
          ">${templateConfig.footerText}</div>`
            : ""
        }
      </div>
    `;

    setPreviewHtml(html);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  return (
    <div className="h-full flex flex-col bg-[#f9faff]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#edf0f7]">
        <h3 className="text-sm font-semibold text-[#0d1b3e]">Live Preview</h3>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-[#8899bb]" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="px-3 py-1 text-sm font-medium text-[#0d1b3e] hover:bg-[#f9faff] rounded-lg transition-colors"
            title="Reset Zoom"
          >
            {zoom}%
          </button>
          
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-[#8899bb]" />
          </button>
          
          <div className="w-px h-6 bg-[#edf0f7] mx-2" />
          
          <button
            onClick={() => setZoom(100)}
            className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors"
            title="Fit to View"
          >
            <Maximize className="w-4 h-4 text-[#8899bb]" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-6 relative">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#63b3ed] animate-spin mx-auto mb-2" />
              <p className="text-sm text-[#8899bb]">Updating preview...</p>
            </div>
          </div>
        )}

        <div
          ref={previewRef}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease-out",
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

        {!previewHtml && !isGenerating && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#e8f4fc] flex items-center justify-center mx-auto mb-4">
                <Maximize className="w-8 h-8 text-[#63b3ed]" />
              </div>
              <p className="text-[#8899bb]">
                Configure your template to see a preview
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
