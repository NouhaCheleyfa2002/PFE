import { IsOptional, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EducationStage } from '../entities/education-level.entity';

export class GetLevelsDto {
  @IsOptional()
  @IsEnum(EducationStage)
  stage?: EducationStage;
}

export class GetSubjectsDto {
  @IsNotEmpty()
  @IsString()
  levelCode: string;

  @IsOptional()
  @IsString()
  stream?: string;
}

export class GetTypesDto {
  @IsNotEmpty()
  @IsString()
  levelCode: string;
}

export class ValidateCombinationDto {
  @IsNotEmpty()
  @IsString()
  level: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  stream?: string;
}

// Response DTOs
export class EducationLevelResponseDto {
  id: number;
  code: string;
  displayName: string;
  stage: EducationStage;
  orderIndex: number;
}

export class SubjectMappingResponseDto {
  id: number;
  code: string;
  name: string;
  stream: string | null;
}

export class TypeMappingResponseDto {
  id: number;
  code: string;
  name: string;
}

export class ValidationResponseDto {
  valid: boolean;
  reason?: string;
}
