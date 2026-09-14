import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  welcomeEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordChangedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  verificationStatusEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  resourceModerationEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  resourceApprovedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  collaborationInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  collaborationMentions?: boolean;

  @IsOptional()
  @IsBoolean()
  collaborationAcceptedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  purchaseConfirmations?: boolean;

  @IsOptional()
  @IsBoolean()
  saleNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  examPublishedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  examSharedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  examGeneratedEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  adminVerificationAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  adminModerationAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  adminReportAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}
