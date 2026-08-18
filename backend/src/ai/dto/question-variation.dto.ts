import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';

export enum VariationType {
  EASIER = 'easier',
  HARDER = 'harder',
  SCENARIO_BASED = 'scenario_based',
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_BLANK = 'fill_blank',
  ALL = 'all', // Generate all variations
}

export class GenerateVariationDto {
  @IsString()
  questionId: string;

  @IsEnum(VariationType)
  variationType: VariationType;

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export class GenerateMultipleVariationsDto {
  @IsString()
  questionId: string;

  @IsArray()
  @IsEnum(VariationType, { each: true })
  variationTypes: VariationType[];

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export interface QuestionVariation {
  originalQuestionId: string;
  variationType: VariationType;
  text: string;
  type: string;
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
