import { IsInt, IsBoolean, IsString, IsArray, IsOptional, Min, Max, IsEnum } from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  usabilityRating?: number;

  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @IsOptional()
  @IsString()
  review?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateRatingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  usabilityRating?: number;

  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @IsOptional()
  @IsString()
  review?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class VoteRatingDto {
  @IsEnum(['helpful', 'not_helpful'])
  voteType: 'helpful' | 'not_helpful';
}
