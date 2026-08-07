import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean } from 'class-validator';

export class BanUserDto {
  @IsString()
  reason: string;
}

export class RestrictUserDto {
  @IsString()
  reason: string;

  @IsEnum(['upload', 'comment', 'download', 'all'])
  restrictionType: string;
}

export class UpdateUserRoleDto {
  @IsEnum(['admin', 'teacher', 'student'])
  role: string;
}

export class ModerateRatingDto {
  @IsEnum(['approved', 'rejected'])
  status: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class DeleteUserDto {
  @IsString()
  reason: string;
}
