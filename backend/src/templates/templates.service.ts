import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamTemplateEntity } from './entities/exam-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ExamData } from './dto/exam-data.dto';
import { PremiumRequiredException } from './exceptions/premium-required.exception';
import { TemplatePrinterService } from './services/template-printer.service';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(ExamTemplateEntity)
    private readonly templateRepository: Repository<ExamTemplateEntity>,
    private readonly templatePrinterService: TemplatePrinterService,
  ) {}

  /**
   * Create a new template with unique name validation
   * Requirements: 9.1-9.7, 17.4, 17.5
   */
  async createTemplate(userId: string, dto: CreateTemplateDto): Promise<ExamTemplateEntity> {
    // Check template limit for premium users (Requirements: 17.4, 17.5)
    await this.checkTemplateLimit(userId);

    // Validate unique name for this user
    await this.validateUniqueTemplateName(dto.name, userId);

    // Create template entity
    const template = this.templateRepository.create({
      ...dto,
      userId,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Template created: ${saved.id} - ${saved.name} by user ${userId}`);

    return saved;
  }

  /**
   * Find template by ID with user ownership check
   * Requirements: 10.1-10.6
   */
  async findById(id: string, userId: string): Promise<ExamTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // Check ownership - allow access to default templates
    if (template.userId !== userId && !template.isDefault) {
      throw new ForbiddenException('You do not have permission to access this template');
    }

    return template;
  }

  /**
   * Find all templates by user with sorting by updatedAt DESC
   * Requirements: 10.1-10.6
   */
  async findAllByUser(userId: string): Promise<ExamTemplateEntity[]> {
    return this.templateRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Get the default system template
   * Requirements: 1.2, 17.3
   * @returns Default template if exists, otherwise null
   */
  async getDefaultTemplate(): Promise<ExamTemplateEntity | null> {
    const defaultTemplate = await this.templateRepository.findOne({
      where: { isDefault: true },
    });

    if (!defaultTemplate) {
      this.logger.warn('No default template found in database');
    }

    return defaultTemplate;
  }

  /**
   * Update template with user ownership check and unique name validation
   * Requirements: 11.1-11.5
   */
  async updateTemplate(
    id: string,
    userId: string,
    dto: UpdateTemplateDto,
  ): Promise<ExamTemplateEntity> {
    // Find template with ownership check
    const template = await this.findById(id, userId);

    // If name is being changed, validate uniqueness
    if (dto.name && dto.name !== template.name) {
      await this.validateUniqueTemplateName(dto.name, userId, id);
    }

    // Update template fields
    Object.assign(template, dto);

    const updated = await this.templateRepository.save(template);
    this.logger.log(`Template updated: ${updated.id} - ${updated.name} by user ${userId}`);

    return updated;
  }

  /**
   * Delete template with user ownership check
   * Requirements: 12.1-12.5
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    // Find template with ownership check
    const template = await this.findById(id, userId);

    await this.templateRepository.remove(template);
    this.logger.log(`Template deleted: ${id} by user ${userId}`);
  }

  /**
   * Apply template to exam and generate PDF
   * Requirements: 13.1-13.5
   * @param templateId Template ID to apply
   * @param userId User ID for ownership validation
   * @param examData Exam data for placeholder substitution
   * @returns PDF buffer
   */
  async applyTemplateToExam(
    templateId: string,
    userId: string,
    examData: ExamData,
  ): Promise<Buffer> {
    // Load template with ownership check
    const template = await this.findById(templateId, userId);

    this.logger.log(`Applying template ${templateId} to exam for user ${userId}`);

    // Generate PDF using template printer service
    const pdfBuffer = await this.templatePrinterService.generatePdf(
      template,
      examData,
    );

    this.logger.log(`PDF generated successfully for template ${templateId}`);
    return pdfBuffer;
  }

  /**
   * Serialize template entity to JSON string
   * Requirements: 16.1, 16.2, 16.4
   * @param template Template entity to serialize
   * @returns JSON string representation of the template
   */
  async serializeTemplate(template: ExamTemplateEntity): Promise<string> {
    try {
      // Create structured JSON object matching the schema in design.md
      const serialized = {
        id: template.id,
        name: template.name,
        userId: template.userId,
        institutionMetadata: {
          name: template.institutionName,
          address: template.institutionAddress,
          phone: template.contactPhone,
          email: template.contactEmail,
          academicYear: template.academicYear,
          logoUrl: template.logoUrl,
        },
        layout: {
          logoPosition: template.logoPosition,
          pageMargins: template.pageMargins,
          pageOrientation: template.pageOrientation,
        },
        styling: {
          fontFamily: template.fontFamily,
          primaryColor: template.primaryColor,
          secondaryColor: template.secondaryColor,
          footerText: template.footerText,
          watermark: {
            text: template.watermarkText,
            opacity: template.watermarkOpacity,
          },
        },
        placeholders: template.placeholders,
        metadata: {
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
          isDefault: template.isDefault,
        },
      };

      return JSON.stringify(serialized, null, 2);
    } catch (error) {
      this.logger.error(`Failed to serialize template ${template.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deserialize JSON string to template entity object
   * Requirements: 16.1, 16.2, 16.4
   * @param json JSON string to parse
   * @returns Template entity object (not saved to database)
   * @throws Error if JSON is invalid or structure is incorrect
   */
  async deserializeTemplate(json: string): Promise<ExamTemplateEntity> {
    try {
      const parsed = JSON.parse(json);

      // Validate required top-level fields
      this.validateTemplateStructure(parsed);

      // Create template entity from parsed JSON
      const template = new ExamTemplateEntity();
      
      // Basic fields
      template.id = parsed.id;
      template.name = parsed.name;
      template.userId = parsed.userId;
      
      // Institution metadata
      template.institutionName = parsed.institutionMetadata?.name || null;
      template.institutionAddress = parsed.institutionMetadata?.address || null;
      template.contactPhone = parsed.institutionMetadata?.phone || null;
      template.contactEmail = parsed.institutionMetadata?.email || null;
      template.academicYear = parsed.institutionMetadata?.academicYear || null;
      template.logoUrl = parsed.institutionMetadata?.logoUrl || null;
      
      // Layout configuration
      template.logoPosition = this.validateLogoPosition(parsed.layout?.logoPosition);
      template.pageMargins = this.validatePageMargins(parsed.layout?.pageMargins);
      template.pageOrientation = parsed.layout?.pageOrientation || 'portrait';
      
      // Styling
      template.fontFamily = parsed.styling?.fontFamily || 'Times New Roman';
      template.primaryColor = parsed.styling?.primaryColor || null;
      template.secondaryColor = parsed.styling?.secondaryColor || null;
      template.footerText = parsed.styling?.footerText || null;
      template.watermarkText = parsed.styling?.watermark?.text || null;
      template.watermarkOpacity = parsed.styling?.watermark?.opacity ?? 30;
      
      // Placeholders
      template.placeholders = this.validatePlaceholdersArray(parsed.placeholders);
      
      // Metadata
      template.createdAt = parsed.metadata?.createdAt ? new Date(parsed.metadata.createdAt) : new Date();
      template.updatedAt = parsed.metadata?.updatedAt ? new Date(parsed.metadata.updatedAt) : new Date();
      template.isDefault = parsed.metadata?.isDefault ?? false;

      this.logger.log(`Template deserialized: ${template.id} - ${template.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to deserialize template JSON: ${error.message}`);
      throw new Error(`Template deserialization failed: ${error.message}`);
    }
  }

  /**
   * Validate template JSON structure
   * @param parsed Parsed JSON object
   * @throws Error if required fields are missing
   */
  private validateTemplateStructure(parsed: any): void {
    if (!parsed.id || typeof parsed.id !== 'string') {
      throw new Error('Template ID is required and must be a string');
    }
    if (!parsed.name || typeof parsed.name !== 'string') {
      throw new Error('Template name is required and must be a string');
    }
    if (!parsed.userId || typeof parsed.userId !== 'string') {
      throw new Error('Template userId is required and must be a string');
    }
    if (!parsed.layout || typeof parsed.layout !== 'object') {
      throw new Error('Template layout configuration is required');
    }
  }

  /**
   * Validate logo position structure
   * @param logoPosition Logo position object from JSON
   * @returns Validated logo position object
   * @throws Error if structure is invalid
   */
  private validateLogoPosition(logoPosition: any): { x: number; y: number; width: number; height: number } {
    if (!logoPosition || typeof logoPosition !== 'object') {
      throw new Error('Logo position is required and must be an object');
    }
    
    const { x, y, width, height } = logoPosition;
    
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Logo position must have numeric x, y, width, and height properties');
    }
    
    return { x, y, width, height };
  }

  /**
   * Validate page margins structure
   * @param pageMargins Page margins object from JSON
   * @returns Validated page margins object
   * @throws Error if structure is invalid
   */
  private validatePageMargins(pageMargins: any): { top: number; bottom: number; left: number; right: number } {
    if (!pageMargins || typeof pageMargins !== 'object') {
      throw new Error('Page margins are required and must be an object');
    }
    
    const { top, bottom, left, right } = pageMargins;
    
    if (typeof top !== 'number' || typeof bottom !== 'number' || typeof left !== 'number' || typeof right !== 'number') {
      throw new Error('Page margins must have numeric top, bottom, left, and right properties');
    }
    
    return { top, bottom, left, right };
  }

  /**
   * Validate placeholders array structure
   * @param placeholders Placeholders array from JSON
   * @returns Validated placeholders array
   */
  private validatePlaceholdersArray(placeholders: any): any[] {
    if (!placeholders || !Array.isArray(placeholders)) {
      return [];
    }
    
    return placeholders.map((placeholder, index) => {
      if (typeof placeholder !== 'object') {
        throw new Error(`Placeholder at index ${index} must be an object`);
      }
      
      if (!placeholder.key || typeof placeholder.key !== 'string') {
        throw new Error(`Placeholder at index ${index} must have a string key property`);
      }
      
      if (!placeholder.position || typeof placeholder.position !== 'object') {
        throw new Error(`Placeholder at index ${index} must have a position object`);
      }
      
      if (typeof placeholder.position.x !== 'number' || typeof placeholder.position.y !== 'number') {
        throw new Error(`Placeholder at index ${index} position must have numeric x and y properties`);
      }
      
      return placeholder;
    });
  }

  /**
   * Validate placeholder syntax in text (public version for external use)
   * Requirements: 6.6
   * @param templateText Text to validate for placeholder syntax
   * @throws BadRequestException if placeholder syntax is invalid
   */
  validatePlaceholderText(templateText: string): void {
    this.validatePlaceholders(templateText);
  }

  /**
   * Substitute placeholders in template text with exam data
   * Requirements: 6.1, 6.6, 13.2, 13.3
   * @param templateText Text containing placeholders
   * @param examData Exam data to substitute into placeholders
   * @returns Text with placeholders replaced by values or empty strings if missing
   */
  private substitutePlaceholders(templateText: string, examData: ExamData): string {
    if (!templateText) {
      return '';
    }

    // Create placeholder map with all supported placeholders
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

    // Replace all placeholders with actual values
    let result = templateText;
    for (const [placeholder, value] of Object.entries(placeholderMap)) {
      result = result.replaceAll(placeholder, value);
    }

    return result;
  }

  /**
   * Validate placeholder syntax in template text
   * Checks for malformed placeholders and unknown placeholder types
   * Requirements: 6.6
   * @param templateText Text to validate for placeholder syntax
   * @throws BadRequestException if placeholder syntax is invalid
   */
  private validatePlaceholders(templateText: string): void {
    if (!templateText) {
      return;
    }

    // Regex to find all placeholder patterns
    const placeholderPattern = /\{\{([^}]+)\}\}/g;
    const validPlaceholders = [
      'StudentName',
      'Teacher',
      'Subject',
      'Class',
      'Date',
      'Duration',
      'AcademicYear',
      'ExamTitle',
      'TotalMarks',
    ];

    const matches = templateText.matchAll(placeholderPattern);
    const invalidPlaceholders: string[] = [];

    for (const match of matches) {
      const placeholderName = match[1].trim();
      
      // Check if placeholder is valid
      if (!validPlaceholders.includes(placeholderName)) {
        invalidPlaceholders.push(`{{${placeholderName}}}`);
      }
    }

    // Check for malformed placeholders - single opening or closing braces that are NOT part of valid placeholders
    // This pattern looks for { or } that are not followed/preceded by another brace
    const malformedPattern = /(?<!\{)\{(?!\{)|(?<!\})\}(?!\})/g;
    const malformedMatches = [...templateText.matchAll(malformedPattern)];

    if (malformedMatches.length > 0) {
      throw new BadRequestException(
        'Template contains malformed placeholders. Use double curly braces: {{PlaceholderName}}',
      );
    }

    if (invalidPlaceholders.length > 0) {
      throw new BadRequestException(
        `Template contains invalid placeholders: ${invalidPlaceholders.join(', ')}. ` +
        `Valid placeholders are: ${validPlaceholders.map(p => `{{${p}}}`).join(', ')}`,
      );
    }

    this.logger.log('Placeholder validation passed');
  }

  /**
   * Validate that template name is unique for the user
   * @param name Template name to validate
   * @param userId User ID
   * @param excludeId Optional template ID to exclude (for updates)
   * @throws ConflictException if name already exists
   */
  private async validateUniqueTemplateName(
    name: string,
    userId: string,
    excludeId?: string,
  ): Promise<void> {
    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.userId = :userId', { userId })
      .andWhere('template.name = :name', { name });

    if (excludeId) {
      query.andWhere('template.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();

    if (existing) {
      throw new ConflictException(`A template with the name "${name}" already exists`);
    }
  }

  /**
   * Check if user has reached template limit (10 templates for premium users)
   * Requirements: 17.4, 17.5
   * @param userId User ID to check template count
   * @throws PremiumRequiredException if user has 10 or more templates
   */
  private async checkTemplateLimit(userId: string): Promise<void> {
    const templateCount = await this.templateRepository.count({
      where: { userId },
    });

    if (templateCount >= 10) {
      this.logger.warn(`User ${userId} reached template limit: ${templateCount} templates`);
      throw new PremiumRequiredException(
        'Template limit reached. You can have a maximum of 10 templates. Please delete old templates to create new ones.',
      );
    }
  }
}
