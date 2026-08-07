import { IsString, IsArray, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { TeachingLevel, VerificationStatus } from '../entities/verification-request.entity';

export class SubmitVerificationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  fullName: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  institution: string;

  @IsEnum(TeachingLevel)
  teachingLevel: TeachingLevel;

  @IsArray()
  @IsString({ each: true })
  subjects: string[];

  @IsArray()
  @IsString({ each: true })
  documentUrls: string[];

  @IsOptional()
  @IsString()
  verificationVideoUrl?: string;

  @IsOptional()
  @IsString()
  verificationCode?: string;
}

export class ReviewVerificationDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class RequestMoreInfoDto {
  @IsString()
  @MinLength(10)
  message: string;
}
