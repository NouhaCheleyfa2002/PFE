import { IsString, IsOptional, IsArray } from 'class-validator';

export class DocumentChatDto {
  @IsString()
  documentId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;

  @IsOptional()
  @IsString()
  context?: string; // Additional context for the chat
}

export interface DocumentChatResponse {
  response: string;
  documentId: string;
  documentTitle: string;
  metadata: {
    tokensUsed: number;
    model: string;
    timestamp: Date;
  };
  suggestedFollowUps?: string[]; // Suggested follow-up questions
}
