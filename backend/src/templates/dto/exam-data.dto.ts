import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';

/**
 * DTO for exam data used in placeholder substitution
 * Contains all fields that can be substituted in template placeholders
 */
export class ExamDataDto {
  @IsOptional()
  @IsString()
  studentName?: string;

  @IsOptional()
  @IsString()
  teacher?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  classLevel?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalMarks?: number;
}

/**
 * Interface for exam data used internally in services
 */
export interface ExamData {
  studentName?: string;
  teacher?: string;
  subject?: string;
  classLevel?: string;
  examDate?: string;
  duration?: string;
  academicYear?: string;
  title?: string;
  totalMarks?: number;
}
