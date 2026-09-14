import { IsString, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Transformation goal (how to modify difficulty/context)
export enum TransformationType {
  EASIER = 'easier',
  HARDER = 'harder',
  SCENARIO_BASED = 'scenario_based',
  SAME_CONCEPT = 'same_concept', // Same difficulty, just different wording
}

// Question format (the type of question)
export enum QuestionFormat {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_BLANK = 'fill_blank',
}

// Legacy enum for backward compatibility
export enum VariationType {
  EASIER = 'easier',
  HARDER = 'harder',
  SCENARIO_BASED = 'scenario_based',
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_BLANK = 'fill_blank',
  ALL = 'all',
}

// New structured variation request
export class VariationRequest {
  @IsEnum(TransformationType)
  transformation: TransformationType;

  @IsEnum(QuestionFormat)
  questionType: QuestionFormat;
}

export class GenerateVariationDto {
  @IsString()
  questionId: string;

  @ValidateNested()
  @Type(() => VariationRequest)
  variation: VariationRequest;

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export class GenerateMultipleVariationsDto {
  @IsString()
  questionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationRequest)
  variations: VariationRequest[];

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export interface QuestionVariation {
  originalQuestionId: string;
  transformation: TransformationType;
  questionType: QuestionFormat;
  text: string;
  type: string; // Same as questionType, for backward compatibility
  options?: string[];
  correctAnswer?: string;
  difficulty: string;
  explanation?: string;
  metadata: {
    generatedAt: Date;
    basedOn: string;
  };
}

export interface GenerateVariationResponse {
  variations: QuestionVariation[];
  originalQuestion: {
    id: string;
    text: string;
    type: string;
  };
}
