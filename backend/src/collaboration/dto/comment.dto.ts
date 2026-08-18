import { IsUUID, IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  questionId?: string;

  @IsOptional()
  @IsString()
  elementId?: string; // e.g., 'question-42', 'header'

  @IsOptional()
  @IsString()
  elementType?: string; // 'question', 'section', 'header', 'instructions'

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentions?: string[];
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentions?: string[];
}

export class ResolveCommentDto {
  @IsBoolean()
  resolved: boolean;
}

export class GetCommentsDto {
  @IsOptional()
  @IsUUID()
  questionId?: string;

  @IsOptional()
  @IsString()
  elementId?: string;

  @IsOptional()
  @IsBoolean()
  includeResolved?: boolean;
}
