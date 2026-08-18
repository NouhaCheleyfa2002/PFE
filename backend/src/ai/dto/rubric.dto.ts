import { IsString, IsArray, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateRubricDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  totalPoints?: number = 10;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  criteria?: string[]; // Custom criteria (e.g., "Content", "Grammar", "Structure")

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export class GenerateExamRubricDto {
  @IsArray()
  @IsString({ each: true })
  essayQuestionIds: string[]; // Only essay questions need rubrics

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  totalPoints?: number = 10;

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
  percentage: number;
  levels: {
    level: string; // Excellent, Good, Satisfactory, Needs Improvement
    description: string;
    pointRange: [number, number];
  }[];
}

export interface GenerateRubricResponse {
  questionId: string;
  questionText: string;
  totalPoints: number;
  criteria: RubricCriterion[];
  generatedAt: Date;
}

export interface GenerateExamRubricResponse {
  rubrics: GenerateRubricResponse[];
  totalQuestions: number;
  generatedAt: Date;
}
