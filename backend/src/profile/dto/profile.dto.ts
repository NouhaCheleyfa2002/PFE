import { IsString, IsOptional, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'University name must not exceed 255 characters' })
  university?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Region must not exceed 100 characters' })
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Specialty must not exceed 100 characters' })
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;
}

/**
 * DTO for changing password
 */
export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;

  @IsNotEmpty({ message: 'Password confirmation is required' })
  @IsString()
  confirmPassword: string;
}

/**
 * Response DTO for user profile
 */
export class ProfileResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'student';
  university?: string;
  region?: string;
  specialty?: string;
  verified: boolean;
  verificationStatus: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
}

/**
 * Response DTO for profile stats
 */
export class ProfileStatsDto {
  resourcesUploaded: number;
  examsCreated: number;
  contributionPoints: number;
}

/**
 * Combined response DTO for profile endpoint
 */
export class ProfileWithStatsDto {
  user: ProfileResponseDto;
  stats: ProfileStatsDto;
}
