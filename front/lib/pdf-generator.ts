/**
 * PDF Generator Utilities
 * 
 * Generates PDF previews for templates using jsPDF library.
 * Note: This is a placeholder implementation. In production, you would:
 * 1. Install jsPDF: npm install jspdf
 * 2. Import and use jsPDF properly
 * 
 * For now, we'll create a simplified HTML-based preview generator
 * that matches the backend PDF structure.
 * 
 * Requirements: 7.1, 7.5, 7.6, 16.5 (Task 11.2)
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
    textColor?: string;
  }>;
}

interface ExamData {
  studentName?: string;
  teacher?: string;
  subject?: string;
  classLevel?: string;
  examDate?: string;
  duration?: string;
  academicYear?: string;
  title?: string;
  totalMarks?: number;
}

/**
 * Sample exam data for preview
 */
const SAMPLE_EXAM_DATA: ExamData = {
  studentName: "Ahmed Ben Ali",
  teacher: "Prof. Fatima Zahra",
  subject: "Mathematics",
  classLevel: "4ème Sciences",
  examDate: "January 15, 2025",
  duration: "2 hours",
  academicYear: "2024-2025",
  title: "Final Exam",
  totalMarks: 100,
};

/**
 * Convert mm to pixels (assuming 96 DPI)
 * @param mm Millimeters
 * @returns Pixels
 */
function mmToPixels(mm: number): number {
  return (mm * 96) / 25.4;
}

/**
 * Generate PDF preview as data URL
 * 
 * In a real implementation with jsPDF:
 * ```typescript
 * import jsPDF from 'jspdf';
 * 
 * const doc = new jsPDF({
 *   orientation: config.pageOrientation || 'portrait',
 *   unit: 'mm',
 *   format: 'a4',
 * });
 * 
 * // Add content...
 * doc.addImage(logoUrl, 'PNG', x, y, width, height);
 * doc.text(text, x, y);
 * 
 * return doc.output('dataurlstring');
 * ```
 * 
 * @param config Template configuration
 * @param examData Exam data for placeholder substitution
 * @returns Promise resolving to PDF data URL
 */
export async function generatePreview(
  config: TemplateConfig,
  examData: ExamData = SAMPLE_EXAM_DATA
): Promise<string> {
  // Simulate async PDF generation
  await new Promise((resolve) => setTimeout(resolve, 100));

  // For now, return a placeholder data URL
  // In production, this would use jsPDF to create an actual PDF
  const html = generatePreviewHTML(config, examData);
  
  // Create a canvas representation (simplified)
  const canvas = document.createElement("canvas");
  const isLandscape = config.pageOrientation === "landscape";
  
  // A4 dimensions in pixels at 96 DPI
  const a4Width = isLandscape ? 1122 : 794;
  const a4Height = isLandscape ? 794 : 1122;
  
  canvas.width = a4Width;
  canvas.height = a4Height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render content (simplified)
  await renderTemplateToCanvas(ctx, config, examData, canvas.width, canvas.height);

  // Return as data URL
  return canvas.toDataURL("image/png");
}

/**
 * Render template to canvas
 */
async function renderTemplateToCanvas(
  ctx: CanvasRenderingContext2D,
  config: TemplateConfig,
  examData: ExamData,
  width: number,
  height: number
): Promise<void> {
  const margins = config.pageMargins || { top: 72, bottom: 72, left: 72, right: 72 };
  const marginTop = mmToPixels(margins.top / 2.83465); // Convert pt to mm
  const marginLeft = mmToPixels(margins.left / 2.83465);
  
  let currentY = marginTop;

  // Set font
  ctx.font = `16px ${config.fontFamily || "Arial"}`;
  ctx.textAlign = "center";

  // Render institution name
  if (config.institutionName) {
    ctx.fillStyle = config.primaryColor || "#000000";
    ctx.font = `bold 20px ${config.fontFamily || "Arial"}`;
    ctx.fillText(config.institutionName, width / 2, currentY);
    currentY += 30;
  }

  // Render address
  if (config.institutionAddress) {
    ctx.fillStyle = config.secondaryColor || "#666666";
    ctx.font = `12px ${config.fontFamily || "Arial"}`;
    ctx.fillText(config.institutionAddress, width / 2, currentY);
    currentY += 20;
  }

  // Render contact info
  const contactInfo = [config.contactPhone, config.contactEmail]
    .filter(Boolean)
    .join(" | ");
  if (contactInfo) {
    ctx.fillStyle = "#888888";
    ctx.font = `11px ${config.fontFamily || "Arial"}`;
    ctx.fillText(contactInfo, width / 2, currentY);
    currentY += 20;
  }

  // Render academic year
  if (config.academicYear) {
    ctx.fillStyle = config.secondaryColor || "#666666";
    ctx.font = `bold 11px ${config.fontFamily || "Arial"}`;
    ctx.fillText(`Academic Year: ${config.academicYear}`, width / 2, currentY);
    currentY += 30;
  }

  // Render watermark
  if (config.watermarkText) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.globalAlpha = (config.watermarkOpacity || 30) / 100;
    ctx.fillStyle = "#DDDDDD";
    ctx.font = `bold 60px ${config.fontFamily || "Arial"}`;
    ctx.textAlign = "center";
    ctx.fillText(config.watermarkText, 0, 0);
    ctx.restore();
  }

  // Render placeholders with exam data
  if (config.placeholders && config.placeholders.length > 0) {
    ctx.textAlign = "left";
    const placeholderMap: Record<string, string> = {
      "{{StudentName}}": examData.studentName || "",
      "{{Teacher}}": examData.teacher || "",
      "{{Subject}}": examData.subject || "",
      "{{Class}}": examData.classLevel || "",
      "{{Date}}": examData.examDate || "",
      "{{Duration}}": examData.duration || "",
      "{{AcademicYear}}": examData.academicYear || "",
      "{{ExamTitle}}": examData.title || "",
      "{{TotalMarks}}": examData.totalMarks?.toString() || "",
    };

    config.placeholders.forEach((placeholder) => {
      const value = placeholderMap[placeholder.key] || "";
      if (value) {
        ctx.fillStyle = placeholder.textColor || "#000000";
        ctx.font = `${placeholder.fontSize || 12}px ${config.fontFamily || "Arial"}`;
        ctx.fillText(
          `${placeholder.label}: ${value}`,
          placeholder.position.x,
          placeholder.position.y
        );
      }
    });
  }

  // Render footer
  if (config.footerText) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#888888";
    ctx.font = `9px ${config.fontFamily || "Arial"}`;
    ctx.fillText(config.footerText, width / 2, height - mmToPixels(margins.bottom / 2.83465) + 10);
  }
}

/**
 * Generate HTML preview (fallback for browsers without canvas support)
 */
export function generatePreviewHTML(
  config: TemplateConfig,
  examData: ExamData = SAMPLE_EXAM_DATA
): string {
  const placeholderMap: Record<string, string> = {
    "{{StudentName}}": examData.studentName || "",
    "{{Teacher}}": examData.teacher || "",
    "{{Subject}}": examData.subject || "",
    "{{Class}}": examData.classLevel || "",
    "{{Date}}": examData.examDate || "",
    "{{Duration}}": examData.duration || "",
    "{{AcademicYear}}": examData.academicYear || "",
    "{{ExamTitle}}": examData.title || "",
    "{{TotalMarks}}": examData.totalMarks?.toString() || "",
  };

  const isLandscape = config.pageOrientation === "landscape";
  const width = isLandscape ? "800px" : "600px";
  const height = isLandscape ? "565px" : "800px";

  return `
    <div class="pdf-preview" style="
      width: ${width};
      height: ${height};
      margin: 0 auto;
      padding: ${config.pageMargins?.top || 72}px 
               ${config.pageMargins?.right || 72}px 
               ${config.pageMargins?.bottom || 72}px 
               ${config.pageMargins?.left || 72}px;
      background: white;
      border: 1px solid #edf0f7;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      font-family: ${config.fontFamily || "Arial"}, sans-serif;
    ">
      ${config.logoUrl ? `
        <div style="
          position: absolute;
          left: ${config.logoPosition?.x || 50}px;
          top: ${config.logoPosition?.y || 20}px;
          width: ${config.logoPosition?.width || 80}px;
          height: ${config.logoPosition?.height || 80}px;
        ">
          <img src="${config.logoUrl}" 
               alt="Logo" 
               style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>
      ` : ""}
      
      <div style="text-align: center; margin-bottom: 30px;">
        ${config.institutionName ? `
          <h1 style="
            font-size: 20px;
            font-weight: bold;
            color: ${config.primaryColor || "#000000"};
            margin: 0 0 12px 0;
          ">${config.institutionName}</h1>
        ` : ""}
        
        ${config.institutionAddress ? `
          <p style="
            font-size: 12px;
            color: ${config.secondaryColor || "#666666"};
            margin: 0 0 8px 0;
          ">${config.institutionAddress}</p>
        ` : ""}
        
        ${config.contactPhone || config.contactEmail ? `
          <p style="font-size: 11px; color: #8899bb; margin: 0 0 8px 0;">
            ${[config.contactPhone, config.contactEmail].filter(Boolean).join(" | ")}
          </p>
        ` : ""}
        
        ${config.academicYear ? `
          <p style="
            font-size: 11px;
            color: ${config.secondaryColor || "#666666"};
            font-weight: 600;
            background: #f0f0f0;
            display: inline-block;
            padding: 4px 16px;
            border-radius: 12px;
            margin: 8px 0 0 0;
          ">Academic Year: ${config.academicYear}</p>
        ` : ""}
      </div>
      
      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-bottom: 20px;"></div>
      
      ${config.placeholders && config.placeholders.length > 0 ? config.placeholders.map(p => {
        const value = placeholderMap[p.key] || "";
        return value ? `
          <div style="
            position: absolute;
            left: ${p.position.x}px;
            top: ${p.position.y}px;
            font-size: ${p.fontSize || 12}px;
            color: ${p.textColor || "#000000"};
          ">
            <strong>${p.label}:</strong> ${value}
          </div>
        ` : "";
      }).join("") : ""}
      
      ${config.watermarkText ? `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 60px;
          font-weight: bold;
          color: #DDDDDD;
          opacity: ${(config.watermarkOpacity || 30) / 100};
          pointer-events: none;
          white-space: nowrap;
        ">${config.watermarkText}</div>
      ` : ""}
      
      ${config.footerText ? `
        <div style="
          position: absolute;
          bottom: ${config.pageMargins?.bottom || 72}px;
          left: ${config.pageMargins?.left || 72}px;
          right: ${config.pageMargins?.right || 72}px;
          text-align: center;
          font-size: 9px;
          color: #888888;
          border-top: 1px solid #e0e0e0;
          padding-top: 8px;
        ">${config.footerText}</div>
      ` : ""}
    </div>
  `;
}

/**
 * Download PDF (placeholder - would use jsPDF in production)
 */
export function downloadPDF(dataUrl: string, filename: string = "template-preview.pdf"): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
