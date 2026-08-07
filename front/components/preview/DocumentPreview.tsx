import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  X,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import dynamic from "next/dynamic";

// Import react-pdf styles for TextLayer and AnnotationLayer
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Dynamically import react-pdf components to avoid SSR issues with DOMMatrix
const PDFDocument = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  { ssr: false }
);
const PDFPage = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  { ssr: false }
);

interface DocumentPreviewProps {
  fileUrl: string;
  fileName?: string;
  onClose?: () => void;
}

type FileType = "pdf" | "docx" | "pptx" | "unknown";

function getFileType(fileName: string | undefined, fileUrl?: string): FileType {
  // Try to get extension from fileName first
  if (fileName) {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "docx";
    if (ext === "pptx" || ext === "ppt") return "pptx";
  }
  
  // Fallback: try to detect from fileUrl
  if (fileUrl) {
    const urlLower = fileUrl.toLowerCase();
    if (urlLower.includes('.pdf')) return "pdf";
    if (urlLower.includes('.docx') || urlLower.includes('.doc')) return "docx";
    if (urlLower.includes('.pptx') || urlLower.includes('.ppt')) return "pptx";
  }
  
  return "unknown";
}

// PDF Preview Component with all pages
function PDFPreview({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"scroll" | "single">("scroll");
  const [currentPage, setCurrentPage] = useState(1);
  const [workerReady, setWorkerReady] = useState(false);

  // Set up PDF.js worker on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use react-pdf's pdfjs instead of importing directly
      import('react-pdf').then((reactPdf) => {
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        setWorkerReady(true);
      }).catch((error) => {
        console.error("PDF worker initialization failed:", error);
        setError("Failed to initialize PDF viewer");
        setWorkerReady(true);
      });
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    setError(error.message);
    setLoading(false);
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  const goToPrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, numPages));

  if (!workerReady) {
    return (
      <div className="flex items-center justify-center h-full bg-[#525659]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    // Fallback to iframe if react-pdf fails
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <p className="text-sm text-yellow-800">Using fallback PDF viewer</p>
        </div>
        <iframe
          src={fileUrl}
          className="flex-1 w-full border-0"
          title="PDF Document"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#f6f8ff] border-b border-[#edf0f7]">
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-[#4a5568]" />
          </button>
          <span className="text-sm text-[#4a5568] min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-[#4a5568]" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-[#4a5568]">
            {viewMode === "single" ? `Page ${currentPage}` : "All Pages"} of{" "}
            {numPages || "..."}
          </span>
          {viewMode === "single" && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-[#4a5568]" />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-[#4a5568]" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setViewMode(viewMode === "scroll" ? "single" : "scroll")}
          className="flex items-center gap-1 px-2 py-1 rounded text-sm text-[#4a5568] hover:bg-[#e8ecf4] transition-colors"
        >
          {viewMode === "scroll" ? (
            <>
              <Minimize2 className="w-4 h-4" /> Single Page
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" /> All Pages
            </>
          )}
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-[#525659] p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
        <PDFDocument
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex flex-col items-center gap-4"
        >
          {viewMode === "scroll" ? (
            // Show all pages
            Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                className="bg-white shadow-lg"
              >
                <PDFPage
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            ))
          ) : (
            // Single page view
            <div className="bg-white shadow-lg">
              <PDFPage
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          )}
        </PDFDocument>
      </div>

      {/* PDF layer styles - TextLayer and AnnotationLayer */}
      <style jsx global>{`
        /* TextLayer styles */
        .react-pdf__Page__textContent {
          position: absolute;
          inset: 0;
          overflow: hidden;
          opacity: 0.2;
          line-height: 1;
          text-align: initial;
          user-select: text;
          pointer-events: auto;
        }
        .react-pdf__Page__textContent span,
        .react-pdf__Page__textContent br {
          color: transparent;
          position: absolute;
          white-space: pre;
          transform-origin: 0% 0%;
        }
        .react-pdf__Page__textContent span::selection {
          background: rgba(0, 0, 255, 0.3);
        }
        .react-pdf__Page__textContent .markedContent {
          top: 0;
          height: 0;
        }
        
        /* AnnotationLayer styles */
        .react-pdf__Page__annotations {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .react-pdf__Page__annotations.annotationLayer {
          pointer-events: auto;
        }
        .react-pdf__Page__annotations section {
          position: absolute;
          pointer-events: auto;
        }
        .react-pdf__Page__annotations a {
          display: block;
          position: absolute;
        }
        .react-pdf__Page__annotations a:hover {
          opacity: 0.2;
          background: rgba(255, 255, 0, 1);
          box-shadow: 0 2px 10px rgba(255, 255, 0, 1);
        }
        .react-pdf__Page__annotations .linkAnnotation > a {
          position: absolute;
          font-size: 1em;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .react-pdf__Page__annotations .textAnnotation img {
          position: absolute;
          cursor: pointer;
        }
        .react-pdf__Page__annotations .popup {
          position: absolute;
          font-size: 0.65em;
          padding: 0.6em;
          max-width: 20em;
          background-color: rgba(255, 255, 153, 1);
          box-shadow: 0 2px 5px rgba(136, 136, 136, 1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

// DOCX Preview Component using mammoth - Full document view
function DOCXPreview({ fileUrl }: { fileUrl: string }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    async function loadDocx() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch document");

        const arrayBuffer = await response.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement((image) => {
              return image.read("base64").then((imageBuffer) => {
                return {
                  src: `data:${image.contentType};base64,${imageBuffer}`,
                };
              });
            }),
          }
        );
        setContent(result.value);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    }

    loadDocx();
  }, [fileUrl]);

  const zoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const zoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#525659]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
          <p className="text-white/70 text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 bg-white">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#f6f8ff] border-b border-[#edf0f7]">
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-[#4a5568]" />
          </button>
          <span className="text-sm text-[#4a5568] min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-[#4a5568]" />
          </button>
        </div>
        <span className="text-sm text-[#4a5568]">Word Document</span>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto bg-[#525659] p-4">
        <div
          className="mx-auto bg-white shadow-lg"
          style={{
            width: `${21 * scale}cm`,
            minHeight: `${29.7 * scale}cm`,
            padding: `${2.54 * scale}cm`,
            transform: `scale(1)`,
            transformOrigin: "top center",
          }}
        >
          <div
            className="docx-content"
            style={{ fontSize: `${12 * scale}pt` }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>

      <style jsx global>{`
        .docx-content {
          font-family: "Calibri", "Arial", sans-serif;
          line-height: 1.5;
          color: #000;
        }
        .docx-content p {
          margin-bottom: 0.8em;
          text-align: justify;
        }
        .docx-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1em 0 0.5em;
          color: #2b579a;
        }
        .docx-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em;
          color: #2b579a;
        }
        .docx-content h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        .docx-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .docx-content table td,
        .docx-content table th {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .docx-content table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .docx-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1em auto;
        }
        .docx-content ul,
        .docx-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        .docx-content li {
          margin-bottom: 0.3em;
        }
        .docx-content strong,
        .docx-content b {
          font-weight: bold;
        }
        .docx-content em,
        .docx-content i {
          font-style: italic;
        }
        .docx-content u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// PPTX Preview Component - Parses and renders slides locally
interface SlideContent {
  index: number;
  texts: string[];
  images: { src: string; alt: string }[];
}

function PPTXPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");

  useEffect(() => {
    async function loadPptx() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch presentation");

        const arrayBuffer = await response.arrayBuffer();
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Get slide files
        const slideFiles: string[] = [];
        zip.forEach((relativePath) => {
          if (relativePath.match(/ppt\/slides\/slide\d+\.xml$/)) {
            slideFiles.push(relativePath);
          }
        });

        // Sort slides by number
        slideFiles.sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0");
          const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0");
          return numA - numB;
        });

        // Parse slides
        const parsedSlides: SlideContent[] = [];

        // Get images from media folder
        const mediaFiles: { [key: string]: string } = {};
        const mediaPromises: Promise<void>[] = [];

        zip.forEach((relativePath, file) => {
          if (relativePath.startsWith("ppt/media/")) {
            mediaPromises.push(
              file.async("base64").then((data) => {
                const ext = relativePath.split(".").pop()?.toLowerCase();
                const mimeType =
                  ext === "png"
                    ? "image/png"
                    : ext === "jpg" || ext === "jpeg"
                    ? "image/jpeg"
                    : ext === "gif"
                    ? "image/gif"
                    : "image/png";
                mediaFiles[relativePath] = `data:${mimeType};base64,${data}`;
              })
            );
          }
        });

        await Promise.all(mediaPromises);

        // Parse each slide
        for (let i = 0; i < slideFiles.length; i++) {
          const slideFile = slideFiles[i];
          const slideXml = await zip.file(slideFile)?.async("string");

          if (slideXml) {
            const texts: string[] = [];
            const images: { src: string; alt: string }[] = [];

            // Extract text content (simplified parsing)
            const textMatches = slideXml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
            for (const match of textMatches) {
              if (match[1].trim()) {
                texts.push(match[1]);
              }
            }

            // Extract image references
            const relsPath = slideFile.replace(
              "ppt/slides/",
              "ppt/slides/_rels/"
            ).replace(".xml", ".xml.rels");
            const relsFile = await zip.file(relsPath)?.async("string");

            if (relsFile) {
              const imageRefs = relsFile.matchAll(
                /Target="\.\.\/media\/([^"]+)"/g
              );
              for (const ref of imageRefs) {
                const mediaPath = `ppt/media/${ref[1]}`;
                if (mediaFiles[mediaPath]) {
                  images.push({
                    src: mediaFiles[mediaPath],
                    alt: `Slide ${i + 1} image`,
                  });
                }
              }
            }

            parsedSlides.push({
              index: i,
              texts,
              images,
            });
          }
        }

        setSlides(parsedSlides);
      } catch (err) {
        console.error("PPTX parsing error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load presentation"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPptx();
  }, [fileUrl]);

  const goToPrevSlide = () => setCurrentSlide((s) => Math.max(s - 1, 0));
  const goToNextSlide = () =>
    setCurrentSlide((s) => Math.min(s + 1, slides.length - 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#525659]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
          <p className="text-white/70 text-sm">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-8">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
        <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
          Could not parse presentation
        </h3>
        <p className="text-sm text-[#8899bb] mb-6 text-center max-w-md">
          {error}. You can download the file to view it in PowerPoint.
        </p>
        <a
          href={fileUrl}
          download={fileName}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm hover:bg-[#1a2d5a] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download File
        </a>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <FileText className="w-12 h-12 text-[#8899bb] mb-4" />
        <p className="text-[#8899bb]">No slides found in presentation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#f6f8ff] border-b border-[#edf0f7]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("single")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "single"
                ? "bg-[#63b3ed] text-white"
                : "bg-white text-[#4a5568] hover:bg-[#e8ecf4]"
            }`}
          >
            Single Slide
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "grid"
                ? "bg-[#63b3ed] text-white"
                : "bg-white text-[#4a5568] hover:bg-[#e8ecf4]"
            }`}
          >
            All Slides
          </button>
        </div>

        {viewMode === "single" && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#4a5568]">
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevSlide}
                disabled={currentSlide <= 0}
                className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-[#4a5568]" />
              </button>
              <button
                onClick={goToNextSlide}
                disabled={currentSlide >= slides.length - 1}
                className="p-1.5 rounded hover:bg-[#e8ecf4] transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-[#4a5568]" />
              </button>
            </div>
          </div>
        )}

        <span className="text-sm text-[#4a5568]">PowerPoint</span>
      </div>

      {/* Slides Content */}
      <div className="flex-1 overflow-auto bg-[#525659] p-4">
        {viewMode === "single" ? (
          // Single slide view
          <div className="flex items-center justify-center h-full">
            <div
              className="bg-white shadow-xl rounded-lg overflow-hidden"
              style={{
                width: "960px",
                maxWidth: "100%",
                aspectRatio: "16/9",
              }}
            >
              <div className="w-full h-full p-8 flex flex-col">
                {/* Slide number badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-[#0d1b3e]/80 text-white text-xs rounded">
                  Slide {currentSlide + 1}
                </div>

                {/* Images */}
                {slides[currentSlide]?.images.length > 0 && (
                  <div className="flex-1 flex items-center justify-center mb-4">
                    {slides[currentSlide].images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.src}
                        alt={img.alt}
                        className="max-w-full max-h-[300px] object-contain"
                      />
                    ))}
                  </div>
                )}

                {/* Text content */}
                <div className="space-y-3">
                  {slides[currentSlide]?.texts.map((text, idx) => (
                    <p
                      key={idx}
                      className={`${
                        idx === 0
                          ? "text-2xl font-bold text-[#0d1b3e]"
                          : "text-lg text-[#4a5568]"
                      }`}
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Grid view - all slides
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCurrentSlide(idx);
                  setViewMode("single");
                }}
                className="bg-white rounded-lg overflow-hidden shadow-lg cursor-pointer hover:ring-2 hover:ring-[#63b3ed] transition-all"
                style={{ aspectRatio: "16/9" }}
              >
                <div className="w-full h-full p-3 flex flex-col relative">
                  {/* Slide number badge */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#0d1b3e]/80 text-white text-[10px] rounded">
                    {idx + 1}
                  </div>

                  {/* Thumbnail image */}
                  {slide.images.length > 0 && (
                    <div className="flex-1 flex items-center justify-center mb-2">
                      <img
                        src={slide.images[0].src}
                        alt={slide.images[0].alt}
                        className="max-w-full max-h-[80px] object-contain"
                      />
                    </div>
                  )}

                  {/* Text preview */}
                  <div className="text-[10px] text-[#4a5568] line-clamp-3">
                    {slide.texts.slice(0, 3).map((text, tidx) => (
                      <p
                        key={tidx}
                        className={tidx === 0 ? "font-semibold" : ""}
                      >
                        {text.substring(0, 50)}
                        {text.length > 50 ? "..." : ""}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Unknown file type fallback
function UnknownPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#f6f8ff] p-8">
      <FileText className="w-16 h-16 text-[#8899bb] mb-4" />
      <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">{fileName}</h3>
      <p className="text-sm text-[#8899bb] mb-6 text-center">
        Preview is not available for this file type.
      </p>
      <a
        href={fileUrl}
        download={fileName}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d1b3e] text-white text-sm hover:bg-[#1a2d5a] transition-colors"
      >
        <Download className="w-4 h-4" />
        Download File
      </a>
    </div>
  );
}

// Main Document Preview Component
export function DocumentPreview({ fileUrl, fileName, onClose }: DocumentPreviewProps) {
  const fileType = getFileType(fileName, fileUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f6f8ff] border-b border-[#edf0f7]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#63b3ed]" />
            <span className="font-medium text-[#0d1b3e] truncate max-w-md">
              {fileName || 'Document'}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#e8ecf4] text-xs text-[#4a5568] uppercase">
              {fileType}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName || 'document'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#edf0f7] text-sm text-[#4a5568] hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#e8ecf4] transition-colors"
              >
                <X className="w-5 h-5 text-[#4a5568]" />
              </button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {fileType === "pdf" && <PDFPreview fileUrl={fileUrl} />}
          {fileType === "docx" && <DOCXPreview fileUrl={fileUrl} />}
          {fileType === "pptx" && <PPTXPreview fileUrl={fileUrl} fileName={fileName} />}
          {fileType === "unknown" && <UnknownPreview fileUrl={fileUrl} fileName={fileName} />}
        </div>
      </div>
    </div>
  );
}

// Inline preview component for smaller previews within pages
export function DocumentPreviewInline({
  fileUrl,
  fileName,
  className = "",
}: {
  fileUrl: string;
  fileName: string;
  className?: string;
}) {
  const fileType = getFileType(fileName, fileUrl);

  return (
    <div className={`w-full h-full min-h-[400px] bg-white rounded-xl border border-[#edf0f7] overflow-hidden ${className}`}>
      {fileType === "pdf" && <PDFPreview fileUrl={fileUrl} />}
      {fileType === "docx" && <DOCXPreview fileUrl={fileUrl} />}
      {fileType === "pptx" && <PPTXPreview fileUrl={fileUrl} fileName={fileName} />}
      {fileType === "unknown" && <UnknownPreview fileUrl={fileUrl} fileName={fileName} />}
    </div>
  );
}

export default DocumentPreview;
