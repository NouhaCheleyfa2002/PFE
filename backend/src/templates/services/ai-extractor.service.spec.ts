import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AiExtractorService } from './ai-extractor.service';
import { AiService } from '../../ai/ai.service';
import { UploadService } from '../../upload/upload.service';
import { AiExtractionException } from '../exceptions/ai-extraction.exception';

describe('AiExtractorService - Retry Logic', () => {
  let service: AiExtractorService;
  let aiService: AiService;
  let uploadService: UploadService;

  const mockAiService = {
    chat: jest.fn(),
  };

  const mockUploadService = {
    getFileUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiExtractorService,
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    service = module.get<AiExtractorService>(AiExtractorService);
    aiService = module.get<AiService>(AiService);
    uploadService = module.get<UploadService>(UploadService);

    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Spy on logger methods to suppress logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('extractWithRetry', () => {
    const testUrl = 'https://example.com/header.pdf';

    it('should return metadata on first successful attempt', async () => {
      // Arrange
      const expectedMetadata = {
        institutionName: 'Test University',
        institutionAddress: '123 Test St',
        contactPhone: '+1234567890',
        contactEmail: 'test@university.edu',
        academicYear: '2023-2024',
        logoBase64: null,
        logoPosition: null,
        detectedPlaceholders: [],
      };

      // Mock extractMetadata to succeed immediately
      jest.spyOn(service, 'extractMetadata').mockResolvedValueOnce(expectedMetadata);

      // Act
      const result = await service.extractWithRetry(testUrl);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(service.extractMetadata).toHaveBeenCalledTimes(1);
      expect(service.extractMetadata).toHaveBeenCalledWith(testUrl);
    });

    it('should retry with exponential backoff on failures', async () => {
      // Arrange
      const expectedMetadata = {
        institutionName: 'Test University',
        institutionAddress: null,
        contactPhone: null,
        contactEmail: null,
        academicYear: null,
        logoBase64: null,
        logoPosition: null,
        detectedPlaceholders: [],
      };

      // Mock first two attempts to fail, third to succeed
      jest
        .spyOn(service, 'extractMetadata')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(expectedMetadata);

      // Spy on setTimeout to track delays
      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry(testUrl, 3);

      // Fast-forward through the delays
      await jest.advanceTimersByTimeAsync(2000); // First retry: 2^1 * 1000 = 2000ms
      await jest.advanceTimersByTimeAsync(4000); // Second retry: 2^2 * 1000 = 4000ms

      const result = await promise;

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(service.extractMetadata).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    }, 10000);

    it('should throw AiExtractionException after all retries exhausted', async () => {
      // Arrange
      const errorMessage = 'API rate limit exceeded';
      
      // Mock all attempts to fail
      jest
        .spyOn(service, 'extractMetadata')
        .mockRejectedValue(new Error(errorMessage));

      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry(testUrl, 3);

      // Fast-forward through all retry delays and catch the rejection
      await jest.advanceTimersByTimeAsync(2000); // First retry delay
      await jest.advanceTimersByTimeAsync(4000); // Second retry delay

      // Assert
      try {
        await promise;
        fail('Should have thrown AiExtractionException');
      } catch (error) {
        expect(error).toBeInstanceOf(AiExtractionException);
        expect(service.extractMetadata).toHaveBeenCalledTimes(3);
      }

      jest.useRealTimers();
    }, 10000);

    it('should respect custom maxRetries parameter', async () => {
      // Arrange
      jest
        .spyOn(service, 'extractMetadata')
        .mockRejectedValue(new Error('Persistent error'));

      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry(testUrl, 2);

      // Fast-forward through retry delay
      await jest.advanceTimersByTimeAsync(2000);

      // Assert
      try {
        await promise;
        fail('Should have thrown AiExtractionException');
      } catch (error) {
        expect(error).toBeInstanceOf(AiExtractionException);
        expect(service.extractMetadata).toHaveBeenCalledTimes(2);
      }

      jest.useRealTimers();
    }, 10000);

    it('should not retry after successful first attempt', async () => {
      // Arrange
      const expectedMetadata = {
        institutionName: 'Success University',
        institutionAddress: '456 Success Ave',
        contactPhone: '+9876543210',
        contactEmail: 'success@university.edu',
        academicYear: '2024-2025',
        logoBase64: null,
        logoPosition: null,
        detectedPlaceholders: ['{{StudentName}}', '{{Date}}'],
      };

      jest.spyOn(service, 'extractMetadata').mockResolvedValueOnce(expectedMetadata);

      // Spy on setTimeout to ensure no delays happen
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Act
      const result = await service.extractWithRetry(testUrl, 3);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(service.extractMetadata).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('should use correct exponential backoff formula: 2^attempt * 1000ms', async () => {
      // Arrange
      const expectedMetadata = {
        institutionName: null,
        institutionAddress: null,
        contactPhone: null,
        contactEmail: null,
        academicYear: null,
        logoBase64: null,
        logoPosition: null,
        detectedPlaceholders: [],
      };

      // Mock first 3 attempts to fail, 4th to succeed
      jest
        .spyOn(service, 'extractMetadata')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce(expectedMetadata);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry(testUrl, 4);

      // Fast-forward through all delays
      await jest.advanceTimersByTimeAsync(2000);  // 2^1 * 1000 = 2000ms
      await jest.advanceTimersByTimeAsync(4000);  // 2^2 * 1000 = 4000ms
      await jest.advanceTimersByTimeAsync(8000);  // 2^3 * 1000 = 8000ms

      const result = await promise;

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(service.extractMetadata).toHaveBeenCalledTimes(4);
      
      // Verify the exponential backoff delays
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);  // 2^1 * 1000
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);  // 2^2 * 1000
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 8000);  // 2^3 * 1000

      jest.useRealTimers();
    }, 10000);

    it('should log extraction attempts and failures', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      jest
        .spyOn(service, 'extractMetadata')
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockRejectedValueOnce(new Error('Third failure'));

      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry(testUrl, 3);

      // Fast-forward through delays
      await jest.advanceTimersByTimeAsync(2000);
      await jest.advanceTimersByTimeAsync(4000);

      try {
        await promise;
      } catch (error) {
        // Expected to fail
      }

      // Assert - Verify logging
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 1 of 3'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 1 failed'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Waiting 2000ms before retry'));
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 2 of 3'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 2 failed'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Waiting 4000ms before retry'));
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 3 of 3'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Extraction attempt 3 failed'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('All 3 extraction attempts failed'));

      jest.useRealTimers();
    }, 10000);
  });

  describe('Error handling', () => {
    it('should include original error message in AiExtractionException reason', async () => {
      // Arrange
      const originalError = 'DeepSeek API timeout';
      jest.spyOn(service, 'extractMetadata').mockRejectedValue(new Error(originalError));

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry('https://example.com/test.pdf', 2);

      await jest.advanceTimersByTimeAsync(2000);

      // Assert
      try {
        await promise;
        fail('Should have thrown AiExtractionException');
      } catch (error) {
        expect(error).toBeInstanceOf(AiExtractionException);
        // Verify the error was logged with the original message
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`All 2 extraction attempts failed. Last error: ${originalError}`)
        );
      }

      jest.useRealTimers();
    }, 10000);

    it('should handle null/undefined errors gracefully', async () => {
      // Arrange
      jest.spyOn(service, 'extractMetadata').mockRejectedValue(null);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      jest.useFakeTimers();

      // Act
      const promise = service.extractWithRetry('https://example.com/test.pdf', 1);

      // Assert
      try {
        await promise;
        fail('Should have thrown AiExtractionException');
      } catch (error) {
        expect(error).toBeInstanceOf(AiExtractionException);
        // Verify "Unknown error" was logged
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('All 1 extraction attempts failed. Last error: Unknown error')
        );
      }

      jest.useRealTimers();
    }, 10000);
  });
});
