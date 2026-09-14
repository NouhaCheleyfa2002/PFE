import { IsString, IsArray, IsOptional, IsNumber, IsIn, Min } from 'class-validator';

export class CreateExamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  classLevel?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsArray()
  questions: any[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsString()
  sourceType?: string; // 'manual' or 'ai_generated'
}

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  classLevel?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  questions?: any[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsNumber()
  maxPoints?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  sourceType?: string; // 'manual' or 'ai_generated'
}

export class PublishExamDto {
  @IsString()
  title: string;

  @IsString()
  classLevel: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  bacSection?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsIn(['free', 'paid'])
  license: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
