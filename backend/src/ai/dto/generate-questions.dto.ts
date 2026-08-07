import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator';

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class GenerateQuestionsDto {
  @IsString()
  documentId: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  questionCount: number = 10;

  @IsEnum(QuestionDifficulty)
  difficulty: QuestionDifficulty;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsString()
  customInstructions?: string;
}

export interface GeneratedQuestion {
  text: string;
  options: string[] | null;
  correctAnswer: string | null;
  topic: string | null;
  difficulty: string;
  explanation: string | null;
}

export interface GenerateQuestionsResponse {
  questions: GeneratedQuestion[];
  documentId: string;
  documentTitle: string;
  generatedAt: Date;
  count: number;
}
