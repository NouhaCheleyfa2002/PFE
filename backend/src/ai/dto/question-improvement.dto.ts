import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';

export enum ImprovementType {
  FIX_GRAMMAR = 'fix_grammar',
  CLARIFY_WORDING = 'clarify_wording',
  INCREASE_DIFFICULTY = 'increase_difficulty',
  SIMPLIFY = 'simplify',
  IMPROVE_DISTRACTORS = 'improve_distractors', // For MCQ options
  REDUCE_AMBIGUITY = 'reduce_ambiguity',
  ALL = 'all',
}

export class ImproveQuestionDto {
  @IsString()
  questionId: string;

  @IsArray()
  @IsEnum(ImprovementType, { each: true })
  improvementTypes: ImprovementType[];

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export interface ImprovedQuestion {
  originalText: string;
  improvedText: string;
  improvementType: ImprovementType;
  changes: string[]; // List of changes made
  suggestions: string[]; // Additional suggestions
}

export interface ImproveQuestionResponse {
  questionId: string;
  improvements: ImprovedQuestion[];
  originalQuestion: {
    text: string;
    type: string;
    options?: string[];
  };
  improvedQuestion: {
    text: string;
    type: string;
    options?: string[];
  };
  summary: string; // Overall summary of improvements
}
