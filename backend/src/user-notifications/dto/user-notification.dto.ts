import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsEnum(['upload', 'rating', 'verification', 'comment', 'system', 'exam', 'question', 'verification_request', 'verification_status', 'announcement'])
  type: string;

  @IsNotEmpty()
  @IsString()
  title?: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  metadata?: Record<string, any>;
}
