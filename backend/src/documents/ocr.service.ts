import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OCRResult, OCRPage } from './document.interface';

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);
  private readonly azureEndpoint: string;
  private readonly azureApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.azureEndpoint = this.configService.get<string>('AZURE_OCR_ENDPOINT', '');
    this.azureApiKey = this.configService.get<string>('AZURE_OCR_API_KEY', '');
  }

  async processDocument(documentId: string, fileUrl: string): Promise<OCRResult> {
    this.logger.log(`Starting OCR processing for document: ${documentId}`);

    // Check if Azure credentials are properly configured
    const hasValidAzureConfig = 
      this.azureEndpoint && 
      this.azureApiKey && 
      !this.azureEndpoint.includes('your-resource-name') &&
      !this.azureApiKey.includes('your-api-key');

    if (!hasValidAzureConfig) {
      this.logger.warn('Azure OCR credentials not configured, using mock OCR');
      return this.mockOCRProcessing(documentId);
    }

    try {
      // Step 1: Download the file from SeaweedFS
      this.logger.log(`Downloading file from: ${fileUrl}`);
      const fileResponse = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      const fileBuffer = Buffer.from(fileResponse.data);
      this.logger.log(`File downloaded, size: ${fileBuffer.length} bytes`);

      // Step 2: Submit document content for analysis
      const analyzeUrl = `${this.azureEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
      
      const submitResponse = await axios.post(
        analyzeUrl,
        fileBuffer,
        {
          headers: {
            'Content-Type': 'application/pdf',
            'Ocp-Apim-Subscription-Key': this.azureApiKey,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      // Get operation location from response headers
      const operationLocation = submitResponse.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('No operation location returned from Azure OCR');
      }

      this.logger.log(`Document submitted to Azure OCR, operation: ${operationLocation}`);

      // Step 3: Poll for results
      const result = await this.pollForResults(operationLocation);

      // Step 4: Extract text from result
      const ocrResult = this.extractTextFromAzureResult(documentId, result);

      this.logger.log(`OCR processing completed for document: ${documentId}`);
      return ocrResult;
    } catch (error) {
      this.logger.error(`Azure OCR failed for document ${documentId}:`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        endpoint: this.azureEndpoint,
      });
      
      // Fallback to mock OCR instead of throwing error
      this.logger.warn(`Falling back to mock OCR for document ${documentId}`);
      return this.mockOCRProcessing(documentId);
    }
  }

  private async pollForResults(operationLocation: string, maxAttempts = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000); // Wait 2 seconds between polls

      const response = await axios.get(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.azureApiKey,
        },
      });

      const status = response.data.status;
      this.logger.log(`OCR status: ${status} (attempt ${attempt + 1}/${maxAttempts})`);

      if (status === 'succeeded') {
        return response.data;
      } else if (status === 'failed') {
        throw new Error('Azure OCR processing failed');
      }
      // Continue polling if status is 'running' or 'notStarted'
    }

    throw new Error('OCR processing timeout');
  }

  private extractTextFromAzureResult(documentId: string, azureResult: any): OCRResult {
    const pages: OCRPage[] = [];

    if (azureResult.analyzeResult && azureResult.analyzeResult.pages) {
      for (const page of azureResult.analyzeResult.pages) {
        const pageText = page.lines?.map((line: any) => line.content).join('\n') || '';
        
        // Extract figures/images information from Azure result
        const figures: any[] = [];
        if (azureResult.analyzeResult.figures) {
          // Azure provides figure bounding regions and page references
          const pageFigures = azureResult.analyzeResult.figures.filter((fig: any) => 
            fig.boundingRegions?.some((region: any) => region.pageNumber === page.pageNumber)
          );
          
          for (const figure of pageFigures) {
            const boundingRegion = figure.boundingRegions?.find((r: any) => r.pageNumber === page.pageNumber);
            if (boundingRegion) {
              figures.push({
                id: figure.id || `figure-${figures.length + 1}`,
                caption: figure.caption?.content || null,
                boundingBox: boundingRegion.polygon || [],
                pageNumber: page.pageNumber,
                confidence: figure.confidence || 0.9,
              });
            }
          }
        }
        
        pages.push({
          page: page.pageNumber,
          text: pageText,
          confidence: page.confidence,
          figures: figures.length > 0 ? figures : undefined,
        });
        
        if (figures.length > 0) {
          this.logger.log(`Page ${page.pageNumber}: Extracted ${figures.length} figures`);
        }
      }
    }

    return {
      documentId,
      pages,
      totalPages: pages.length,
      processedAt: new Date(),
    };
  }

  private async mockOCRProcessing(documentId: string): Promise<OCRResult> {
    this.logger.log(`Using mock OCR for document: ${documentId}`);
    
    // Simulate processing time
    await this.sleep(3000);

    return {
      documentId,
      pages: [
        {
          page: 1,
          text: 'This is a mock OCR result for testing purposes.\n\nIntroduction to Machine Learning\n\nMachine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
          confidence: 0.95,
        },
        {
          page: 2,
          text: 'Chapter 1: Supervised Learning\n\nSupervised learning algorithms learn from labeled training data and make predictions based on that data.',
          confidence: 0.93,
        },
      ],
      totalPages: 2,
      processedAt: new Date(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
