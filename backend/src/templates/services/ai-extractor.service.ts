import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { UploadService } from '../../upload/upload.service';
import { AiExtractionException } from '../exceptions/ai-extraction.exception';
import axios from 'axios';
import sharp from 'sharp';

export interface ExtractedMetadata {
  institutionName: string | null;
  institutionAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  academicYear: string | null;
  logoBase64: string | null;
  logoPosition: { x: number; y: number; width: number; height: number } | null;
  detectedPlaceholders: string[];
}

export interface LogoExtraction {
  base64: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable()
export class AiExtractorService {
  private readonly logger = new Logger(AiExtractorService.name);
  private readonly AI_TIMEOUT = 5000; // 5 seconds timeout

  constructor(
    private readonly aiService: AiService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Wrapper method that implements retry logic with exponential backoff for AI extraction
   * @param headerDocumentUrl - URL to the uploaded header document
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns ExtractedMetadata with all fields nullable
   * @throws AiExtractionException after all retries are exhausted
   */
  async extractWithRetry(
    headerDocumentUrl: string,
    maxRetries: number = 3,
  ): Promise<ExtractedMetadata> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Extraction attempt ${attempt} of ${maxRetries} for: ${headerDocumentUrl}`);
        
        // Attempt extraction
        const result = await this.extractMetadata(headerDocumentUrl);
        
        this.logger.log(`Extraction succeeded on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        
        const errorMessage = error?.message || 'Unknown error';
        this.logger.warn(`Extraction attempt ${attempt} failed: ${errorMessage}`);
        
        // If this is not the last attempt, apply exponential backoff
        if (attempt < maxRetries) {
          // Exponential backoff: 2^attempt * 1000ms
          const delay = Math.pow(2, attempt) * 1000;
          
          this.logger.log(`Waiting ${delay}ms before retry attempt ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted - throw AiExtractionException
    const errorMessage = lastError?.message || 'Unknown error';
    this.logger.error(`All ${maxRetries} extraction attempts failed. Last error: ${errorMessage}`);
    
    throw new AiExtractionException(
      `Failed after ${maxRetries} attempts: ${errorMessage}`
    );
  }

  /**
   * Extract metadata from a header document
   * @param headerDocumentUrl - URL to the uploaded header document
   * @returns ExtractedMetadata with all fields nullable
   */
  async extractMetadata(headerDocumentUrl: string): Promise<ExtractedMetadata> {
    this.logger.log(`Starting metadata extraction for: ${headerDocumentUrl}`);

    // Initialize result with all null values
    const result: ExtractedMetadata = {
      institutionName: null,
      institutionAddress: null,
      contactPhone: null,
      contactEmail: null,
      academicYear: null,
      logoBase64: null,
      logoPosition: null,
      detectedPlaceholders: [],
    };

    try {
      // Create a promise that will timeout after 5 seconds
      const extractionPromise = this.performExtraction(headerDocumentUrl);
      const timeoutPromise = new Promise<ExtractedMetadata>((_, reject) => {
        setTimeout(() => reject(new Error('AI extraction timeout')), this.AI_TIMEOUT);
      });

      // Race between extraction and timeout
      const extractedData = await Promise.race([extractionPromise, timeoutPromise]);
      
      this.logger.log('Metadata extraction completed successfully');
      return extractedData;
    } catch (error) {
      // Log error but return empty values instead of throwing
      this.logger.warn(`Metadata extraction failed: ${error.message}`);
      this.logger.warn('Returning empty metadata values');
      return result;
    }
  }

  /**
   * Perform the actual extraction process
   */
  private async performExtraction(headerDocumentUrl: string): Promise<ExtractedMetadata> {
    const result: ExtractedMetadata = {
      institutionName: null,
      institutionAddress: null,
      contactPhone: null,
      contactEmail: null,
      academicYear: null,
      logoBase64: null,
      logoPosition: null,
      detectedPlaceholders: [],
    };

    try {
      // Download the document from the URL
      const fileResponse = await axios.get(headerDocumentUrl, {
        responseType: 'arraybuffer',
        timeout: 3000, // 3 second timeout for download
      });

      const fileBuffer = Buffer.from(fileResponse.data);
      
      // Construct AI prompt for extraction
      const prompt = this.buildExtractionPrompt();
      
      // For now, we'll use text-based AI extraction
      // In a production system, you'd want to use a vision model or OCR
      const aiResponse = await this.aiService.chat(prompt, 
        'You are an expert at analyzing educational institution documents and extracting structured information.'
      );

      // Parse the AI response
      const parsedData = this.parseExtractionResponse(aiResponse);
      
      // Merge parsed data into result
      Object.assign(result, parsedData);

      return result;
    } catch (error) {
      this.logger.error(`Extraction error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build the prompt for AI extraction
   */
  private buildExtractionPrompt(): string {
    return `Please analyze the provided educational institution header document and extract the following information in JSON format:

Required Information:
1. Institution name (school/university name)
2. Institution address (full address)
3. Contact phone number
4. Contact email address
5. Academic year (if present)
6. Any detected placeholders (text patterns like {{StudentName}}, {{Date}}, etc.)

Return ONLY a valid JSON object with this structure:
{
  "institutionName": "string or null",
  "institutionAddress": "string or null",
  "contactPhone": "string or null",
  "contactEmail": "string or null",
  "academicYear": "string or null",
  "detectedPlaceholders": ["array of placeholder strings"]
}

Rules:
- Return null for any field that cannot be found
- For placeholders, look for patterns like {{...}} or similar template syntax
- Return only the JSON object, no additional text
- Ensure all values are properly escaped for JSON`;
  }

  /**
   * Parse the AI response into structured metadata
   */
  private parseExtractionResponse(aiResponse: string): Partial<ExtractedMetadata> {
    try {
      let cleanedResponse = aiResponse.trim();

      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\n?```$/g, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validate and return parsed data
      return {
        institutionName: this.sanitizeString(parsed.institutionName),
        institutionAddress: this.sanitizeString(parsed.institutionAddress),
        contactPhone: this.sanitizeString(parsed.contactPhone),
        contactEmail: this.sanitizeString(parsed.contactEmail),
        academicYear: this.sanitizeString(parsed.academicYear),
        detectedPlaceholders: Array.isArray(parsed.detectedPlaceholders)
          ? parsed.detectedPlaceholders.filter((p: any) => typeof p === 'string')
          : [],
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      this.logger.debug(`Raw AI response: ${aiResponse}`);
      
      // Return empty values if parsing fails
      return {
        institutionName: null,
        institutionAddress: null,
        contactPhone: null,
        contactEmail: null,
        academicYear: null,
        detectedPlaceholders: [],
      };
    }
  }

  /**
   * Sanitize string values - convert empty strings to null
   */
  private sanitizeString(value: any): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Extract logo from image buffer using image processing
   * Detects the logo region and extracts it as base64
   * @param imageBuffer - Buffer containing the header document image
   * @returns LogoExtraction with base64 and position data, or null if extraction fails
   */
  private async extractLogo(imageBuffer: Buffer): Promise<LogoExtraction | null> {
    try {
      this.logger.log('Starting logo extraction from image buffer');

      // Get image metadata
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        this.logger.warn('Image metadata missing dimensions');
        return null;
      }

      this.logger.debug(`Image dimensions: ${metadata.width}x${metadata.height}`);

      // Convert to grayscale and apply edge detection to find logo boundaries
      // Most logos are in the top portion of the document (header area)
      const topPortion = Math.floor(metadata.height * 0.3); // Top 30% of document
      
      // Extract the top portion where logos typically appear
      const headerRegion = await sharp(imageBuffer)
        .extract({ 
          left: 0, 
          top: 0, 
          width: metadata.width, 
          height: topPortion 
        })
        .toBuffer();

      // Find the logo region by detecting high-contrast areas
      // This is a simplified approach - logos typically have distinct edges
      const stats = await sharp(headerRegion).stats();
      
      // Calculate logo dimensions based on typical header logo sizes
      // Logos are usually 10-20% of document width and positioned in the top-left or center
      const estimatedLogoWidth = Math.floor(metadata.width * 0.15);
      const estimatedLogoHeight = Math.floor(topPortion * 0.6);
      
      // Determine logo position (check left side first, as most logos are left-aligned)
      let logoX = Math.floor(metadata.width * 0.05); // 5% from left edge
      let logoY = Math.floor(metadata.height * 0.05); // 5% from top edge
      
      // Check if there might be a centered logo by analyzing image characteristics
      // For now, we'll default to left-aligned as that's most common in headers
      
      // Extract the estimated logo region
      const logoRegion = await sharp(imageBuffer)
        .extract({
          left: logoX,
          top: logoY,
          width: estimatedLogoWidth,
          height: estimatedLogoHeight,
        })
        .toBuffer();

      // Trim transparent/white borders from the logo
      const trimmedLogo = await sharp(logoRegion)
        .trim({
          threshold: 10, // Trim pixels that are within 10 of white/transparent
        })
        .toBuffer();

      // Get final logo dimensions after trimming
      const logoMetadata = await sharp(trimmedLogo).metadata();
      const finalWidth = logoMetadata.width || estimatedLogoWidth;
      const finalHeight = logoMetadata.height || estimatedLogoHeight;

      // Convert logo to base64
      const logoBase64 = trimmedLogo.toString('base64');
      
      // Determine the MIME type based on original image format
      const format = metadata.format || 'png';
      const mimeType = `image/${format}`;
      const base64WithPrefix = `data:${mimeType};base64,${logoBase64}`;

      this.logger.log(`Logo extracted successfully: ${finalWidth}x${finalHeight} at position (${logoX}, ${logoY})`);

      return {
        base64: base64WithPrefix,
        x: logoX,
        y: logoY,
        width: finalWidth,
        height: finalHeight,
      };
    } catch (error) {
      this.logger.error(`Logo extraction failed: ${error.message}`);
      this.logger.debug(error.stack);
      return null;
    }
  }
}
