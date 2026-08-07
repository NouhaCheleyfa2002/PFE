import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplatesService } from './templates.service';
import { ExamTemplateEntity } from './entities/exam-template.entity';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TemplatesService - Serialization and Deserialization', () => {
  let service: TemplatesService;
  let repository: Repository<ExamTemplateEntity>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(ExamTemplateEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    repository = module.get<Repository<ExamTemplateEntity>>(
      getRepositoryToken(ExamTemplateEntity),
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('serializeTemplate', () => {
    it('should serialize a complete template to JSON', async () => {
      // Arrange
      const template = new ExamTemplateEntity();
      template.id = '123e4567-e89b-12d3-a456-426614174000';
      template.name = 'Test Template';
      template.userId = '123e4567-e89b-12d3-a456-426614174001';
      template.institutionName = 'Test University';
      template.institutionAddress = '123 Test Street';
      template.contactPhone = '+1234567890';
      template.contactEmail = 'test@university.edu';
      template.academicYear = '2023-2024';
      template.logoUrl = 'https://example.com/logo.png';
      template.logoPosition = { x: 10, y: 10, width: 50, height: 50 };
      template.pageMargins = { top: 20, bottom: 20, left: 20, right: 20 };
      template.pageOrientation = 'portrait';
      template.fontFamily = 'Times New Roman';
      template.primaryColor = '#000000';
      template.secondaryColor = '#FFFFFF';
      template.footerText = 'Test Footer';
      template.watermarkText = 'DRAFT';
      template.watermarkOpacity = 30;
      template.placeholders = [
        {
          key: 'StudentName',
          label: 'Student Name',
          position: { x: 100, y: 100 },
          fontSize: 12,
          fontWeight: 'bold',
        },
      ];
      template.createdAt = new Date('2024-01-01T00:00:00.000Z');
      template.updatedAt = new Date('2024-01-02T00:00:00.000Z');
      template.isDefault = false;

      // Act
      const json = await service.serializeTemplate(template);
      const parsed = JSON.parse(json);

      // Assert
      expect(parsed.id).toBe(template.id);
      expect(parsed.name).toBe(template.name);
      expect(parsed.userId).toBe(template.userId);
      expect(parsed.institutionMetadata.name).toBe(template.institutionName);
      expect(parsed.institutionMetadata.address).toBe(template.institutionAddress);
      expect(parsed.institutionMetadata.phone).toBe(template.contactPhone);
      expect(parsed.institutionMetadata.email).toBe(template.contactEmail);
      expect(parsed.institutionMetadata.academicYear).toBe(template.academicYear);
      expect(parsed.institutionMetadata.logoUrl).toBe(template.logoUrl);
      expect(parsed.layout.logoPosition).toEqual(template.logoPosition);
      expect(parsed.layout.pageMargins).toEqual(template.pageMargins);
      expect(parsed.layout.pageOrientation).toBe(template.pageOrientation);
      expect(parsed.styling.fontFamily).toBe(template.fontFamily);
      expect(parsed.styling.primaryColor).toBe(template.primaryColor);
      expect(parsed.styling.secondaryColor).toBe(template.secondaryColor);
      expect(parsed.styling.footerText).toBe(template.footerText);
      expect(parsed.styling.watermark.text).toBe(template.watermarkText);
      expect(parsed.styling.watermark.opacity).toBe(template.watermarkOpacity);
      expect(parsed.placeholders).toEqual(template.placeholders);
      expect(parsed.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(parsed.metadata.updatedAt).toBe('2024-01-02T00:00:00.000Z');
      expect(parsed.metadata.isDefault).toBe(false);
    });

    it('should serialize a template with minimal fields to JSON', async () => {
      // Arrange
      const template = new ExamTemplateEntity();
      template.id = '123e4567-e89b-12d3-a456-426614174000';
      template.name = 'Minimal Template';
      template.userId = '123e4567-e89b-12d3-a456-426614174001';
      template.logoPosition = { x: 0, y: 0, width: 0, height: 0 };
      template.pageMargins = { top: 0, bottom: 0, left: 0, right: 0 };
      template.pageOrientation = 'portrait';
      template.fontFamily = 'Times New Roman';
      template.watermarkOpacity = 30;
      template.placeholders = [];
      template.createdAt = new Date('2024-01-01T00:00:00.000Z');
      template.updatedAt = new Date('2024-01-01T00:00:00.000Z');
      template.isDefault = false;

      // Act
      const json = await service.serializeTemplate(template);
      const parsed = JSON.parse(json);

      // Assert
      expect(parsed.id).toBe(template.id);
      expect(parsed.name).toBe(template.name);
      expect(parsed.userId).toBe(template.userId);
      expect(parsed.institutionMetadata.name).toBeUndefined();
      expect(parsed.placeholders).toEqual([]);
    });
  });

  describe('deserializeTemplate', () => {
    it('should deserialize a complete JSON template', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        institutionMetadata: {
          name: 'Test University',
          address: '123 Test Street',
          phone: '+1234567890',
          email: 'test@university.edu',
          academicYear: '2023-2024',
          logoUrl: 'https://example.com/logo.png',
        },
        layout: {
          logoPosition: { x: 10, y: 10, width: 50, height: 50 },
          pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
          pageOrientation: 'portrait',
        },
        styling: {
          fontFamily: 'Times New Roman',
          primaryColor: '#000000',
          secondaryColor: '#FFFFFF',
          footerText: 'Test Footer',
          watermark: {
            text: 'DRAFT',
            opacity: 30,
          },
        },
        placeholders: [
          {
            key: 'StudentName',
            label: 'Student Name',
            position: { x: 100, y: 100 },
            fontSize: 12,
            fontWeight: 'bold',
          },
        ],
        metadata: {
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          isDefault: false,
        },
      });

      // Act
      const template = await service.deserializeTemplate(json);

      // Assert
      expect(template.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(template.name).toBe('Test Template');
      expect(template.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(template.institutionName).toBe('Test University');
      expect(template.institutionAddress).toBe('123 Test Street');
      expect(template.contactPhone).toBe('+1234567890');
      expect(template.contactEmail).toBe('test@university.edu');
      expect(template.academicYear).toBe('2023-2024');
      expect(template.logoUrl).toBe('https://example.com/logo.png');
      expect(template.logoPosition).toEqual({ x: 10, y: 10, width: 50, height: 50 });
      expect(template.pageMargins).toEqual({ top: 20, bottom: 20, left: 20, right: 20 });
      expect(template.pageOrientation).toBe('portrait');
      expect(template.fontFamily).toBe('Times New Roman');
      expect(template.primaryColor).toBe('#000000');
      expect(template.secondaryColor).toBe('#FFFFFF');
      expect(template.footerText).toBe('Test Footer');
      expect(template.watermarkText).toBe('DRAFT');
      expect(template.watermarkOpacity).toBe(30);
      expect(template.placeholders).toHaveLength(1);
      expect(template.placeholders[0].key).toBe('StudentName');
      expect(template.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(template.updatedAt).toEqual(new Date('2024-01-02T00:00:00.000Z'));
      expect(template.isDefault).toBe(false);
    });

    it('should deserialize a minimal JSON template with defaults', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Minimal Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        layout: {
          logoPosition: { x: 0, y: 0, width: 0, height: 0 },
          pageMargins: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      });

      // Act
      const template = await service.deserializeTemplate(json);

      // Assert
      expect(template.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(template.name).toBe('Minimal Template');
      expect(template.userId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(template.institutionName).toBeNull();
      expect(template.institutionAddress).toBeNull();
      expect(template.fontFamily).toBe('Times New Roman');
      expect(template.watermarkOpacity).toBe(30);
      expect(template.placeholders).toEqual([]);
      expect(template.isDefault).toBe(false);
    });

    it('should throw error for invalid JSON string', async () => {
      // Arrange
      const invalidJson = 'not a valid json';

      // Act & Assert
      await expect(service.deserializeTemplate(invalidJson)).rejects.toThrow(
        'Template deserialization failed',
      );
    });

    it('should throw error when required fields are missing', async () => {
      // Arrange
      const json = JSON.stringify({
        name: 'Test Template',
        // Missing id and userId
      });

      // Act & Assert
      await expect(service.deserializeTemplate(json)).rejects.toThrow(
        'Template ID is required',
      );
    });

    it('should throw error for invalid logo position structure', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        layout: {
          logoPosition: { x: 10, y: 10 }, // Missing width and height
          pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
      });

      // Act & Assert
      await expect(service.deserializeTemplate(json)).rejects.toThrow(
        'Logo position must have numeric x, y, width, and height properties',
      );
    });

    it('should throw error for invalid page margins structure', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        layout: {
          logoPosition: { x: 10, y: 10, width: 50, height: 50 },
          pageMargins: { top: 20, bottom: 20 }, // Missing left and right
        },
      });

      // Act & Assert
      await expect(service.deserializeTemplate(json)).rejects.toThrow(
        'Page margins must have numeric top, bottom, left, and right properties',
      );
    });

    it('should throw error for invalid placeholder structure', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        layout: {
          logoPosition: { x: 10, y: 10, width: 50, height: 50 },
          pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        placeholders: [
          {
            label: 'Student Name',
            position: { x: 100, y: 100 },
          }, // Missing key
        ],
      });

      // Act & Assert
      await expect(service.deserializeTemplate(json)).rejects.toThrow(
        'Placeholder at index 0 must have a string key property',
      );
    });

    it('should handle empty placeholders array', async () => {
      // Arrange
      const json = JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Template',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        layout: {
          logoPosition: { x: 10, y: 10, width: 50, height: 50 },
          pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        placeholders: [],
      });

      // Act
      const template = await service.deserializeTemplate(json);

      // Assert
      expect(template.placeholders).toEqual([]);
    });
  });

  describe('Round-trip serialization (Requirement 16.4)', () => {
    it('should preserve template data through serialize -> deserialize -> serialize', async () => {
      // Arrange
      const originalTemplate = new ExamTemplateEntity();
      originalTemplate.id = '123e4567-e89b-12d3-a456-426614174000';
      originalTemplate.name = 'Round Trip Template';
      originalTemplate.userId = '123e4567-e89b-12d3-a456-426614174001';
      originalTemplate.institutionName = 'Test University';
      originalTemplate.institutionAddress = '123 Test Street';
      originalTemplate.contactPhone = '+1234567890';
      originalTemplate.contactEmail = 'test@university.edu';
      originalTemplate.academicYear = '2023-2024';
      originalTemplate.logoUrl = 'https://example.com/logo.png';
      originalTemplate.logoPosition = { x: 10, y: 10, width: 50, height: 50 };
      originalTemplate.pageMargins = { top: 20, bottom: 20, left: 20, right: 20 };
      originalTemplate.pageOrientation = 'portrait';
      originalTemplate.fontFamily = 'Arial';
      originalTemplate.primaryColor = '#FF0000';
      originalTemplate.secondaryColor = '#00FF00';
      originalTemplate.footerText = 'Test Footer';
      originalTemplate.watermarkText = 'CONFIDENTIAL';
      originalTemplate.watermarkOpacity = 50;
      originalTemplate.placeholders = [
        {
          key: 'StudentName',
          label: 'Student Name',
          position: { x: 100, y: 100 },
          fontSize: 14,
          fontWeight: 'bold',
        },
        {
          key: 'ExamTitle',
          label: 'Exam Title',
          position: { x: 200, y: 200 },
          fontSize: 16,
          fontWeight: 'normal',
        },
      ];
      originalTemplate.createdAt = new Date('2024-01-01T00:00:00.000Z');
      originalTemplate.updatedAt = new Date('2024-01-02T00:00:00.000Z');
      originalTemplate.isDefault = true;

      // Act - Serialize -> Deserialize -> Serialize
      const json1 = await service.serializeTemplate(originalTemplate);
      const deserializedTemplate = await service.deserializeTemplate(json1);
      const json2 = await service.serializeTemplate(deserializedTemplate);

      // Assert - Both JSON strings should be equivalent
      const parsed1 = JSON.parse(json1);
      const parsed2 = JSON.parse(json2);

      expect(parsed1).toEqual(parsed2);
    });
  });
});
