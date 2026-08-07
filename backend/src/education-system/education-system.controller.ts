import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EducationSystemService } from './education-system.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetLevelsDto,
  GetSubjectsDto,
  GetTypesDto,
  ValidateCombinationDto,
  EducationLevelResponseDto,
  SubjectMappingResponseDto,
  TypeMappingResponseDto,
  ValidationResponseDto,
} from './dto/education-system.dto';

@Controller('education')
@UseGuards(JwtAuthGuard)
export class EducationSystemController {
  constructor(private readonly educationService: EducationSystemService) {}

  /**
   * GET /education/levels
   * Get all education levels, optionally filtered by stage
   * 
   * @example GET /education/levels?stage=primary
   */
  @Get('levels')
  async getLevels(@Query() dto: GetLevelsDto): Promise<{ levels: EducationLevelResponseDto[] }> {
    return this.educationService.getLevels(dto.stage);
  }

  /**
   * GET /education/subjects
   * Get subjects available for a specific education level
   * 
   * @example GET /education/subjects?levelCode=primary_1&stream=sciences
   */
  @Get('subjects')
  async getSubjects(@Query() dto: GetSubjectsDto): Promise<{ subjects: SubjectMappingResponseDto[] }> {
    return this.educationService.getSubjectsByLevel(dto.levelCode, dto.stream);
  }

  /**
   * GET /education/types
   * Get document types available for a specific education level
   * 
   * @example GET /education/types?levelCode=secondary_3
   */
  @Get('types')
  async getTypes(@Query() dto: GetTypesDto): Promise<{ types: TypeMappingResponseDto[] }> {
    return this.educationService.getTypesByLevel(dto.levelCode);
  }

  /**
   * GET /education/validate
   * Validate if a level-subject-type combination is valid
   * 
   * @example GET /education/validate?level=primary_1&subject=math&type=course_notes
   */
  @Get('validate')
  async validateCombination(@Query() dto: ValidateCombinationDto): Promise<ValidationResponseDto> {
    return this.educationService.validateCombination(
      dto.level,
      dto.subject,
      dto.type,
      dto.stream,
    );
  }
}
