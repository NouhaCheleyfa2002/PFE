"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Type,
  Palette,
  FileText,
  Droplet,
  Maximize2,
} from "lucide-react";

/**
 * ComponentConfigurator Component
 * 
 * Advanced template configuration for layout, styling, and components.
 * Updates live preview with 500ms debounce.
 * 
 * Requirements: 5.1-5.8 (Task 10.4)
 */

interface ComponentConfig {
  logoPosition: { x: number; y: number; width: number; height: number };
  pageMargins: { top: number; bottom: number; left: number; right: number };
  pageOrientation: "portrait" | "landscape";
  footerText: string;
  watermarkText: string;
  watermarkOpacity: number;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
}

interface ComponentConfiguratorProps {
  initialConfig?: Partial<ComponentConfig>;
  onChange?: (config: ComponentConfig) => void;
}

const FONT_OPTIONS = [
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times New Roman" },
  { value: "Courier", label: "Courier" },
  { value: "Helvetica-Bold", label: "Helvetica Bold" },
  { value: "Times-Bold", label: "Times Bold" },
  { value: "Courier-Bold", label: "Courier Bold" },
  { value: "Helvetica-Oblique", label: "Helvetica Italic" },
  { value: "Times-Italic", label: "Times Italic" },
  { value: "Courier-Oblique", label: "Courier Italic" },
  { value: "Symbol", label: "Symbol" },
];

export function ComponentConfigurator({
  initialConfig,
  onChange,
}: ComponentConfiguratorProps) {
  const [config, setConfig] = useState<ComponentConfig>({
    logoPosition: initialConfig?.logoPosition || { x: 50, y: 20, width: 80, height: 80 },
    pageMargins: initialConfig?.pageMargins || { top: 72, bottom: 72, left: 72, right: 72 },
    pageOrientation: initialConfig?.pageOrientation || "portrait",
    footerText: initialConfig?.footerText || "",
    watermarkText: initialConfig?.watermarkText || "",
    watermarkOpacity: initialConfig?.watermarkOpacity ?? 30,
    fontFamily: initialConfig?.fontFamily || "Helvetica",
    primaryColor: initialConfig?.primaryColor || "#000000",
    secondaryColor: initialConfig?.secondaryColor || "#666666",
  });

  const [debouncedConfig, setDebouncedConfig] = useState(config);

  // Update config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        logoPosition: initialConfig.logoPosition || { x: 50, y: 20, width: 80, height: 80 },
        pageMargins: initialConfig.pageMargins || { top: 72, bottom: 72, left: 72, right: 72 },
        pageOrientation: initialConfig.pageOrientation || "portrait",
        footerText: initialConfig.footerText || "",
        watermarkText: initialConfig.watermarkText || "",
        watermarkOpacity: initialConfig.watermarkOpacity ?? 30,
        fontFamily: initialConfig.fontFamily || "Helvetica",
        primaryColor: initialConfig.primaryColor || "#000000",
        secondaryColor: initialConfig.secondaryColor || "#666666",
      });
    }
  }, [initialConfig]);

  // Debounce updates (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedConfig(config);
    }, 500);

    return () => clearTimeout(timer);
  }, [config]);

  // Notify parent when debounced config changes
  useEffect(() => {
    if (onChange) {
      onChange(debouncedConfig);
    }
  }, [debouncedConfig, onChange]);

  const handleChange = (field: keyof ComponentConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (
    parent: "logoPosition" | "pageMargins",
    field: string,
    value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Logo Position Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-[#63b3ed]" />
          Logo Position & Size
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              X Position (px)
            </label>
            <input
              type="number"
              value={config.logoPosition.x}
              onChange={(e) => handleNestedChange("logoPosition", "x", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Y Position (px)
            </label>
            <input
              type="number"
              value={config.logoPosition.y}
              onChange={(e) => handleNestedChange("logoPosition", "y", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Width (px)
            </label>
            <input
              type="number"
              value={config.logoPosition.width}
              onChange={(e) => handleNestedChange("logoPosition", "width", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Height (px)
            </label>
            <input
              type="number"
              value={config.logoPosition.height}
              onChange={(e) => handleNestedChange("logoPosition", "height", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
        </div>
      </div>

      {/* Page Margins Section */}
      <div className="space-y-4 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <Layout className="w-4 h-4 text-[#63b3ed]" />
          Page Margins
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Top (mm)
            </label>
            <input
              type="number"
              value={config.pageMargins.top}
              onChange={(e) => handleNestedChange("pageMargins", "top", parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Bottom (mm)
            </label>
            <input
              type="number"
              value={config.pageMargins.bottom}
              onChange={(e) => handleNestedChange("pageMargins", "bottom", parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Left (mm)
            </label>
            <input
              type="number"
              value={config.pageMargins.left}
              onChange={(e) => handleNestedChange("pageMargins", "left", parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-1">
              Right (mm)
            </label>
            <input
              type="number"
              value={config.pageMargins.right}
              onChange={(e) => handleNestedChange("pageMargins", "right", parseInt(e.target.value) || 0)}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
            />
          </div>
        </div>
      </div>

      {/* Page Orientation Section */}
      <div className="space-y-3 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e]">
          Page Orientation
        </h3>
        
        <div className="flex gap-3">
          <button
            onClick={() => handleChange("pageOrientation", "portrait")}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              config.pageOrientation === "portrait"
                ? "border-[#63b3ed] bg-[#e8f4fc] text-[#0d1b3e]"
                : "border-[#edf0f7] bg-white text-[#8899bb] hover:border-[#c0d0e8]"
            }`}
          >
            Portrait
          </button>
          <button
            onClick={() => handleChange("pageOrientation", "landscape")}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              config.pageOrientation === "landscape"
                ? "border-[#63b3ed] bg-[#e8f4fc] text-[#0d1b3e]"
                : "border-[#edf0f7] bg-white text-[#8899bb] hover:border-[#c0d0e8]"
            }`}
          >
            Landscape
          </button>
        </div>
      </div>

      {/* Footer Text Section */}
      <div className="space-y-3 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#63b3ed]" />
          Footer Text
        </h3>
        
        <div>
          <textarea
            value={config.footerText}
            onChange={(e) => handleChange("footerText", e.target.value)}
            placeholder="e.g., For official use only"
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed] resize-none"
          />
          <p className="text-xs text-[#c0d0e8] mt-1">
            {config.footerText.length} / 500 characters
          </p>
        </div>
      </div>

      {/* Watermark Section */}
      <div className="space-y-3 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <Droplet className="w-4 h-4 text-[#63b3ed]" />
          Watermark
        </h3>
        
        <div>
          <label className="block text-xs font-medium text-[#8899bb] mb-2">
            Text
          </label>
          <input
            type="text"
            value={config.watermarkText}
            onChange={(e) => handleChange("watermarkText", e.target.value)}
            placeholder="e.g., CONFIDENTIAL"
            maxLength={200}
            className="w-full px-4 py-3 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] placeholder-[#c0d0e8] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
          />
          <p className="text-xs text-[#c0d0e8] mt-1">
            {config.watermarkText.length} / 200 characters
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#8899bb] mb-2">
            Opacity: {config.watermarkOpacity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={config.watermarkOpacity}
            onChange={(e) => handleChange("watermarkOpacity", parseInt(e.target.value))}
            className="w-full h-2 bg-[#edf0f7] rounded-lg appearance-none cursor-pointer accent-[#63b3ed]"
          />
          <div className="flex justify-between text-xs text-[#c0d0e8] mt-1">
            <span>Transparent</span>
            <span>Opaque</span>
          </div>
        </div>
      </div>

      {/* Typography Section */}
      <div className="space-y-3 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <Type className="w-4 h-4 text-[#63b3ed]" />
          Typography
        </h3>
        
        <div>
          <label className="block text-xs font-medium text-[#8899bb] mb-2">
            Font Family
          </label>
          <select
            value={config.fontFamily}
            onChange={(e) => handleChange("fontFamily", e.target.value)}
            className="w-full px-4 py-3 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Color Pickers Section */}
      <div className="space-y-3 pt-4 border-t border-[#edf0f7]">
        <h3 className="text-base font-semibold text-[#0d1b3e] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#63b3ed]" />
          Colors
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="w-12 h-12 rounded-lg border border-[#edf0f7] cursor-pointer"
              />
              <input
                type="text"
                value={config.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                placeholder="#000000"
                className="flex-1 px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8899bb] mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="w-12 h-12 rounded-lg border border-[#edf0f7] cursor-pointer"
              />
              <input
                type="text"
                value={config.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                placeholder="#666666"
                className="flex-1 px-3 py-2 bg-white border border-[#edf0f7] rounded-lg text-sm text-[#0d1b3e] focus:outline-none focus:ring-2 focus:ring-[#63b3ed]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
