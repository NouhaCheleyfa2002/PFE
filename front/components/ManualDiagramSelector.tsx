"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Download, Scissors } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ManualDiagramSelectorProps {
  questionId: string;
  questionText: string;
  documentUrl: string;
  pageNumber: number;
  onClose: () => void;
  onSuccess: () => void;
  authToken: string;
}

export default function ManualDiagramSelector({
  questionId,
  questionText,
  documentUrl,
  pageNumber,
  onClose,
  onSuccess,
  authToken,
}: ManualDiagramSelectorProps) {
  const [pdfPage, setPdfPage] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF page
  useEffect(() => {
    loadPDFPage();
  }, [documentUrl, pageNumber]);

  const loadPDFPage = async () => {
    try {
      setLoading(true);
      const pdfjsLib = (window as any).pdfjsLib;
      
      if (!pdfjsLib) {
        // Load PDF.js library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          // Configure worker
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          loadPDFPage();
        };
        document.head.appendChild(script);
        return;
      }

      // Ensure worker is configured
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      console.log('[PDF] Loading document:', documentUrl);
      const loadingTask = pdfjsLib.getDocument({
        url: documentUrl,
        withCredentials: false,
        isEvalSupported: false,
      });
      const pdf = await loadingTask.promise;
      console.log('[PDF] Document loaded, total pages:', pdf.numPages);
      
      const page = await pdf.getPage(pageNumber);
      console.log('[PDF] Page', pageNumber, 'loaded');

      const scale = 2.0; // High resolution
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        console.log('[PDF] Page rendered successfully');
        setPdfPage(canvas);
      }

      setLoading(false);
    } catch (error) {
      console.error('[PDF] Failed to load PDF page:', error);
      alert('Failed to load PDF page: ' + (error as any).message);
      setLoading(false);
    }
  };

  // Draw PDF and selection overlay
  useEffect(() => {
    if (pdfPage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw PDF page with zoom
        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.drawImage(pdfPage, 0, 0);
        ctx.restore();

        // Draw selection rectangle
        if (cropStart && cropEnd) {
          const x = Math.min(cropStart.x, cropEnd.x);
          const y = Math.min(cropStart.y, cropEnd.y);
          const width = Math.abs(cropEnd.x - cropStart.x);
          const height = Math.abs(cropEnd.y - cropStart.y);

          // Semi-transparent overlay outside selection
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, canvas.width, y); // Top
          ctx.fillRect(0, y, x, height); // Left
          ctx.fillRect(x + width, y, canvas.width - (x + width), height); // Right
          ctx.fillRect(0, y + height, canvas.width, canvas.height - (y + height)); // Bottom

          // Selection border
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Corner handles
          const handleSize = 12;
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
        }
      }
      
      // Force browser to repaint
      requestAnimationFrame(() => {
        if (canvas) {
          canvas.style.opacity = '0.99';
          requestAnimationFrame(() => {
            canvas.style.opacity = '1';
          });
        }
      });
    }
  }, [pdfPage, cropStart, cropEnd, zoom]);

  // Update canvas size when zoom changes
  useEffect(() => {
    if (pdfPage && canvasRef.current) {
      canvasRef.current.width = pdfPage.width * zoom;
      canvasRef.current.height = pdfPage.height * zoom;
      
      // Force immediate redraw
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.drawImage(pdfPage, 0, 0);
        ctx.restore();
        
        // Force browser repaint multiple times
        requestAnimationFrame(() => {
          canvas.style.transform = 'translateZ(0)';
          setTimeout(() => {
            canvas.style.opacity = '0.99';
            setTimeout(() => {
              canvas.style.opacity = '1';
            }, 10);
          }, 10);
        });
      }
    }
  }, [zoom, pdfPage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropEnd({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleCropAndUpload = async () => {
    if (!cropStart || !cropEnd || !pdfPage) {
      alert('Please select an area to crop');
      return;
    }

    try {
      setUploading(true);

      // Calculate crop region (accounting for zoom)
      const x = Math.min(cropStart.x, cropEnd.x) / zoom;
      const y = Math.min(cropStart.y, cropEnd.y) / zoom;
      const width = Math.abs(cropEnd.x - cropStart.x) / zoom;
      const height = Math.abs(cropEnd.y - cropStart.y) / zoom;

      if (width < 10 || height < 10) {
        alert('Selected area is too small');
        setUploading(false);
        return;
      }

      console.log('[Upload] Crop region:', { x, y, width, height });

      // Create cropped image
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = width;
      croppedCanvas.height = height;
      const croppedCtx = croppedCanvas.getContext('2d');

      if (croppedCtx) {
        croppedCtx.drawImage(
          pdfPage,
          x, y, width, height,
          0, 0, width, height
        );

        // Compress image to reduce payload size
        // Use JPEG with quality 0.8 to reduce size significantly
        const base64Data = croppedCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        const imageSizeKB = Math.round((base64Data.length * 3) / 4 / 1024);

        console.log('[Upload] Image size:', imageSizeKB, 'KB');

        if (imageSizeKB > 40000) {
          alert(`Image is too large (${imageSizeKB}KB). Please select a smaller area or reduce zoom.`);
          setUploading(false);
          return;
        }

        const payload = {
          imageData: base64Data,
          mimeType: 'image/jpeg',
          width: Math.round(width),
          height: Math.round(height),
          pageNumber,
          cropRegion: { 
            x: Math.round(x), 
            y: Math.round(y), 
            width: Math.round(width), 
            height: Math.round(height) 
          },
        };

        console.log('[Upload] Uploading to:', `${API_URL}/exam-questions/${questionId}/manual-diagram`);
        console.log('[Upload] Payload size:', JSON.stringify(payload).length, 'bytes');

        // Upload to backend
        const response = await fetch(`${API_URL}/exam-questions/${questionId}/manual-diagram`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });

        console.log('[Upload] Response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('[Upload] Success:', result);
          alert('✅ Diagram uploaded successfully!');
          onSuccess();
          onClose();
        } else {
          const errorText = await response.text();
          console.error('[Upload] Error response:', errorText);
          let errorMessage = 'Unknown error';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorText;
          } catch {
            errorMessage = errorText;
          }
          alert(`❌ Failed to upload diagram: ${errorMessage}`);
          setUploading(false);
        }
      } else {
        throw new Error('Failed to get canvas context');
      }
    } catch (error) {
      console.error('[Upload] Exception:', error);
      alert(`❌ Failed to upload diagram: ${(error as any).message}`);
      setUploading(false);
    }
  };

  const handleReset = () => {
    setCropStart(null);
    setCropEnd(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Scissors className="w-6 h-6 text-blue-600" />
              Select Diagram from PDF
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Question:</strong> {questionText.substring(0, 100)}...
          </p>
          <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
            <strong>📋 Instructions:</strong> Use zoom controls for large diagrams. Click and drag to select the diagram area. 
            Include the complete container with title, diagrams, labels, and caption.
          </p>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50" ref={containerRef}>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading PDF page {pageNumber}...</p>
              </div>
            </div>
          ) : pdfPage ? (
            <div className="flex flex-col items-center gap-4">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-300 shadow-sm">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium px-3 min-w-[80px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 3.0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="border-2 border-gray-300 rounded cursor-crosshair shadow-lg"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-red-600">Failed to load PDF page</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cropStart && cropEnd && (
                <div className="text-sm text-gray-600">
                  Selected: {Math.round(Math.abs(cropEnd.x - cropStart.x) / zoom)} × {Math.round(Math.abs(cropEnd.y - cropStart.y) / zoom)}px
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
              >
                Reset Selection
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCropAndUpload}
                disabled={!cropStart || !cropEnd || uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Use Selection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
