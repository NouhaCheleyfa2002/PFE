import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
  Length,
  MaxLength,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LogoPositionDto {
  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;

  @IsInt()
  @Min(0)
  width: number;

  @IsInt()
  @Min(0)
  height: number;
}

export class PageMarginsDto {
  @IsInt()
  @Min(0)
  top: number;

  @IsInt()
  @Min(0)
  bottom: number;

  @IsInt()
  @Min(0)
  left: number;

  @IsInt()
  @Min(0)
  right: number;
}

export class PositionDto {
  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;
}

export class PlaceholderDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsInt()
  @Min(8)
  @Max(72)
  fontSize: number;

  @IsString()
  fontWeight: string;
}

export class LayoutSettingsDto {
  @IsInt()
  @Min(8)
  @Max(48)
  institutionNameSize: number;

  @IsString()
  @IsEnum(['left', 'center', 'right'])
  institutionNameAlign: 'left' | 'center' | 'right';

  @IsInt()
  @Min(8)
  @Max(32)
  addressSize: number;

  @IsString()
  @IsEnum(['left', 'center', 'right'])
  addressAlign: 'left' | 'center' | 'right';

  @IsInt()
  @Min(8)
  @Max(24)
  contactSize: number;

  @IsString()
  @IsEnum(['left', 'center', 'right'])
  contactAlign: 'left' | 'center' | 'right';

  @IsInt()
  @Min(8)
  @Max(32)
  academicYearSize: number;

  @IsString()
  @IsEnum(['left', 'center', 'right'])
  academicYearAlign: 'left' | 'center' | 'right';

  @IsInt()
  @Min(0)
  @Max(48)
  headerSpacing: number;

  @IsInt()
  @Min(10)
  @Max(25)
  lineHeight: number;

  @IsOptional()
  @IsBoolean()
  showInstitutionName?: boolean;

  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;

  @IsOptional()
  @IsBoolean()
  showContact?: boolean;

  @IsOptional()
  @IsBoolean()
  showAcademicYear?: boolean;
}

export class CreateTemplateDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  institutionAddress?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ValidateNested()
  @Type(() => LogoPositionDto)
  logoPosition: LogoPositionDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  watermarkText?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  watermarkOpacity: number;

  @ValidateNested()
  @Type(() => PageMarginsDto)
  pageMargins: PageMarginsDto;

  @IsEnum(['portrait', 'landscape'])
  pageOrientation: string;

  @IsString()
  fontFamily: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceholderDto)
  placeholders: PlaceholderDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LayoutSettingsDto)
  layoutSettings?: LayoutSettingsDto;

  @IsOptional()
  @IsString()
  headerDocumentUrl?: string;
}
