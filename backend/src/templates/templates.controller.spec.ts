import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: TemplatesService;

  const mockTemplatesService = {
    createTemplate: jest.fn(),
    findAllByUser: jest.fn(),
    findById: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
  };

  const mockTemplate = {
    id: 'test-id',
    name: 'Test Template',
    userId: 'user-123',
    institutionName: 'Test University',
    institutionAddress: '123 Test St',
    contactPhone: '+1234567890',
    contactEmail: 'test@example.com',
    academicYear: '2024-2025',
    logoUrl: 'https://example.com/logo.png',
    logoPosition: { x: 10, y: 10, width: 100, height: 100 },
    footerText: 'Test Footer',
    watermarkText: 'CONFIDENTIAL',
    watermarkOpacity: 30,
    pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    pageOrientation: 'portrait',
    fontFamily: 'Arial',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    placeholders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: false,
    headerDocumentUrl: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    service = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      const dto: CreateTemplateDto = {
        name: 'Test Template',
        institutionName: 'Test University',
        institutionAddress: '123 Test St',
        contactPhone: '+1234567890',
        contactEmail: 'test@example.com',
        academicYear: '2024-2025',
        logoUrl: 'https://example.com/logo.png',
        logoPosition: { x: 10, y: 10, width: 100, height: 100 },
        footerText: 'Test Footer',
        watermarkText: 'CONFIDENTIAL',
        watermarkOpacity: 30,
        pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
        pageOrientation: 'portrait',
        fontFamily: 'Arial',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        placeholders: [],
      };

      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.createTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.create(mockRequest, dto);

      expect(service.createTemplate).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual({
        id: mockTemplate.id,
        name: mockTemplate.name,
        userId: mockTemplate.userId,
        institutionName: mockTemplate.institutionName,
        institutionAddress: mockTemplate.institutionAddress,
        contactPhone: mockTemplate.contactPhone,
        contactEmail: mockTemplate.contactEmail,
        academicYear: mockTemplate.academicYear,
        logoUrl: mockTemplate.logoUrl,
        logoPosition: mockTemplate.logoPosition,
        footerText: mockTemplate.footerText,
        watermarkText: mockTemplate.watermarkText,
        watermarkOpacity: mockTemplate.watermarkOpacity,
        pageMargins: mockTemplate.pageMargins,
        pageOrientation: mockTemplate.pageOrientation,
        fontFamily: mockTemplate.fontFamily,
        primaryColor: mockTemplate.primaryColor,
        secondaryColor: mockTemplate.secondaryColor,
        placeholders: mockTemplate.placeholders,
        createdAt: mockTemplate.createdAt,
        updatedAt: mockTemplate.updatedAt,
        isDefault: mockTemplate.isDefault,
        headerDocumentUrl: mockTemplate.headerDocumentUrl,
      });
    });

    it('should extract userId from request', async () => {
      const dto: CreateTemplateDto = {
        name: 'Test Template',
        logoPosition: { x: 0, y: 0, width: 100, height: 100 },
        watermarkOpacity: 30,
        pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
        pageOrientation: 'portrait',
        fontFamily: 'Arial',
        placeholders: [],
      };

      const mockRequest = {
        user: {
          sub: 'different-user-id',
          email: 'different@example.com',
        },
      };

      mockTemplatesService.createTemplate.mockResolvedValue({
        ...mockTemplate,
        userId: 'different-user-id',
      });

      await controller.create(mockRequest, dto);

      expect(service.createTemplate).toHaveBeenCalledWith('different-user-id', dto);
    });
  });

  describe('findAll', () => {
    it('should return all templates for the authenticated user', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      const mockTemplates = [mockTemplate, { ...mockTemplate, id: 'test-id-2', name: 'Template 2' }];
      mockTemplatesService.findAllByUser.mockResolvedValue(mockTemplates);

      const result = await controller.findAll(mockRequest);

      expect(service.findAllByUser).toHaveBeenCalledWith('user-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-id');
      expect(result[1].id).toBe('test-id-2');
    });
  });

  describe('findOne', () => {
    it('should return a template by ID', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.findById.mockResolvedValue(mockTemplate);

      const result = await controller.findOne(mockRequest, 'test-id');

      expect(service.findById).toHaveBeenCalledWith('test-id', 'user-123');
      expect(result).toEqual({
        id: mockTemplate.id,
        name: mockTemplate.name,
        userId: mockTemplate.userId,
        institutionName: mockTemplate.institutionName,
        institutionAddress: mockTemplate.institutionAddress,
        contactPhone: mockTemplate.contactPhone,
        contactEmail: mockTemplate.contactEmail,
        academicYear: mockTemplate.academicYear,
        logoUrl: mockTemplate.logoUrl,
        logoPosition: mockTemplate.logoPosition,
        footerText: mockTemplate.footerText,
        watermarkText: mockTemplate.watermarkText,
        watermarkOpacity: mockTemplate.watermarkOpacity,
        pageMargins: mockTemplate.pageMargins,
        pageOrientation: mockTemplate.pageOrientation,
        fontFamily: mockTemplate.fontFamily,
        primaryColor: mockTemplate.primaryColor,
        secondaryColor: mockTemplate.secondaryColor,
        placeholders: mockTemplate.placeholders,
        createdAt: mockTemplate.createdAt,
        updatedAt: mockTemplate.updatedAt,
        isDefault: mockTemplate.isDefault,
        headerDocumentUrl: mockTemplate.headerDocumentUrl,
      });
    });

    it('should extract userId from request', async () => {
      const mockRequest = {
        user: {
          sub: 'different-user-id',
          email: 'different@example.com',
        },
      };

      mockTemplatesService.findById.mockResolvedValue({
        ...mockTemplate,
        userId: 'different-user-id',
      });

      await controller.findOne(mockRequest, 'test-id');

      expect(service.findById).toHaveBeenCalledWith('test-id', 'different-user-id');
    });

    it('should pass the ID parameter to the service', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.findById.mockResolvedValue(mockTemplate);

      await controller.findOne(mockRequest, 'specific-template-id');

      expect(service.findById).toHaveBeenCalledWith('specific-template-id', 'user-123');
    });
  });

  describe('update', () => {
    it('should update a template successfully', async () => {
      const updateDto = {
        name: 'Updated Template Name',
        institutionName: 'Updated University',
        footerText: 'Updated Footer',
      };

      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      const updatedTemplate = {
        ...mockTemplate,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockTemplatesService.updateTemplate.mockResolvedValue(updatedTemplate);

      const result = await controller.update(mockRequest, 'test-id', updateDto);

      expect(service.updateTemplate).toHaveBeenCalledWith('test-id', 'user-123', updateDto);
      expect(result).toEqual({
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        userId: updatedTemplate.userId,
        institutionName: updatedTemplate.institutionName,
        institutionAddress: updatedTemplate.institutionAddress,
        contactPhone: updatedTemplate.contactPhone,
        contactEmail: updatedTemplate.contactEmail,
        academicYear: updatedTemplate.academicYear,
        logoUrl: updatedTemplate.logoUrl,
        logoPosition: updatedTemplate.logoPosition,
        footerText: updatedTemplate.footerText,
        watermarkText: updatedTemplate.watermarkText,
        watermarkOpacity: updatedTemplate.watermarkOpacity,
        pageMargins: updatedTemplate.pageMargins,
        pageOrientation: updatedTemplate.pageOrientation,
        fontFamily: updatedTemplate.fontFamily,
        primaryColor: updatedTemplate.primaryColor,
        secondaryColor: updatedTemplate.secondaryColor,
        placeholders: updatedTemplate.placeholders,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
        isDefault: updatedTemplate.isDefault,
        headerDocumentUrl: updatedTemplate.headerDocumentUrl,
      });
    });

    it('should extract userId from request', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      const mockRequest = {
        user: {
          sub: 'different-user-id',
          email: 'different@example.com',
        },
      };

      const updatedTemplate = {
        ...mockTemplate,
        userId: 'different-user-id',
        name: 'Updated Name',
      };

      mockTemplatesService.updateTemplate.mockResolvedValue(updatedTemplate);

      await controller.update(mockRequest, 'test-id', updateDto);

      expect(service.updateTemplate).toHaveBeenCalledWith('test-id', 'different-user-id', updateDto);
    });

    it('should pass the ID and DTO to the service', async () => {
      const updateDto = {
        watermarkOpacity: 50,
        primaryColor: '#FF0000',
      };

      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      const updatedTemplate = {
        ...mockTemplate,
        ...updateDto,
      };

      mockTemplatesService.updateTemplate.mockResolvedValue(updatedTemplate);

      await controller.update(mockRequest, 'specific-id', updateDto);

      expect(service.updateTemplate).toHaveBeenCalledWith('specific-id', 'user-123', updateDto);
    });

    it('should handle partial updates', async () => {
      const partialDto = {
        institutionName: 'Partially Updated',
      };

      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      const updatedTemplate = {
        ...mockTemplate,
        institutionName: 'Partially Updated',
      };

      mockTemplatesService.updateTemplate.mockResolvedValue(updatedTemplate);

      const result = await controller.update(mockRequest, 'test-id', partialDto);

      expect(service.updateTemplate).toHaveBeenCalledWith('test-id', 'user-123', partialDto);
      expect(result.institutionName).toBe('Partially Updated');
      expect(result.name).toBe(mockTemplate.name); // Original value preserved
    });
  });

  describe('delete', () => {
    it('should delete a template successfully', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.deleteTemplate.mockResolvedValue(undefined);

      const result = await controller.delete(mockRequest, 'test-id');

      expect(service.deleteTemplate).toHaveBeenCalledWith('test-id', 'user-123');
      expect(result).toBeUndefined();
    });

    it('should extract userId from request', async () => {
      const mockRequest = {
        user: {
          sub: 'different-user-id',
          email: 'different@example.com',
        },
      };

      mockTemplatesService.deleteTemplate.mockResolvedValue(undefined);

      await controller.delete(mockRequest, 'test-id');

      expect(service.deleteTemplate).toHaveBeenCalledWith('test-id', 'different-user-id');
    });

    it('should pass the template ID to the service', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.deleteTemplate.mockResolvedValue(undefined);

      await controller.delete(mockRequest, 'specific-template-id');

      expect(service.deleteTemplate).toHaveBeenCalledWith('specific-template-id', 'user-123');
    });

    it('should handle deletion of non-existent template', async () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'test@example.com',
        },
      };

      mockTemplatesService.deleteTemplate.mockRejectedValue(
        new Error('Template not found'),
      );

      await expect(controller.delete(mockRequest, 'non-existent-id')).rejects.toThrow('Template not found');
      expect(service.deleteTemplate).toHaveBeenCalledWith('non-existent-id', 'user-123');
    });
  });
});
