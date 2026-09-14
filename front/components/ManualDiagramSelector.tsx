"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, Download, Scissors, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Success Modal Component
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

function SuccessModal({ isOpen, onClose, title, message }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed mb-6">{message}</p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// Error Modal Component
interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

function ErrorModal({ isOpen, onClose, title, message }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed mb-6">{message}</p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Warning Modal Component
interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

function WarningModal({ isOpen, onClose, title, message }: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed mb-6">{message}</p>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [currentPage, setCurrentPage] = useState(pageNumber); // Track current page
  const [totalPages, setTotalPages] = useState(0); // Track total pages in PDF
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null); // Store PDF document reference
  
  // Modal states
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: '', message: '' });

  // Load PDF page
  useEffect(() => {
    loadPDFPage();
  }, [documentUrl, currentPage]); // Re-load when page changes

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || uploading) return;
      
      // Arrow keys for page navigation
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        setCurrentPage(prev => prev + 1);
      }
      // Escape to close
      else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, loading, uploading, onClose]);

  const loadPDFPage = async () => {
    try {
      setLoading(true);
      // Reset crop selection when changing pages
      setCropStart(null);
      setCropEnd(null);
      
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
      
      // Reuse PDF document if already loaded
      let pdf = pdfDocRef.current;
      if (!pdf) {
        const loadingTask = pdfjsLib.getDocument({
          url: documentUrl,
          withCredentials: false,
          isEvalSupported: false,
        });
        pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        console.log('[PDF] Document loaded, total pages:', pdf.numPages);
      }
      
      const page = await pdf.getPage(currentPage);
      console.log('[PDF] Page', currentPage, 'loaded');

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
          setWarningModal({
            isOpen: true,
            title: 'Image Too Large',
            message: `The selected area is too large (${imageSizeKB}KB). Please select a smaller area or reduce the zoom level to continue.`
          });
          setUploading(false);
          return;
        }

        const payload = {
          imageData: base64Data,
          mimeType: 'image/jpeg',
          width: Math.round(width),
          height: Math.round(height),
          pageNumber: currentPage, // Use current page instead of prop
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
          setSuccessModal({
            isOpen: true,
            title: 'Diagram Uploaded!',
            message: 'The diagram has been successfully uploaded and linked to your question. The page will refresh to show the updated question.'
          });
          // Wait a moment for user to see the success message, then call callbacks
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
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
          setErrorModal({
            isOpen: true,
            title: 'Upload Failed',
            message: `Failed to upload the diagram: ${errorMessage}. Please try again or contact support if the issue persists.`
          });
          setUploading(false);
        }
      } else {
        throw new Error('Failed to get canvas context');
      }
    } catch (error) {
      console.error('[Upload] Exception:', error);
      setErrorModal({
        isOpen: true,
        title: 'Upload Error',
        message: `An error occurred while uploading the diagram: ${(error as any).message}. Please try again.`
      });
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
            <strong>📋 Instructions:</strong> Use page navigation to find your diagram. Use zoom controls for large diagrams. 
            Click and drag to select the diagram area. Include the complete container with title, diagrams, labels, and caption.
          </p>
        </div>

        {/* Page Navigation - NEW */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-100 border-b border-gray-300 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  }
                }}
                disabled={loading}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Next →
            </button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50" ref={containerRef}>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading page {currentPage}{totalPages > 0 && ` of ${totalPages}`}...</p>
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
      
      {/* Custom Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />
      
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />
      
      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, title: '', message: '' })}
        title={warningModal.title}
        message={warningModal.message}
      />
    </div>
  );
}
