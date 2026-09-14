import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationRequestEntity } from './entities/verification-request.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as stringSimilarity from 'string-similarity';

interface ExtractedIdentity {
  fullName?: string;
  professionalId?: string;
  institution?: string;
  role?: string;
  teachingLevel?: string;
  subjects?: string[];
  validUntil?: string;
  idNumber?: string;
  confidence: number;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedAccounts: Array<{
    userId: string;
    fullName: string;
    professionalId: string;
    institution: string;
    verifiedAt: Date;
    matchScore: number;
    matchReasons: string[];
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface FraudDetectionResult {
  isSuspicious: boolean;
  suspicionScore: number;
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: {
    documentQuality?: string;
    textConsistency?: string;
    institutionVerified?: boolean;
    suspiciousPatterns?: string[];
  };
}

export enum AIVerificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VERIFIED_MATCH = 'verified_match',
  POSSIBLE_DUPLICATE = 'possible_duplicate',
  SUSPICIOUS_DOCUMENT = 'suspicious_document',
  NEEDS_REVIEW = 'needs_review',
  PROCESSED = 'processed',
  ERROR = 'error',
}

@Injectable()
export class AIVerificationService {
  private readonly logger = new Logger(AIVerificationService.name);
  private readonly azureOcrEndpoint: string;
  private readonly azureOcrKey: string;
  private readonly deepseekApiUrl: string;
  private readonly deepseekApiKey: string;

  constructor(
    @InjectRepository(VerificationRequestEntity)
    private verificationRepo: Repository<VerificationRequestEntity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.azureOcrEndpoint = this.configService.get<string>('AZURE_OCR_ENDPOINT') || '';
    this.azureOcrKey = this.configService.get<string>('AZURE_OCR_API_KEY') || '';
    this.deepseekApiUrl = this.configService.get<string>('DEEPSEEK_API_URL') || '';
    this.deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
  }

  /**
   * Main AI verification pipeline
   * Orchestrates all AI verification steps
   */
  async analyzeVerificationRequest(requestId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[AI Verification] Starting analysis for request ${requestId}`);

    try {
      // Update status to processing
      await this.verificationRepo.update(requestId, {
        aiStatus: AIVerificationStatus.PROCESSING,
      });

      const request = await this.verificationRepo.findOne({
        where: { id: requestId },
        relations: ['user'],
      });

      if (!request || !request.documentUrls || request.documentUrls.length === 0) {
        throw new Error('No documents to analyze');
      }

      // Step 1: OCR + AI Extraction
      this.logger.log(`[AI Verification] Step 1: Extracting identity information`);
      const extractedData = await this.extractIdentityFromDocuments(request.documentUrls);

      // Step 2: Duplicate Detection
      this.logger.log(`[AI Verification] Step 2: Checking for duplicates`);
      const duplicateCheck = await this.checkForDuplicates(extractedData, request.userId, request);

      // Step 3: Fraud Detection
      this.logger.log(`[AI Verification] Step 3: Analyzing for fraud indicators`);
      const fraudAnalysis = await this.detectFraud(extractedData, request);

      // Step 4: Calculate overall score and status
      const overallScore = this.calculateVerificationScore(extractedData, duplicateCheck, fraudAnalysis);
      const aiStatus = this.determineAIStatus(duplicateCheck, fraudAnalysis, overallScore);
      const riskLevel = this.determineRiskLevel(duplicateCheck, fraudAnalysis);

      // Collect all AI flags
      const aiFlags = [
        ...duplicateCheck.matchedAccounts.map(m => `Possible duplicate: ${m.fullName} (${m.matchScore}% match)`),
        ...fraudAnalysis.flags,
      ];

      // Update verification request with AI results
      await this.verificationRepo.update(requestId, {
        aiExtractedData: extractedData as any,
        aiVerificationScore: overallScore,
        aiStatus,
        aiRiskLevel: riskLevel,
        aiFlags,
        duplicateCheckResult: duplicateCheck as any,
        professionalId: extractedData.professionalId || null,
        aiProcessedAt: new Date(),
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[AI Verification] Completed analysis for request ${requestId} in ${processingTime}ms - Status: ${aiStatus}, Risk: ${riskLevel}, Score: ${overallScore}`,
      );

      // Log the analysis
      await this.logAIAnalysis(requestId, 'full_pipeline', {
        extractedData,
        duplicateCheck,
        fraudAnalysis,
      }, {
        score: overallScore,
        status: aiStatus,
        riskLevel,
      }, processingTime);

    } catch (error) {
      this.logger.error(`[AI Verification] Failed to analyze request ${requestId}:`, error);
      await this.verificationRepo.update(requestId, {
        aiStatus: AIVerificationStatus.ERROR,
        aiFlags: [`AI Analysis Error: ${error.message}`],
      });
    }
  }

  /**
   * Step 1: Extract identity information from documents using OCR + LLM
   */
  private async extractIdentityFromDocuments(documentUrls: string[]): Promise<ExtractedIdentity> {
    try {
      // Use first document for now (typically the ID/professional card)
      const documentUrl = documentUrls[0];
      
      this.logger.log(`[OCR] Processing document: ${documentUrl}`);

      // Perform OCR using Azure
      const ocrText = await this.performOCR(documentUrl);

      if (!ocrText) {
        throw new Error('OCR failed to extract text');
      }

      this.logger.log(`[OCR] Extracted ${ocrText.length} characters`);

      // Use LLM to structure the extracted information
      const structuredData = await this.structureIdentityData(ocrText);

      return structuredData;
    } catch (error) {
      this.logger.error(`[OCR] Failed to extract identity:`, error.message);
      return {
        confidence: 0,
      };
    }
  }

  /**
   * Perform OCR using Azure Document Intelligence
   */
  private async performOCR(documentUrl: string): Promise<string> {
    try {
      // Step 1: Download the file from SeaweedFS (works with localhost!)
      this.logger.log(`[OCR] Downloading file from: ${documentUrl}`);
      const fileResponse = await firstValueFrom(
        this.httpService.get(documentUrl, {
          responseType: 'arraybuffer',
        }),
      );
      
      const fileBuffer = Buffer.from((fileResponse as any).data);
      this.logger.log(`[OCR] File downloaded, size: ${fileBuffer.length} bytes`);

      // Detect content type from file buffer
      let contentType = 'application/pdf';
      const fileHeader = fileBuffer.toString('hex', 0, 4).toLowerCase();
      
      // Check magic numbers for common formats
      if (fileHeader.startsWith('ffd8ff')) {
        contentType = 'image/jpeg';
      } else if (fileHeader === '89504e47') {
        contentType = 'image/png';
      } else if (fileHeader.startsWith('25504446')) {
        contentType = 'application/pdf';
      } else if (fileHeader === '424d') {
        contentType = 'image/bmp';
      } else if (fileHeader.startsWith('47494638')) {
        contentType = 'image/gif';
      } else if (fileHeader.startsWith('49492a00') || fileHeader.startsWith('4d4d002a')) {
        contentType = 'image/tiff';
      }
      
      this.logger.log(`[OCR] Detected content type: ${contentType}`);

      // Step 2: Submit document CONTENT (not URL) to Azure
      const analyzeUrl = `${this.azureOcrEndpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;

      const submitResponse = await firstValueFrom(
        this.httpService.post(
          analyzeUrl,
          fileBuffer,
          {
            headers: {
              'Ocp-Apim-Subscription-Key': this.azureOcrKey,
              'Content-Type': contentType,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          },
        ),
      );

      const operationLocation = (submitResponse as any).headers['operation-location'];
      
      if (!operationLocation) {
        throw new Error('No operation location returned from Azure OCR');
      }

      this.logger.log(`[OCR] Document submitted to Azure, polling for results...`);
      
      // Step 3: Poll for results
      let result: any;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await this.sleep(2000);
        const resultResponse = await firstValueFrom(
          this.httpService.get(operationLocation, {
            headers: {
              'Ocp-Apim-Subscription-Key': this.azureOcrKey,
            },
          }),
        );

        const resultData = (resultResponse as any).data;
        const status = resultData.status;
        
        this.logger.log(`[OCR] Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
        
        if (status === 'succeeded') {
          result = resultData;
          break;
        } else if (status === 'failed') {
          throw new Error('OCR analysis failed');
        }

        attempts++;
      }

      if (!result) {
        throw new Error('OCR timeout after 60 seconds');
      }

      // Step 4: Extract text content
      const text = result.analyzeResult.content || '';
      this.logger.log(`[OCR] Successfully extracted ${text.length} characters`);
      return text;
    } catch (error) {
      this.logger.error(`[OCR] Azure OCR failed:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Use LLM to structure extracted OCR text into identity data
   */
  private async structureIdentityData(ocrText: string): Promise<ExtractedIdentity> {
    try {
      const prompt = `You are an AI assistant helping to extract structured identity information from Tunisian teacher professional cards and ID documents.

Extract the following information from this OCR text:

OCR Text:
${ocrText}

Please extract and return ONLY a JSON object with these fields (use null if not found):
{
  "fullName": "teacher's full name",
  "professionalId": "professional card number or teacher ID",
  "institution": "institution/school/university name",
  "role": "job title or role (e.g., Teacher, Professor)",
  "teachingLevel": "one of: primary, secondary, university, private_tutor",
  "subjects": ["list of subjects taught"],
  "validUntil": "expiration date if mentioned",
  "idNumber": "national ID number if present",
  "confidence": a number 0-100 representing your confidence in the extraction
}

Return ONLY the JSON object, no additional text.`;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.deepseekApiUrl}/chat/completions`,
          {
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'You are a precise data extraction assistant. Return only valid JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 1000,
          },
          {
            headers: {
              Authorization: `Bearer ${this.deepseekApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const responseData = (response as any).data;
      const content = responseData.choices[0].message.content.trim();
      
      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM did not return valid JSON');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      this.logger.log(`[LLM] Extracted identity with ${extracted.confidence}% confidence`);

      return extracted;
    } catch (error) {
      this.logger.error(`[LLM] Failed to structure identity data:`, error.message);
      return {
        confidence: 0,
      };
    }
  }

  /**
   * Step 2: Check for duplicate verified teachers
   */
  private async checkForDuplicates(
    extractedData: ExtractedIdentity,
    currentUserId: string,
    request: VerificationRequestEntity,
  ): Promise<DuplicateCheckResult> {
    const matchedAccounts: DuplicateCheckResult['matchedAccounts'] = [];

    try {
      // Query 1: Exact professional ID match
      if (extractedData.professionalId) {
        const exactMatches = await this.verificationRepo
          .createQueryBuilder('vr')
          .leftJoinAndSelect('vr.user', 'user')
          .where('vr.professional_id = :professionalId', { professionalId: extractedData.professionalId })
          .andWhere('vr.status = :status', { status: 'approved' })
          .andWhere('vr.userId != :currentUserId', { currentUserId })
          .getMany();

        for (const match of exactMatches) {
          matchedAccounts.push({
            userId: match.userId,
            fullName: match.fullName,
            professionalId: match.professionalId || 'N/A',
            institution: match.institution,
            verifiedAt: match.reviewedAt || new Date(),
            matchScore: 100,
            matchReasons: ['Exact professional ID match'],
          });
        }
      }

      // Query 2: Check for duplicate national ID / passport number (user-provided or extracted)
      const idToCheck = request.idNumber || extractedData.idNumber;
      
      this.logger.log(`[Duplicate Check] Checking ID: ${idToCheck}`);
      
      if (idToCheck) {
        const idMatches = await this.verificationRepo
          .createQueryBuilder('vr')
          .leftJoinAndSelect('vr.user', 'user')
          .where('vr.status = :status', { status: 'approved' })
          .andWhere('vr.userId != :currentUserId', { currentUserId })
          .andWhere(
            `(vr.id_number = :idNumber OR vr.ai_extracted_data->>'idNumber' = :idNumber)`,
            { idNumber: idToCheck }
          )
          .getMany();

        this.logger.log(`[Duplicate Check] Found ${idMatches.length} ID matches for ID: ${idToCheck}`);

        for (const match of idMatches) {
          // Only add if not already added by professional ID check
          if (!matchedAccounts.some(m => m.userId === match.userId)) {
            matchedAccounts.push({
              userId: match.userId,
              fullName: match.fullName,
              professionalId: match.professionalId || 'N/A',
              institution: match.institution,
              verifiedAt: match.reviewedAt || new Date(),
              matchScore: 100,
              matchReasons: ['Exact national ID/passport match'],
            });
          } else {
            // Update existing match to add the ID match reason
            const existing = matchedAccounts.find(m => m.userId === match.userId);
            if (existing && !existing.matchReasons.includes('Exact national ID/passport match')) {
              existing.matchReasons.push('Exact national ID/passport match');
            }
          }
        }
      }

      // Query 3: High similarity name + institution match
      if (extractedData.fullName && extractedData.institution) {
        const allVerified = await this.verificationRepo
          .createQueryBuilder('vr')
          .leftJoinAndSelect('vr.user', 'user')
          .where('vr.status = :status', { status: 'approved' })
          .andWhere('vr.userId != :currentUserId', { currentUserId })
          .getMany();

        for (const verified of allVerified) {
          // Skip if already matched by ID
          if (matchedAccounts.some(m => m.userId === verified.userId)) {
            continue;
          }

          const nameSimilarity = stringSimilarity.compareTwoStrings(
            extractedData.fullName.toLowerCase(),
            verified.fullName.toLowerCase(),
          );
          const institutionSimilarity = stringSimilarity.compareTwoStrings(
            extractedData.institution.toLowerCase(),
            verified.institution.toLowerCase(),
          );

          // If names are very similar (> 80%) AND institutions match (> 70%)
          if (nameSimilarity > 0.8 && institutionSimilarity > 0.7) {
            const matchScore = Math.round((nameSimilarity + institutionSimilarity) / 2 * 100);
            const reasons: string[] = [];

            if (nameSimilarity > 0.95) reasons.push('Nearly identical name');
            else if (nameSimilarity > 0.8) reasons.push('Very similar name');

            if (institutionSimilarity > 0.9) reasons.push('Same institution');
            else if (institutionSimilarity > 0.7) reasons.push('Similar institution');

            matchedAccounts.push({
              userId: verified.userId,
              fullName: verified.fullName,
              professionalId: verified.professionalId || 'N/A',
              institution: verified.institution,
              verifiedAt: verified.reviewedAt || new Date(),
              matchScore,
              matchReasons: reasons,
            });
          }
        }
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (matchedAccounts.some(m => m.matchScore === 100)) {
        riskLevel = 'critical'; // Exact ID match (professional ID or national ID)
      } else if (matchedAccounts.some(m => m.matchScore >= 95)) {
        riskLevel = 'high'; // Very high similarity
      } else if (matchedAccounts.some(m => m.matchScore >= 85)) {
        riskLevel = 'medium'; // Moderate similarity
      }

      return {
        isDuplicate: matchedAccounts.length > 0,
        matchedAccounts,
        riskLevel,
      };
    } catch (error) {
      this.logger.error(`[Duplicate Check] Failed:`, error);
      return {
        isDuplicate: false,
        matchedAccounts: [],
        riskLevel: 'low',
      };
    }
  }

  /**
   * Step 3: Detect fraud indicators
   */
  private async detectFraud(
    extractedData: ExtractedIdentity,
    request: VerificationRequestEntity,
  ): Promise<FraudDetectionResult> {
    const flags: string[] = [];
    let suspicionScore = 0;

    // Check 1: Low confidence extraction
    if (extractedData.confidence < 50) {
      flags.push('Low OCR extraction confidence - document may be unclear or manipulated');
      suspicionScore += 30;
    }

    // Check 2: Missing critical fields
    if (!extractedData.fullName) {
      flags.push('Could not extract name from document');
      suspicionScore += 20;
    }

    if (!extractedData.professionalId && !extractedData.idNumber) {
      flags.push('No identification number found in document');
      suspicionScore += 25;
    }

    if (!extractedData.institution) {
      flags.push('Institution name not detected');
      suspicionScore += 15;
    }

    // Check 3: Mismatched information with form submission
    if (extractedData.fullName && request.fullName) {
      const nameSimilarity = stringSimilarity.compareTwoStrings(
        extractedData.fullName.toLowerCase(),
        request.fullName.toLowerCase(),
      );
      
      if (nameSimilarity < 0.6) {
        flags.push(`Name mismatch: Form says "${request.fullName}" but document says "${extractedData.fullName}"`);
        suspicionScore += 40;
      }
    }

    if (extractedData.institution && request.institution) {
      const instSimilarity = stringSimilarity.compareTwoStrings(
        extractedData.institution.toLowerCase(),
        request.institution.toLowerCase(),
      );
      
      if (instSimilarity < 0.5) {
        flags.push(`Institution mismatch: Form says "${request.institution}" but document says "${extractedData.institution}"`);
        suspicionScore += 30;
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (suspicionScore >= 80) {
      riskLevel = 'critical';
    } else if (suspicionScore >= 50) {
      riskLevel = 'high';
    } else if (suspicionScore >= 25) {
      riskLevel = 'medium';
    }

    return {
      isSuspicious: suspicionScore > 25,
      suspicionScore,
      flags,
      riskLevel,
      details: {
        documentQuality: extractedData.confidence > 70 ? 'good' : extractedData.confidence > 40 ? 'moderate' : 'poor',
        textConsistency: flags.length < 2 ? 'consistent' : 'inconsistent',
        institutionVerified: !!extractedData.institution,
        suspiciousPatterns: flags,
      },
    };
  }

  /**
   * Calculate overall AI verification score
   */
  private calculateVerificationScore(
    extractedData: ExtractedIdentity,
    duplicateCheck: DuplicateCheckResult,
    fraudAnalysis: FraudDetectionResult,
  ): number {
    let score = extractedData.confidence || 0;

    // Penalize for duplicates
    if (duplicateCheck.isDuplicate) {
      const highestMatch = Math.max(...duplicateCheck.matchedAccounts.map(m => m.matchScore), 0);
      score -= highestMatch * 0.5;
    }

    // Penalize for fraud indicators
    score -= fraudAnalysis.suspicionScore * 0.5;

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Determine AI status based on analysis results
   */
  private determineAIStatus(
    duplicateCheck: DuplicateCheckResult,
    fraudAnalysis: FraudDetectionResult,
    score: number,
  ): AIVerificationStatus {
    // Critical issues
    if (duplicateCheck.matchedAccounts.some(m => m.matchScore === 100)) {
      return AIVerificationStatus.POSSIBLE_DUPLICATE;
    }

    if (fraudAnalysis.riskLevel === 'critical') {
      return AIVerificationStatus.SUSPICIOUS_DOCUMENT;
    }

    // High score with no major issues
    if (score >= 80 && duplicateCheck.riskLevel === 'low' && fraudAnalysis.riskLevel === 'low') {
      return AIVerificationStatus.VERIFIED_MATCH;
    }

    // Medium issues
    if (score >= 60 && (duplicateCheck.riskLevel === 'medium' || fraudAnalysis.riskLevel === 'medium')) {
      return AIVerificationStatus.NEEDS_REVIEW;
    }

    // Low score or issues detected
    if (score < 50 || fraudAnalysis.riskLevel === 'high') {
      return AIVerificationStatus.NEEDS_REVIEW;
    }

    // Default
    return AIVerificationStatus.PROCESSED;
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    duplicateCheck: DuplicateCheckResult,
    fraudAnalysis: FraudDetectionResult,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const risks = [duplicateCheck.riskLevel, fraudAnalysis.riskLevel];
    
    if (risks.includes('critical')) return 'critical';
    if (risks.includes('high')) return 'high';
    if (risks.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Log AI analysis for audit trail
   */
  private async logAIAnalysis(
    requestId: string,
    analysisType: string,
    inputData: any,
    outputData: any,
    processingTimeMs: number,
  ): Promise<void> {
    try {
      await this.verificationRepo.query(
        `INSERT INTO ai_verification_logs (verification_request_id, analysis_type, input_data, output_data, processing_time_ms, model_used, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [requestId, analysisType, JSON.stringify(inputData), JSON.stringify(outputData), processingTimeMs, 'Azure OCR + DeepSeek', 'completed'],
      );
    } catch (error) {
      this.logger.warn(`Failed to log AI analysis: ${error.message}`);
    }
  }

  /**
   * Utility: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
