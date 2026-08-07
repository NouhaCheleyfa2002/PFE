import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticSearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.5;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  classLevel?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10000) // Increased to allow fetching all questions
  limit?: number = 20;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;
}

export class ReprocessDocumentDto {
  @IsOptional()
  @IsString()
  customPrompt?: string;
}
