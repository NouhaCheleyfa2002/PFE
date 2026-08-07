import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EducationLevelEntity, EducationStage } from './entities/education-level.entity';
import { SubjectMappingEntity } from './entities/subject-mapping.entity';
import { TypeMappingEntity } from './entities/type-mapping.entity';
import {
  EducationLevelResponseDto,
  SubjectMappingResponseDto,
  TypeMappingResponseDto,
  ValidationResponseDto,
} from './dto/education-system.dto';

// Simple in-memory cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  set(key: string, value: any, ttlMs: number): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttlMs,
    });
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

@Injectable()
export class EducationSystemService {
  private cache = new SimpleCache();

  constructor(
    @InjectRepository(EducationLevelEntity)
    private educationLevelRepo: Repository<EducationLevelEntity>,
    @InjectRepository(SubjectMappingEntity)
    private subjectMappingRepo: Repository<SubjectMappingEntity>,
    @InjectRepository(TypeMappingEntity)
    private typeMappingRepo: Repository<TypeMappingEntity>,
  ) {}

  /**
   * Get all education levels, optionally filtered by stage
   */
  async getLevels(stage?: EducationStage): Promise<{ levels: EducationLevelResponseDto[] }> {
    const cacheKey = `education:levels:${stage || 'all'}`;

    // Check cache first
    const cached = this.cache.get<{ levels: EducationLevelResponseDto[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query
    const query = this.educationLevelRepo.createQueryBuilder('level');

    if (stage) {
      query.where('level.stage = :stage', { stage });
    }

    query.orderBy('level.orderIndex', 'ASC');

    const levels = await query.getMany();

    // Map to response DTOs
    const response = {
      levels: levels.map(level => ({
        id: level.id,
        code: level.code,
        displayName: level.displayName,
        stage: level.stage,
        orderIndex: level.orderIndex,
      })),
    };

    // Cache for 24 hours (education levels rarely change)
    this.cache.set(cacheKey, response, 86400000);

    return response;
  }

  /**
   * Get subjects available for a specific education level
   */
  async getSubjectsByLevel(
    levelCode: string,
    stream?: string,
  ): Promise<{ subjects: SubjectMappingResponseDto[] }> {
    const cacheKey = `education:subjects:${levelCode}:${stream || 'all'}`;

    // Check cache first
    const cached = this.cache.get<{ subjects: SubjectMappingResponseDto[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Find education level
    const level = await this.educationLevelRepo.findOne({
      where: { code: levelCode },
    });

    if (!level) {
      throw new NotFoundException(`Education level '${levelCode}' not found`);
    }

    // Build query for subjects
    const query = this.subjectMappingRepo
      .createQueryBuilder('subject')
      .where('subject.educationLevelId = :levelId', { levelId: level.id })
      .andWhere('subject.isActive = :active', { active: true });

    // Filter by stream if provided
    if (stream) {
      query.andWhere('(subject.stream = :stream OR subject.stream IS NULL)', { stream });
    }

    query.orderBy('subject.subjectName', 'ASC');

    const subjects = await query.getMany();

    // Map to response DTOs
    const response = {
      subjects: subjects.map(subject => ({
        id: subject.id,
        code: subject.subjectCode,
        name: subject.subjectName,
        stream: subject.stream,
      })),
    };

    // Cache for 12 hours
    this.cache.set(cacheKey, response, 43200000);

    return response;
  }

  /**
   * Get document types available for a specific education level
   */
  async getTypesByLevel(levelCode: string): Promise<{ types: TypeMappingResponseDto[] }> {
    const cacheKey = `education:types:${levelCode}`;

    // Check cache first
    const cached = this.cache.get<{ types: TypeMappingResponseDto[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Find education level
    const level = await this.educationLevelRepo.findOne({
      where: { code: levelCode },
    });

    if (!level) {
      throw new NotFoundException(`Education level '${levelCode}' not found`);
    }

    // Build query for types
    const types = await this.typeMappingRepo.find({
      where: {
        educationLevelId: level.id,
        isActive: true,
      },
      order: {
        typeName: 'ASC',
      },
    });

    // Map to response DTOs
    const response = {
      types: types.map(type => ({
        id: type.id,
        code: type.typeCode,
        name: type.typeName,
      })),
    };

    // Cache for 12 hours
    this.cache.set(cacheKey, response, 43200000);

    return response;
  }

  /**
   * Validate if a level-subject-type combination is valid
   */
  async validateCombination(
    level: string,
    subject: string,
    type?: string,
    stream?: string,
  ): Promise<ValidationResponseDto> {
    // Find education level
    const levelEntity = await this.educationLevelRepo.findOne({
      where: { code: level },
    });

    if (!levelEntity) {
      return {
        valid: false,
        reason: `Education level '${level}' is not valid`,
      };
    }

    // Check if subject is available for this level
    const subjectQuery = this.subjectMappingRepo
      .createQueryBuilder('subject')
      .where('subject.educationLevelId = :levelId', { levelId: levelEntity.id })
      .andWhere('subject.subjectCode = :subjectCode', { subjectCode: subject })
      .andWhere('subject.isActive = :active', { active: true });

    if (stream) {
      subjectQuery.andWhere('(subject.stream = :stream OR subject.stream IS NULL)', { stream });
    }

    const subjectExists = await subjectQuery.getOne();

    if (!subjectExists) {
      return {
        valid: false,
        reason: `Subject '${subject}' is not available for ${levelEntity.displayName}${stream ? ` (${stream} stream)` : ''}`,
      };
    }

    // If type is provided, validate it too
    if (type) {
      const typeExists = await this.typeMappingRepo.findOne({
        where: {
          educationLevelId: levelEntity.id,
          typeCode: type,
          isActive: true,
        },
      });

      if (!typeExists) {
        return {
          valid: false,
          reason: `Document type '${type}' is not available for ${levelEntity.displayName}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get education level by code
   */
  async getLevelByCode(code: string): Promise<EducationLevelEntity> {
    const level = await this.educationLevelRepo.findOne({
      where: { code },
    });

    if (!level) {
      throw new NotFoundException(`Education level '${code}' not found`);
    }

    return level;
  }

  /**
   * Clear cache (useful for testing or admin actions)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
  }
}
