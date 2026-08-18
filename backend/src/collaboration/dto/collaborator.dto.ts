import { IsUUID, IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class InviteCollaboratorDto {
  @IsUUID()
  userId: string;

  @IsEnum(['editor', 'viewer', 'reviewer'])
  role: 'editor' | 'viewer' | 'reviewer';

  @IsOptional()
  permissions?: {
    edit?: boolean;
    analytics?: boolean;
    revenue?: number;
  };
}

export class UpdateCollaboratorDto {
  @IsOptional()
  @IsEnum(['editor', 'viewer', 'reviewer'])
  role?: 'editor' | 'viewer' | 'reviewer';

  @IsOptional()
  permissions?: {
    edit?: boolean;
    analytics?: boolean;
    revenue?: number;
  };
}

export class RespondInvitationDto {
  @IsEnum(['accept', 'decline'])
  action: 'accept' | 'decline';

  @IsOptional()
  @IsString()
  message?: string;
}

export class ConfigureRevenueShareDto {
  @IsUUID()
  collaboratorId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  revenuePercentage: number;
}

export class SearchCollaboratorsDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(['teacher', 'verified'])
  filter?: 'teacher' | 'verified';

  @IsOptional()
  @IsNumber()
  limit?: number;
}
