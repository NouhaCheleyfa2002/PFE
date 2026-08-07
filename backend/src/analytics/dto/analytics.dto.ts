import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsString,
} from 'class-validator';

export enum TimeRangeEnum {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all',
}

export enum ExportFormatEnum {
  JSON = 'json',
  CSV = 'csv',
}

export class TimeRangeDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  range?: TimeRangeEnum = TimeRangeEnum.MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class LeaderboardDto extends TimeRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  category?: string; // 'uploads', 'questions', 'verifications'
}

export class ExportReportDto extends TimeRangeDto {
  @IsOptional()
  @IsEnum(ExportFormatEnum)
  format?: ExportFormatEnum = ExportFormatEnum.JSON;

  @IsOptional()
  @IsString()
  reportType?: string; // 'overview', 'users', 'documents', 'questions'
}

export class ActivityChartDto extends TimeRangeDto {
  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsString()
  groupBy?: string = 'day'; // 'hour', 'day', 'week', 'month'
}
