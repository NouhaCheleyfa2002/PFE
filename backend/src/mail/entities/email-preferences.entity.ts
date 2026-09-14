import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('email_preferences')
export class EmailPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // Authentication emails
  @Column({ name: 'welcome_emails', default: true })
  welcomeEmails: boolean;

  @Column({ name: 'security_alerts', default: true })
  securityAlerts: boolean;

  @Column({ name: 'password_changed_emails', default: true })
  passwordChangedEmails: boolean;

  // Verification emails (teachers only)
  @Column({ name: 'verification_status_emails', default: true })
  verificationStatusEmails: boolean;

  // Resource/Document emails
  @Column({ name: 'resource_moderation_emails', default: true })
  resourceModerationEmails: boolean;

  @Column({ name: 'resource_approved_emails', default: true })
  resourceApprovedEmails: boolean;

  // Collaboration emails
  @Column({ name: 'collaboration_invites', default: true })
  collaborationInvites: boolean;

  @Column({ name: 'collaboration_mentions', default: true })
  collaborationMentions: boolean;

  @Column({ name: 'collaboration_accepted_emails', default: true })
  collaborationAcceptedEmails: boolean;

  // Purchase emails (students)
  @Column({ name: 'purchase_confirmations', default: true })
  purchaseConfirmations: boolean;

  // Sale emails (teachers)
  @Column({ name: 'sale_notifications', default: true })
  saleNotifications: boolean;

  // Exam emails
  @Column({ name: 'exam_published_emails', default: true })
  examPublishedEmails: boolean;

  @Column({ name: 'exam_shared_emails', default: true })
  examSharedEmails: boolean;

  @Column({ name: 'exam_generated_emails', default: true })
  examGeneratedEmails: boolean;

  // Admin emails
  @Column({ name: 'admin_verification_alerts', default: true })
  adminVerificationAlerts: boolean;

  @Column({ name: 'admin_moderation_alerts', default: true })
  adminModerationAlerts: boolean;

  @Column({ name: 'admin_report_alerts', default: true })
  adminReportAlerts: boolean;

  // General preferences
  @Column({ name: 'marketing_emails', default: false })
  marketingEmails: boolean;

  @Column({ name: 'weekly_digest', default: true })
  weeklyDigest: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
