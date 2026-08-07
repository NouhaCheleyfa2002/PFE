import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ExamTemplateEntity } from '../entities/exam-template.entity';
import { ExamData } from '../dto/exam-data.dto';
import axios from 'axios';

@Injectable()
export class TemplatePrinterService {
  private readonly logger = new Logger(TemplatePrinterService.name);

  async generatePdf(
    template: ExamTemplateEntity,
    examData: ExamData,
  ): Promise<Buffer> {
    this.logger.log(`Generating PDF for template: ${template.id}`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: template.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
          margins: {
            top: template.pageMargins.top,
            bottom: template.pageMargins.bottom,
            left: template.pageMargins.left,
            right: template.pageMargins.right,
          },
        });

        const buffers: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          this.logger.log('PDF generation completed');
          resolve(pdfBuffer);
        });
        doc.on('error', (err: Error) => {
          this.logger.error(`PDF generation error: ${err.message}`);
          reject(err);
        });

        this.renderTemplate(doc, template, examData)
          .then(() => {
            doc.end();
          })
          .catch((err) => {
            this.logger.error(`Template rendering error: ${err.message}`);
            reject(err);
          });
      } catch (error) {
        this.logger.error(`PDF generation failed: ${error.message}`);
        reject(error);
      }
    });
  }

  private async renderTemplate(
    doc: typeof PDFDocument,
    template: ExamTemplateEntity,
    examData: ExamData,
  ): Promise<void> {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    if (template.logoUrl && template.logoPosition) {
      await this.renderLogo(doc, template.logoUrl, template.logoPosition);
    }

    this.renderInstitutionMetadata(doc, template, pageWidth);

    this.renderPlaceholders(doc, template, examData);

    if (template.watermarkText) {
      this.renderWatermark(
        doc,
        template.watermarkText,
        template.watermarkOpacity,
        pageWidth,
        pageHeight,
      );
    }

    if (template.footerText) {
      this.renderFooter(doc, template.footerText, pageWidth, pageHeight);
    }
  }

  private async renderLogo(
    doc: typeof PDFDocument,
    logoUrl: string,
    logoPosition: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    try {
      const response = await axios.get(logoUrl, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });

      const logoBuffer = Buffer.from(response.data);

      doc.image(logoBuffer, logoPosition.x, logoPosition.y, {
        width: logoPosition.width,
        height: logoPosition.height,
      });

      this.logger.debug('Logo rendered successfully');
    } catch (error) {
      this.logger.warn(`Failed to render logo: ${error.message}`);
    }
  }

  private renderInstitutionMetadata(
    doc: typeof PDFDocument,
    template: ExamTemplateEntity,
    pageWidth: number,
  ): void {
    const centerX = pageWidth / 2;
    let currentY = 50;
    const margins = template.pageMargins;

    // Apply custom font if specified
    const fontFamily = template.fontFamily || 'Helvetica';
    doc.font(fontFamily);

    // Render institution name with larger, bold styling
    if (template.institutionName) {
      doc
        .fontSize(18)
        .fillColor(template.primaryColor || '#000000')
        .text(template.institutionName, margins.left, currentY, {
          align: 'center',
          width: pageWidth - margins.left - margins.right,
          lineGap: 4,
        });
      currentY += 28;
    }

    // Render institution address
    if (template.institutionAddress) {
      doc
        .fontSize(11)
        .fillColor(template.secondaryColor || '#333333')
        .text(template.institutionAddress, margins.left, currentY, {
          align: 'center',
          width: pageWidth - margins.left - margins.right,
          lineGap: 3,
        });
      currentY += 18;
    }

    // Render contact information in a structured format
    const contactInfo: string[] = [];
    if (template.contactPhone) contactInfo.push(`Tel: ${template.contactPhone}`);
    if (template.contactEmail) contactInfo.push(`Email: ${template.contactEmail}`);

    if (contactInfo.length > 0) {
      doc
        .fontSize(10)
        .fillColor('#555555')
        .text(contactInfo.join(' | '), margins.left, currentY, {
          align: 'center',
          width: pageWidth - margins.left - margins.right,
          lineGap: 2,
        });
      currentY += 16;
    }

    // Render academic year with badge-style background
    if (template.academicYear) {
      const yearText = `Academic Year: ${template.academicYear}`;
      const yearWidth = doc.widthOfString(yearText) + 20;
      const yearX = (pageWidth - yearWidth) / 2;
      
      // Draw subtle background for academic year
      doc
        .rect(yearX, currentY - 2, yearWidth, 16)
        .fillColor('#f0f0f0')
        .fill();
      
      doc
        .fontSize(10)
        .fillColor(template.secondaryColor || '#666666')
        .text(yearText, margins.left, currentY, {
          align: 'center',
          width: pageWidth - margins.left - margins.right,
        });
      currentY += 20;
    }

    // Add a subtle divider line
    doc
      .moveTo(margins.left + 50, currentY)
      .lineTo(pageWidth - margins.right - 50, currentY)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    // Reset fill color for subsequent content
    doc.fillColor('#000000');
  }

  private renderPlaceholders(
    doc: typeof PDFDocument,
    template: ExamTemplateEntity,
    examData: ExamData,
  ): void {
    if (!template.placeholders || template.placeholders.length === 0) {
      return;
    }

    const placeholderMap: Record<string, string> = {
      '{{StudentName}}': examData.studentName || '',
      '{{Teacher}}': examData.teacher || '',
      '{{Subject}}': examData.subject || '',
      '{{Class}}': examData.classLevel || '',
      '{{Date}}': examData.examDate || '',
      '{{Duration}}': examData.duration || '',
      '{{AcademicYear}}': examData.academicYear || '',
      '{{ExamTitle}}': examData.title || '',
      '{{TotalMarks}}': examData.totalMarks?.toString() || '',
    };

    const fontFamily = template.fontFamily || 'Helvetica';

    template.placeholders.forEach((placeholder: any) => {
      const value = placeholderMap[placeholder.key] || '';

      if (value || placeholder.showEmpty) {
        const fontSize = placeholder.fontSize || 12;
        const textColor = placeholder.textColor || template.primaryColor || '#000000';
        const labelText = placeholder.label || placeholder.key.replace(/[{}]/g, '');
        
        // Render label with bold font
        doc
          .font(fontFamily)
          .fontSize(fontSize)
          .fillColor('#666666')
          .text(
            `${labelText}:`,
            placeholder.position.x,
            placeholder.position.y,
            { continued: true }
          );
        
        // Render value with regular font
        doc
          .fillColor(textColor)
          .text(` ${value || '_____'}`, {
            continued: false,
            underline: !value, // Underline if empty (for manual fill-in)
          });
        
        // Add underline space for empty fields (for printing and manual fill)
        if (!value && placeholder.showUnderline) {
          const labelWidth = doc.widthOfString(`${labelText}: `);
          const underlineY = placeholder.position.y + fontSize + 2;
          doc
            .moveTo(placeholder.position.x + labelWidth, underlineY)
            .lineTo(placeholder.position.x + labelWidth + 100, underlineY)
            .strokeColor('#cccccc')
            .lineWidth(0.5)
            .stroke();
        }
      }
    });

    // Reset fill color
    doc.fillColor('#000000');
  }

  private renderWatermark(
    doc: typeof PDFDocument,
    watermarkText: string,
    opacity: number,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    doc.save();

    // Calculate appropriate font size based on text length
    const textLength = watermarkText.length;
    const fontSize = Math.max(40, Math.min(70, 600 / textLength));

    doc
      .opacity(Math.min(opacity / 100, 0.3)) // Cap at 30% for subtlety
      .rotate(-45, { origin: [centerX, centerY] })
      .font('Helvetica-Bold')
      .fontSize(fontSize)
      .fillColor('#DDDDDD')
      .text(watermarkText, 0, centerY - fontSize / 2, {
        align: 'center',
        width: pageWidth,
        lineGap: 10,
      });

    doc.restore();
  }

  private renderFooter(
    doc: typeof PDFDocument,
    footerText: string,
    pageWidth: number,
    pageHeight: number,
  ): void {
    const margins = 30;
    const footerY = pageHeight - 45;

    // Add a subtle divider line above footer
    doc
      .moveTo(margins + 50, footerY - 10)
      .lineTo(pageWidth - margins - 50, footerY - 10)
      .strokeColor('#e0e0e0')
      .lineWidth(0.5)
      .stroke();

    // Render footer text with smaller, lighter styling
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#888888')
      .text(footerText, margins, footerY, {
        align: 'center',
        width: pageWidth - margins * 2,
        lineGap: 2,
      });

    // Add page number on the right
    const pageNumber = 1; // Can be extended for multi-page support
    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(`Page ${pageNumber}`, pageWidth - margins - 50, footerY, {
        width: 50,
        align: 'right',
      });
  }
}
