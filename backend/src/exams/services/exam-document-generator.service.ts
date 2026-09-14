import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
  blanks?: Array<{ id: string; correctAnswer: string }>;
  imageUrl?: string;
  imageCaption?: string;
}

interface ExamData {
  title: string;
  classLevel: string;
  subject: string;
  bacSection?: string;
  duration?: string;
  instructions?: string;
  questions: ExamQuestion[];
  maxPoints: number;
}

@Injectable()
export class ExamDocumentGeneratorService {
  private readonly logger = new Logger(ExamDocumentGeneratorService.name);

  /**
   * Generate PDF from exam data
   */
  async generatePDF(examData: ExamData): Promise<Buffer> {
    this.logger.log(`Generating PDF for exam: ${examData.title}`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'portrait',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
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

        // Render PDF content
        this.renderPDFContent(doc, examData);

        doc.end();
      } catch (error) {
        this.logger.error(`PDF generation failed: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Generate DOCX from exam data
   * 
   * NOTE: DOCX generation is currently not used in production.
   * Only PDF is generated to prevent students from editing exam content.
   * This method is kept for potential future use cases (e.g., teacher editing).
   */
  async generateDOCX(examData: ExamData): Promise<Buffer> {
    this.logger.log(`Generating DOCX for exam: ${examData.title}`);

    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: this.renderDOCXContent(examData),
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      this.logger.log('DOCX generation completed');
      return buffer;
    } catch (error) {
      this.logger.error(`DOCX generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Render PDF content with improved styling to match exam preview
   */
  private renderPDFContent(doc: typeof PDFDocument, examData: ExamData): void {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colors = {
      primary: '#0d1b3e',
      secondary: '#5a7299',
      accent: '#63b3ed',
      border: '#c0d0e8',
      lightBg: '#f9faff',
    };

    // Add decorative header background
    doc
      .rect(0, 0, doc.page.width, 100)
      .fillAndStroke('#f0f4ff', '#edf0f7');

    // Badge/Section indicator
    if (examData.bacSection) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('white');
      
      const badgeText = examData.bacSection.toUpperCase();
      const badgeWidth = doc.widthOfString(badgeText) + 20;
      const badgeX = (doc.page.width - badgeWidth) / 2;
      
      doc
        .roundedRect(badgeX, 20, badgeWidth, 18, 9)
        .fill(colors.primary);
      
      doc
        .fillColor('white')
        .text(badgeText, badgeX, 24, { width: badgeWidth, align: 'center' });
    }

    // Title
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .fillColor(colors.primary)
      .text(examData.title, 50, examData.bacSection ? 50 : 30, {
        align: 'center',
        width: pageWidth,
      });

    doc.moveDown(0.3);

    // Metadata row with icons
    doc.fontSize(11).font('Helvetica').fillColor(colors.secondary);
    const metaY = doc.y + 5;
    let metaX = 50;
    
    const addMetaItem = (icon: string, text: string) => {
      doc.text(icon, metaX, metaY);
      metaX += doc.widthOfString(icon) + 5;
      doc.text(text, metaX, metaY);
      metaX += doc.widthOfString(text) + 20;
    };

    addMetaItem('📚', `${examData.classLevel}`);
    addMetaItem('📖', `${examData.subject}`);
    if (examData.duration) {
      addMetaItem('⏱️', `${examData.duration}`);
    }
    addMetaItem('⭐', `${examData.maxPoints} points`);

    doc.y = metaY + 20;

    // Divider line
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .lineWidth(2)
      .strokeColor(colors.primary)
      .stroke();

    doc.moveDown(1.5);

    // Instructions box
    if (examData.instructions) {
      const instructionsY = doc.y;
      
      // Light blue background
      doc
        .rect(50, instructionsY - 5, pageWidth, doc.heightOfString(examData.instructions, { width: pageWidth - 40 }) + 25)
        .fillAndStroke('#e6f2ff', '#b3d9ff');

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(colors.primary)
        .text('📋 Instructions:', 60, instructionsY);

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text(examData.instructions, 60, doc.y, {
          width: pageWidth - 20,
          align: 'left',
        });

      doc.moveDown(1.5);
    }

    // Questions section
    examData.questions.forEach((question, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - doc.page.margins.bottom - 180) {
        doc.addPage();
        doc.y = 50;
      }

      // Question box with left border accent
      const questionStartY = doc.y;
      
      // Left accent bar
      doc
        .rect(45, questionStartY, 4, 20)
        .fill(colors.accent);

      // Question number and points
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(colors.primary)
        .text(`Question ${index + 1}`, 55, questionStartY);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text(`(${question.points} ${question.points === 1 ? 'point' : 'points'})`, 
          doc.widthOfString(`Question ${index + 1}`) + 60, questionStartY + 2);

      doc.moveDown(0.8);

      // Question text
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#000000')
        .text(question.text, 55, doc.y, {
          width: pageWidth - 10,
          align: 'left',
          lineGap: 3,
        });

      doc.moveDown(0.7);

      // Render options based on question type
      if (question.type === 'mcq' || question.type === 'multiple_choice') {
        if (question.options && question.options.length > 0) {
          question.options.forEach((option, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
            const optionY = doc.y;
            
            // Circle for option
            doc
              .circle(65, optionY + 5, 6)
              .stroke('#d1d5db');
            
            // Option letter
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .fillColor(colors.secondary)
              .text(letter, 80, optionY);
            
            // Option text
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor('#374151')
              .text(option, 95, optionY, {
                width: pageWidth - 50,
                align: 'left',
              });
            
            doc.moveDown(0.5);
          });
        }
      } else if (question.type === 'true_false') {
        const tfY = doc.y;
        
        // True option
        doc.circle(65, tfY + 5, 6).stroke('#d1d5db');
        doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.secondary).text('True', 80, tfY);
        
        doc.moveDown(0.7);
        
        // False option
        doc.circle(65, doc.y + 5, 6).stroke('#d1d5db');
        doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.secondary).text('False', 80, doc.y);
        
        doc.moveDown(0.5);
      } else if (question.type === 'fill_in_blank' || question.type === 'fill_blank') {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(colors.secondary)
          .text('Answer:', 65, doc.y);
        
        doc.moveDown(0.3);
        
        // Answer line
        doc
          .moveTo(65, doc.y)
          .lineTo(pageWidth + 40, doc.y)
          .dash(5, { space: 3 })
          .strokeColor(colors.border)
          .stroke();
        
        doc.moveDown(0.5);
      } else if (question.type === 'short_answer' || question.type === 'open') {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(colors.secondary)
          .text('Answer:', 65, doc.y);
        
        doc.moveDown(0.3);
        
        // Multiple answer lines for short answer
        for (let i = 0; i < 3; i++) {
          doc
            .moveTo(65, doc.y)
            .lineTo(pageWidth + 40, doc.y)
            .dash(5, { space: 3 })
            .strokeColor(colors.border)
            .stroke();
          
          doc.moveDown(0.6);
        }
      } else if (question.type === 'essay') {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(colors.secondary)
          .text('Answer:', 65, doc.y);
        
        doc.moveDown(0.3);
        
        // Multiple answer lines for essay
        for (let i = 0; i < 6; i++) {
          doc
            .moveTo(65, doc.y)
            .lineTo(pageWidth + 40, doc.y)
            .dash(5, { space: 3 })
            .strokeColor(colors.border)
            .stroke();
          
          doc.moveDown(0.6);
        }
      }

      doc.moveDown(1);
    });

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .text('Generated by EduShare Platform', {
        align: 'center',
      });
  }

  /**
   * Render DOCX content
   */
  private renderDOCXContent(examData: ExamData): Paragraph[] {
    const content: Paragraph[] = [];

    // Title
    content.push(
      new Paragraph({
        text: examData.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Metadata
    content.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Subject: ${examData.subject}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    content.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Level: ${examData.classLevel}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    if (examData.bacSection) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Section: ${examData.bacSection}`, bold: true }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
    }

    if (examData.duration) {
      content.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Duration: ${examData.duration}`, bold: true }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );
    }

    content.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Total Points: ${examData.maxPoints}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );

    // Instructions
    if (examData.instructions) {
      content.push(
        new Paragraph({
          children: [new TextRun({ text: 'Instructions:', bold: true })],
          spacing: { before: 200, after: 100 },
        })
      );

      content.push(
        new Paragraph({
          text: examData.instructions,
          spacing: { after: 300 },
        })
      );
    }

    // Questions
    examData.questions.forEach((question, index) => {
      content.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Question ${index + 1} (${question.points} ${question.points === 1 ? 'point' : 'points'}): `,
              bold: true,
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      content.push(
        new Paragraph({
          text: question.text,
          spacing: { after: 100 },
        })
      );

      // Render based on question type
      if (question.type === 'mcq' && question.options) {
        question.options.forEach((option, optIndex) => {
          const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
          content.push(
            new Paragraph({
              text: `   ${letter}. ${option}`,
              spacing: { after: 50 },
            })
          );
        });
      } else if (question.type === 'true_false') {
        content.push(
          new Paragraph({
            text: '   ☐ True',
            spacing: { after: 50 },
          })
        );
        content.push(
          new Paragraph({
            text: '   ☐ False',
            spacing: { after: 100 },
          })
        );
      } else if (question.type === 'fill_in_blank') {
        content.push(
          new Paragraph({
            text: '   Answer: ___________________________',
            spacing: { after: 100 },
          })
        );
      } else if (question.type === 'short_answer') {
        content.push(
          new Paragraph({
            text: '   Answer:',
            spacing: { after: 50 },
          })
        );
        content.push(new Paragraph({ text: '', spacing: { after: 300 } })); // Space
      } else if (question.type === 'essay') {
        content.push(
          new Paragraph({
            text: '   Answer:',
            spacing: { after: 50 },
          })
        );
        content.push(new Paragraph({ text: '', spacing: { after: 600 } })); // More space
      }
    });

    // Footer
    content.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Generated by EduShare Platform',
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    );

    return content;
  }
}
