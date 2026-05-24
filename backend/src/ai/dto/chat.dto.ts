import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty({ message: 'Prompt is required' })
  @MinLength(1, { message: 'Prompt must not be empty' })
  @MaxLength(5000, { message: 'Prompt must not exceed 5000 characters' })
  prompt: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class SummarizeDto {
  @IsString()
  @IsNotEmpty({ message: 'Text is required' })
  @MinLength(10, { message: 'Text must be at least 10 characters' })
  @MaxLength(10000, { message: 'Text must not exceed 10000 characters' })
  text: string;
}

export class TranslateDto {
  @IsString()
  @IsNotEmpty({ message: 'Text is required' })
  @MinLength(1, { message: 'Text must not be empty' })
  @MaxLength(5000, { message: 'Text must not exceed 5000 characters' })
  text: string;

  @IsString()
  @IsNotEmpty({ message: 'Target language is required' })
  targetLanguage: string;
}

export class GenerateEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Purpose is required' })
  @MinLength(5, { message: 'Purpose must be at least 5 characters' })
  @MaxLength(500, { message: 'Purpose must not exceed 500 characters' })
  purpose: string;

  @IsOptional()
  @IsString()
  tone?: string; // formal, casual, friendly, professional
}
