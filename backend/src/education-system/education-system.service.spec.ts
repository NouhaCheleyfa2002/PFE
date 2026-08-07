import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EducationSystemService } from './education-system.service';
import { EducationLevelEntity, EducationStage } from './entities/education-level.entity';
import { SubjectMappingEntity } from './entities/subject-mapping.entity';
import { TypeMappingEntity } from './entities/type-mapping.entity';

describe('EducationSystemService', () => {
  let service: EducationSystemService;
  let educationLevelRepo: Repository<EducationLevelEntity>;
  let subjectMappingRepo: Repository<SubjectMappingEntity>;
  let typeMappingRepo: Repository<TypeMappingEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EducationSystemService,
        {
          provide: getRepositoryToken(EducationLevelEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(SubjectMappingEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TypeMappingEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<EducationSystemService>(EducationSystemService);
    educationLevelRepo = module.get(getRepositoryToken(EducationLevelEntity));
    subjectMappingRepo = module.get(getRepositoryToken(SubjectMappingEntity));
    typeMappingRepo = module.get(getRepositoryToken(TypeMappingEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLevels', () => {
    it('should return all education levels sorted by order', async () => {
      const mockLevels = [
        {
          id: 1,
          code: 'primary_1',
          displayName: '1st Primary Year',
          stage: EducationStage.PRIMARY,
          orderIndex: 1,
        },
        {
          id: 2,
          code: 'primary_2',
          displayName: '2nd Primary Year',
          stage: EducationStage.PRIMARY,
          orderIndex: 2,
        },
      ] as EducationLevelEntity[];

      jest.spyOn(educationLevelRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLevels),
      } as any);

      const result = await service.getLevels();

      expect(result.levels).toHaveLength(2);
      expect(result.levels[0].code).toBe('primary_1');
    });

    it('should filter levels by stage', async () => {
      const mockLevels = [
        {
          id: 1,
          code: 'primary_1',
          displayName: '1st Primary Year',
          stage: EducationStage.PRIMARY,
          orderIndex: 1,
        },
      ] as EducationLevelEntity[];

      jest.spyOn(educationLevelRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLevels),
      } as any);

      const result = await service.getLevels(EducationStage.PRIMARY);

      expect(result.levels).toHaveLength(1);
      expect(result.levels[0].stage).toBe(EducationStage.PRIMARY);
    });

    it('should cache results for subsequent calls', async () => {
      const mockLevels = [
        {
          id: 1,
          code: 'primary_1',
          displayName: '1st Primary Year',
          stage: EducationStage.PRIMARY,
          orderIndex: 1,
        },
      ] as EducationLevelEntity[];

      const createQueryBuilderSpy = jest.spyOn(educationLevelRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockLevels),
      } as any);

      // First call
      await service.getLevels();
      // Second call (should use cache)
      await service.getLevels();

      // Should only call DB once due to caching
      expect(createQueryBuilderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateCombination', () => {
    it('should return valid for correct level-subject combination', async () => {
      const mockLevel = {
        id: 1,
        code: 'primary_1',
        displayName: '1st Primary Year',
        stage: EducationStage.PRIMARY,
        orderIndex: 1,
      } as EducationLevelEntity;

      const mockSubject = {
        id: 1,
        educationLevelId: 1,
        subjectCode: 'math',
        subjectName: 'Mathematics',
        stream: null,
        isActive: true,
      } as SubjectMappingEntity;

      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(mockLevel);
      jest.spyOn(subjectMappingRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSubject),
      } as any);

      const result = await service.validateCombination('primary_1', 'math');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return invalid for incorrect level', async () => {
      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(null);

      const result = await service.validateCombination('invalid_level', 'math');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not valid');
    });

    it('should return invalid for unavailable subject', async () => {
      const mockLevel = {
        id: 1,
        code: 'primary_1',
        displayName: '1st Primary Year',
        stage: EducationStage.PRIMARY,
        orderIndex: 1,
      } as EducationLevelEntity;

      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(mockLevel);
      jest.spyOn(subjectMappingRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.validateCombination('primary_1', 'quantum_physics');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('should validate type when provided', async () => {
      const mockLevel = {
        id: 1,
        code: 'primary_1',
        displayName: '1st Primary Year',
        stage: EducationStage.PRIMARY,
        orderIndex: 1,
      } as EducationLevelEntity;

      const mockSubject = {
        id: 1,
        educationLevelId: 1,
        subjectCode: 'math',
        subjectName: 'Mathematics',
        stream: null,
        isActive: true,
      } as SubjectMappingEntity;

      const mockType = {
        id: 1,
        educationLevelId: 1,
        typeCode: 'course_notes',
        typeName: 'Course Notes',
        isActive: true,
      } as TypeMappingEntity;

      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(mockLevel);
      jest.spyOn(subjectMappingRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSubject),
      } as any);
      jest.spyOn(typeMappingRepo, 'findOne').mockResolvedValue(mockType);

      const result = await service.validateCombination('primary_1', 'math', 'course_notes');

      expect(result.valid).toBe(true);
    });
  });

  describe('getSubjectsByLevel', () => {
    it('should throw NotFoundException for invalid level code', async () => {
      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getSubjectsByLevel('invalid_code')).rejects.toThrow(
        'Education level \'invalid_code\' not found',
      );
    });

    it('should return subjects for valid level', async () => {
      const mockLevel = {
        id: 1,
        code: 'primary_1',
        displayName: '1st Primary Year',
        stage: EducationStage.PRIMARY,
        orderIndex: 1,
      } as EducationLevelEntity;

      const mockSubjects = [
        {
          id: 1,
          educationLevelId: 1,
          subjectCode: 'math',
          subjectName: 'Mathematics',
          stream: null,
          isActive: true,
        },
        {
          id: 2,
          educationLevelId: 1,
          subjectCode: 'arabic',
          subjectName: 'Arabic',
          stream: null,
          isActive: true,
        },
      ] as SubjectMappingEntity[];

      jest.spyOn(educationLevelRepo, 'findOne').mockResolvedValue(mockLevel);
      jest.spyOn(subjectMappingRepo, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockSubjects),
      } as any);

      const result = await service.getSubjectsByLevel('primary_1');

      expect(result.subjects).toHaveLength(2);
      expect(result.subjects[0].code).toBe('math');
      expect(result.subjects[1].code).toBe('arabic');
    });
  });
});
