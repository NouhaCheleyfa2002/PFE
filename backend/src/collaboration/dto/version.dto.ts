import { IsUUID, IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateVersionDto {
  @IsObject()
  snapshot: Record<string, any>;

  @IsOptional()
  @IsString()
  changeSummary?: string;
}

export class RestoreVersionDto {
  @IsUUID()
  versionId: string;
}

export class GetVersionHistoryDto {
  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class CompareVersionsDto {
  @IsUUID()
  versionA: string;

  @IsUUID()
  versionB: string;
}
