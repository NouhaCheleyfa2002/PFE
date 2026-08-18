import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExamSource {
  UPLOADED_DOCUMENT = 'uploaded_document',
  EXTRACTED_QUESTIONS = 'extracted_questions',
  QUESTION_BANK = 'question_bank',
  MIXED = 'mixed',
}

export enum QuestionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MIXED = 'mixed',
}

export enum BloomTaxonomy {
  REMEMBER = 'remember',
  UNDERSTAND = 'understand',
  APPLY = 'apply',
  ANALYZE = 'analyze',
  EVALUATE = 'evaluate',
  CREATE = 'create',
  MIXED = 'mixed',
}

export enum QuestionTypeOption {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_BLANK = 'fill_blank',
  ESSAY = 'essay',
  MATCHING = 'matching',
  MIXED = 'mixed',
}

export class QuestionDistribution {
  @IsNumber()
  @Min(0)
  mcq?: number = 0;

  @IsNumber()
  @Min(0)
  trueFalse?: number = 0;

  @IsNumber()
  @Min(0)
  shortAnswer?: number = 0;

  @IsNumber()
  @Min(0)
  essay?: number = 0;

  @IsNumber()
  @Min(0)
  fillBlank?: number = 0;

  @IsNumber()
  @Min(0)
  matching?: number = 0;
}

export class GenerateExamDto {
  // Source configuration
  @IsEnum(ExamSource)
  source: ExamSource;

  @IsOptional()
  @IsString()
  documentId?: string; // If source is uploaded_document

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionIds?: string[]; // If source is extracted_questions or question_bank

  // Exam configuration
  @IsNumber()
  @Min(1)
  @Max(100)
  totalQuestions: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuestionDistribution)
  questionDistribution?: QuestionDistribution;

  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty = QuestionDifficulty.MIXED;

  @IsOptional()
  @IsEnum(BloomTaxonomy)
  bloomLevel?: BloomTaxonomy = BloomTaxonomy.MIXED;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  durationMinutes?: number; // Exam duration

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  totalMarks?: number;

  // Randomization options
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean = false;

  @IsOptional()
  @IsBoolean()
  randomizeAnswers?: boolean = false; // For MCQs

  // Institution template
  @IsOptional()
  @IsString()
  templateId?: string;

  // Additional options
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[]; // Filter by topics

  @IsOptional()
  @IsString()
  examTitle?: string;

  @IsOptional()
  @IsString()
  examInstructions?: string;

  @IsOptional()
  @IsBoolean()
  generateAnswerKey?: boolean = true;

  @IsOptional()
  @IsBoolean()
  generateMarkScheme?: boolean = true;

  @IsOptional()
  @IsBoolean()
  generateRubric?: boolean = false; // For essay questions
}

export interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  difficulty: string;
  bloomLevel?: string;
  topic?: string;
  explanation?: string;
}

export interface AnswerKey {
  questionNumber: number;
  questionId: string;
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export interface MarkScheme {
  totalMarks: number;
  passingMarks: number;
  questionBreakdown: {
    questionNumber: number;
    marks: number;
    markingCriteria?: string;
  }[];
}

export interface Rubric {
  questionNumber: number;
  criteria: {
    name: string;
    description: string;
    points: number;
    percentage: number;
  }[];
}

export interface GenerateExamResponse {
  examId: string;
  title: string;
  instructions: string;
  duration: number;
  totalMarks: number;
  questions: ExamQuestion[];
  answerKey?: AnswerKey[];
  markScheme?: MarkScheme;
  rubrics?: Rubric[];
  metadata: {
    source: ExamSource;
    difficulty: string;
    bloomLevel: string;
    questionTypes: Record<string, number>;
    generatedAt: Date;
  };
}
