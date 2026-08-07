"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

/**
 * ZoomControls Component
 * 
 * Reusable zoom control buttons for preview components.
 * Supports zoom range: 50% to 200%.
 * 
 * Requirements: 7.2 (Task 11.3)
 */

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  minZoom = 50,
  maxZoom = 200,
  step = 10,
}: ZoomControlsProps) {
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-[#edf0f7] p-1">
      {/* Zoom Out Button */}
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title={`Zoom Out (${zoom - step}%)`}
        aria-label="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-[#8899bb]" />
      </button>

      {/* Current Zoom Display */}
      <button
        onClick={onResetZoom}
        className="px-3 py-1 min-w-[60px] text-sm font-medium text-[#0d1b3e] hover:bg-[#f9faff] rounded-lg transition-colors"
        title="Reset to 100%"
        aria-label={`Current zoom: ${zoom}%. Click to reset`}
      >
        {zoom}%
      </button>

      {/* Zoom In Button */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        title={`Zoom In (${zoom + step}%)`}
        aria-label="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-[#8899bb]" />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-[#edf0f7]" />

      {/* Fit to View Button */}
      <button
        onClick={onResetZoom}
        className="p-2 rounded-lg hover:bg-[#f9faff] transition-colors"
        title="Fit to View (100%)"
        aria-label="Fit to view"
      >
        <Maximize className="w-4 h-4 text-[#8899bb]" />
      </button>
    </div>
  );
}

/**
 * Hook for managing zoom state
 */
export function useZoom(initialZoom: number = 100, min: number = 50, max: number = 200, step: number = 10) {
  const [zoom, setZoom] = React.useState(initialZoom);

  const zoomIn = React.useCallback(() => {
    setZoom((prev) => Math.min(prev + step, max));
  }, [max, step]);

  const zoomOut = React.useCallback(() => {
    setZoom((prev) => Math.max(prev - step, min));
  }, [min, step]);

  const resetZoom = React.useCallback(() => {
    setZoom(100);
  }, []);

  const setCustomZoom = React.useCallback(
    (value: number) => {
      setZoom(Math.max(min, Math.min(max, value)));
    },
    [min, max]
  );

  return {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom: setCustomZoom,
    canZoomIn: zoom < max,
    canZoomOut: zoom > min,
  };
}
