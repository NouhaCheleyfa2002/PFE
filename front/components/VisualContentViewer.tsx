"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Maximize2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ExtractedImage {
  imageData: string;
  mimeType: string;
  width: number;
  height: number;
  pageNumber: number;
}

interface VisualContentViewerProps {
  questionId: string;
  questionText: string;
  contextText: string;
  images: ExtractedImage[];
  pageNumber: number;
  aiSummary?: string;
  aiDescription?: string;
  documentUrl?: string;
  onClose?: () => void;
}

export default function VisualContentViewer({
  questionText,
  contextText,
  images,
  pageNumber,
  documentUrl,
  onClose,
}: VisualContentViewerProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [zoom, setZoom] = useState(150); // Start zoomed in to focus on diagrams
  const [pdfViewerReady, setPdfViewerReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleReset = () => setZoom(150);

  const handleDownload = (image: ExtractedImage, index: number) => {
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.imageData}`;
    link.download = `diagram-${index + 1}.${image.mimeType.split('/')[1]}`;
    link.click();
  };

  // Handle PDF viewer loaded
  useEffect(() => {
    const timer = setTimeout(() => setPdfViewerReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      {/* PDF Viewer for Diagrams - Enhanced zoom for focus */}
      {documentUrl ? (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">
                📊 Diagram/Chart Viewer - Page {pageNumber}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 min-w-[50px] text-center font-medium">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                title="Reset zoom"
              >
                Reset
              </button>
              <button
                onClick={() => window.open(`${documentUrl}#page=${pageNumber}`, '_blank')}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                Open Full
              </button>
            </div>
          </div>
          
          {/* PDF Viewer with zoom control */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg overflow-auto" style={{ height: '700px' }}>
            <div style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top left',
              width: `${100 * (100 / zoom)}%`,
              height: `${100 * (100 / zoom)}%`,
            }}>
              <iframe
                ref={iframeRef}
                src={`${documentUrl}#page=${pageNumber}&zoom=${zoom}`}
                className="w-full h-full border-0"
                style={{ minHeight: '700px' }}
                title={`Document page ${pageNumber}`}
              />
            </div>
          </div>
          
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> Use zoom controls to focus on the diagram/chart. 
              The view is zoomed in by default to help you see details clearly.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-900 mb-2">⚠️ Document Not Available</p>
          <p className="text-xs text-red-700">
            The original document could not be loaded. Please ensure the document file exists and is accessible.
          </p>
        </div>
      )}

      {/* Extracted Images Section (if available) */}
      {images && images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              ✨ Extracted Diagrams ({images.length})
            </h3>
          </div>

          {/* Image Grid or Single View */}
          {selectedImage === null ? (
            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer border-2 border-gray-200 rounded-lg overflow-hidden hover:border-green-400 transition-all"
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={`data:${image.mimeType};base64,${image.imageData}`}
                    alt={`Diagram ${index + 1}`}
                    className="w-full h-48 object-contain bg-white p-2"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                    <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium">
                      Diagram {index + 1} • {image.width} × {image.height}px
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-4">
              {/* Image Controls */}
              <div className="flex items-center justify-between mb-4 bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Back to grid"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-sm text-gray-300">
                    Diagram {selectedImage + 1} of {images.length}
                  </span>
                </div>

                <button
                  onClick={() => handleDownload(images[selectedImage], selectedImage)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 text-white text-sm"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              {/* Image Display */}
              <div className="flex items-center justify-center bg-white rounded-lg p-8 min-h-[500px]">
                <img
                  src={`data:${images[selectedImage].mimeType};base64,${images[selectedImage].imageData}`}
                  alt={`Diagram ${selectedImage + 1}`}
                  className="max-w-full max-h-[600px] object-contain"
                />
              </div>

              {/* Navigation */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                    disabled={selectedImage === 0}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setSelectedImage(Math.min(images.length - 1, selectedImage + 1))}
                    disabled={selectedImage === images.length - 1}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context Text - Collapsible, optional */}
      {contextText && (
        <details className="bg-gray-50 border border-gray-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-sm font-medium text-gray-700 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            📄 View Page Text Context (Optional)
          </summary>
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {contextText}
            </div>
          </div>
        </details>
      )}

      {/* No content available */}
      {!documentUrl && (!images || images.length === 0) && !contextText && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No visual content available for this question</p>
        </div>
      )}
    </div>
  );
}
