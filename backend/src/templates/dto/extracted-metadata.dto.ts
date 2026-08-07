import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class ExtractedMetadataDto {
  @IsOptional()
  @IsString()
  institutionName: string | null;

  @IsOptional()
  @IsString()
  institutionAddress: string | null;

  @IsOptional()
  @IsString()
  contactPhone: string | null;

  @IsOptional()
  @IsString()
  contactEmail: string | null;

  @IsOptional()
  @IsString()
  academicYear: string | null;

  @IsOptional()
  @IsString()
  logoBase64: string | null;

  @IsOptional()
  @IsObject()
  logoPosition: { x: number; y: number; width: number; height: number } | null;

  @IsArray()
  @IsString({ each: true })
  detectedPlaceholders: string[];
}

export interface ExtractedMetadata {
  institutionName: string | null;
  institutionAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  academicYear: string | null;
  logoBase64: string | null;
  logoPosition: { x: number; y: number; width: number; height: number } | null;
  detectedPlaceholders: string[];
}
