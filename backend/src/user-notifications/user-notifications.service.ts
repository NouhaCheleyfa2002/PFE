import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { UserNotificationEntity } from './entities/user-notification.entity';
import { CreateNotificationDto } from './dto/user-notification.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

type Priority = 'low' | 'medium' | 'high' | 'critical';

@Injectable()
export class UserNotificationsService {
  private readonly logger = new Logger(UserNotificationsService.name);

  constructor(
    @InjectRepository(UserNotificationEntity)
    private notificationRepository: Repository<UserNotificationEntity>,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<UserNotificationEntity> {
    const notification = this.notificationRepository.create(createDto);
    return this.notificationRepository.save(notification);
  }

  async findByUserId(userId: string, limit = 50): Promise<UserNotificationEntity[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findUnreadByUserId(userId: string): Promise<UserNotificationEntity[]> {
    return this.notificationRepository.find({
      where: { userId, read: false },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<UserNotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true, readAt: new Date() },
    );
  }

  async deleteOldNotifications(daysOld = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.notificationRepository.delete({
      createdAt: LessThan(cutoffDate),
      read: true,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  // ============================================================================
  // COMPREHENSIVE NOTIFICATION HELPERS
  // ============================================================================

  private async createAndSend(
    userId: string,
    type: string,
    title: string,
    message: string,
    priority: Priority,
    actionUrl?: string,
    actionText?: string,
    additionalData?: any,
  ): Promise<void> {
    try {
      // Create in database
      await this.create({
        userId,
        type,
        title,
        message,
        metadata: {
          priority,
          category: this.getCategoryFromType(type),
          actionUrl,
          actionText,
          ...additionalData,
        },
      });

      // Send via WebSocket
      this.notificationsGateway.sendToUser(userId, {
        message,
        type,
        link: actionUrl,
        timestamp: new Date(),
        data: { priority, actionText, ...additionalData },
      });

      this.logger.log(`Notification sent to user ${userId}: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
    }
  }

  private async createAndSendToAdmins(
    type: string,
    title: string,
    message: string,
    priority: Priority,
    actionUrl?: string,
    actionText?: string,
    additionalData?: any,
  ): Promise<void> {
    try {
      // Send via WebSocket to all connected admins
      this.notificationsGateway.sendToAdmins({
        message,
        type,
        link: actionUrl,
        timestamp: new Date(),
        data: { priority, actionText, ...additionalData },
      });

      this.logger.log(`Notification sent to all admins: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
    }
  }

  private getCategoryFromType(type: string): string {
    if (type.includes('verification')) return 'verification';
    if (type.includes('resource') || type.includes('upload')) return 'resources';
    if (type.includes('ai_')) return 'ai';
    if (type.includes('purchase') || type.includes('review') || type.includes('rating')) return 'marketplace';
    if (type.includes('password') || type.includes('login')) return 'security';
    if (type.includes('user')) return 'users';
    if (type.includes('report')) return 'reports';
    if (type.includes('system') || type.includes('summary')) return 'system';
    return 'other';
  }

  // ============================================================================
  // ACCOUNT & VERIFICATION NOTIFICATIONS (Teachers)
  // ============================================================================

  async notifyAccountCreated(userId: string, fullName: string): Promise<void> {
    await this.createAndSend(
      userId,
      'account_created',
      'Welcome to EduShare!',
      `Your account has been created successfully. Complete your profile to get started.`,
      'low',
      '/dashboard/profile',
      'Complete Profile',
    );
  }

  async notifyVerificationSubmitted(userId: string): Promise<void> {
    await this.createAndSend(
      userId,
      'verification_submitted',
      'Verification Request Submitted',
      'Your documents have been received and are currently under review. Estimated review time: 24-48 hours.',
      'medium',
      '/dashboard/profile',
      'View Status',
    );
  }

  async notifyVerificationApproved(userId: string): Promise<void> {
    await this.createAndSend(
      userId,
      'verification_approved',
      'Verification Approved',
      'Congratulations! You are now a verified educator. You can now upload educational resources.',
      'low',
      '/dashboard/upload',
      'Upload Resource',
    );
  }

  async notifyVerificationRejected(userId: string, reason: string): Promise<void> {
    await this.createAndSend(
      userId,
      'verification_rejected',
      'Verification Rejected',
      `Your verification request was rejected. Reason: ${reason}`,
      'high',
      '/dashboard/profile',
      'Resubmit Documents',
      { rejectionReason: reason },
    );
  }

  async notifyVerificationMoreInfo(userId: string, notes: string): Promise<void> {
    await this.createAndSend(
      userId,
      'verification_more_info',
      'More Information Needed',
      `Additional information is required for your verification. ${notes}`,
      'medium',
      '/dashboard/profile',
      'View Details',
      { notes },
    );
  }

  // ============================================================================
  // RESOURCE UPLOAD NOTIFICATIONS (Teachers)
  // ============================================================================

  async notifyUploadStarted(userId: string, fileName: string, documentId: string): Promise<void> {
    await this.createAndSend(
      userId,
      'upload_started',
      'Uploading Resource',
      `Your document "${fileName}" is being processed...`,
      'low',
      undefined,
      undefined,
      { fileName, documentId },
    );
  }

  async notifyAIProcessingStarted(userId: string, documentId: string, fileName: string): Promise<void> {
    await this.createAndSend(
      userId,
      'ai_processing_started',
      'AI Processing Started',
      `AI is analyzing your document "${fileName}": OCR extraction, metadata generation, and moderation check.`,
      'low',
      `/dashboard/documents/${documentId}`,
      'View Progress',
      { documentId, fileName },
    );
  }

  async notifyAIProcessingCompleted(
    userId: string,
    documentId: string,
    fileName: string,
    questionsExtracted: number,
  ): Promise<void> {
    await this.createAndSend(
      userId,
      'ai_processing_completed',
      'AI Processing Completed',
      `Processing complete for "${fileName}". ${questionsExtracted} questions extracted. Metadata generated successfully.`,
      'low',
      `/dashboard/documents/${documentId}`,
      'Review Results',
      { documentId, fileName, questionsExtracted },
    );
  }

  async notifyResourceSubmitted(userId: string, documentId: string, title: string): Promise<void> {
    await this.createAndSend(
      userId,
      'resource_submitted',
      'Resource Submitted',
      `Your resource "${title}" has been sent for administrator review.`,
      'low',
      `/dashboard/documents/${documentId}`,
      'View Resource',
      { documentId, title },
    );
  }

  async notifyResourceApproved(userId: string, documentId: string, title: string): Promise<void> {
    await this.createAndSend(
      userId,
      'resource_approved',
      'Resource Approved',
      `Your resource "${title}" is now publicly available!`,
      'low',
      `/dashboard/documents/${documentId}`,
      'View Resource',
      { documentId, title },
    );
  }

  async notifyResourceChangesRequired(
    userId: string,
    documentId: string,
    title: string,
    reason: string,
  ): Promise<void> {
    await this.createAndSend(
      userId,
      'resource_changes_required',
      'Changes Requested',
      `The administrator requested modifications for "${title}". Reason: ${reason}`,
      'medium',
      `/dashboard/documents/${documentId}`,
      'View Moderation Report',
      { documentId, title, reason },
    );
  }

  async notifyResourceRejected(userId: string, documentId: string, title: string, reason: string): Promise<void> {
    await this.createAndSend(
      userId,
      'resource_rejected',
      'Resource Rejected',
      `Your resource "${title}" was rejected. Reason: ${reason}`,
      'high',
      `/dashboard/documents/${documentId}`,
      'View Details',
      { documentId, title, reason },
    );
  }

  // ============================================================================
  // MARKETPLACE NOTIFICATIONS (Teachers)
  // ============================================================================

  async notifyNewPurchase(
    userId: string,
    documentId: string,
    documentTitle: string,
    revenue: number,
  ): Promise<void> {
    await this.createAndSend(
      userId,
      'new_purchase',
      'New Sale!',
      `"${documentTitle}" was purchased. Revenue: ${revenue.toFixed(2)} DT`,
      'low',
      '/dashboard/analytics',
      'View Analytics',
      { documentId, documentTitle, revenue },
    );
  }

  async notifyNewReview(
    userId: string,
    documentId: string,
    documentTitle: string,
    rating: number,
    comment: string,
  ): Promise<void> {
    await this.createAndSend(
      userId,
      'new_review',
      'New Review',
      `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} - ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`,
      'low',
      `/dashboard/documents/${documentId}`,
      'Read Review',
      { documentId, documentTitle, rating, comment },
    );
  }

  async notifyRatingIncreased(userId: string, newRating: number): Promise<void> {
    await this.createAndSend(
      userId,
      'new_rating',
      'Rating Improved',
      `Your average rating increased to ${newRating.toFixed(1)}/5.0!`,
      'low',
      '/dashboard/analytics',
      'View Analytics',
      { newRating },
    );
  }

  // ============================================================================
  // AI NOTIFICATIONS (Teachers)
  // ============================================================================

  async notifyExamGenerated(userId: string, examId: string, questionCount: number): Promise<void> {
    await this.createAndSend(
      userId,
      'exam_generated',
      'Exam Generated Successfully',
      `Your AI-generated exam with ${questionCount} questions is ready.`,
      'low',
      `/dashboard/exams/${examId}`,
      'Open Exam',
      { examId, questionCount },
    );
  }

  async notifyQuestionBankCreated(userId: string, documentId: string, questionCount: number): Promise<void> {
    await this.createAndSend(
      userId,
      'question_bank_created',
      'Question Bank Created',
      `${questionCount} questions extracted and ready to use.`,
      'low',
      `/dashboard/documents/${documentId}/questions`,
      'Open Question Bank',
      { documentId, questionCount },
    );
  }

  async notifyTemplateGenerated(userId: string, templateId: string, templateName: string): Promise<void> {
    await this.createAndSend(
      userId,
      'template_generated',
      'Exam Template Generated',
      `Your institutional template "${templateName}" has been created.`,
      'low',
      `/dashboard/templates/${templateId}`,
      'Preview',
      { templateId, templateName },
    );
  }

  // ============================================================================
  // SECURITY NOTIFICATIONS (Teachers)
  // ============================================================================

  async notifyPasswordChanged(userId: string): Promise<void> {
    await this.createAndSend(
      userId,
      'password_changed',
      'Password Changed Successfully',
      'Your password has been updated. If you did not make this change, please contact support immediately.',
      'medium',
      '/dashboard/profile',
      'Review Security',
    );
  }

  async notifyNewLogin(userId: string, browser: string, os: string, location: string): Promise<void> {
    await this.createAndSend(
      userId,
      'new_login',
      'New Login Detected',
      `${browser} on ${os} from ${location}. Was this you?`,
      'medium',
      '/dashboard/security',
      'View Activity',
      { browser, os, location },
    );
  }

  // ============================================================================
  // ADMIN NOTIFICATIONS - USER MANAGEMENT
  // ============================================================================

  async notifyNewUserRegistration(fullName: string, role: string, userId: string): Promise<void> {
    await this.createAndSendToAdmins(
      'new_user',
      'New User Registration',
      `${fullName} registered as ${role}.`,
      'low',
      `/dashboard/admin/users/${userId}`,
      'View User',
      { fullName, role, userId },
    );
  }

  async notifyNewVerificationRequest(teacherName: string, institution: string, requestId: string): Promise<void> {
    await this.createAndSendToAdmins(
      'verification_request',
      'Teacher Verification Request',
      `${teacherName} from ${institution} is waiting for review.`,
      'medium',
      `/dashboard/admin/verification`,
      'Review',
      { teacherName, institution, requestId },
    );
  }

  async notifyVerificationResubmitted(teacherName: string, requestId: string): Promise<void> {
    await this.createAndSendToAdmins(
      'verification_resubmitted',
      'Verification Updated',
      `${teacherName} submitted new documents.`,
      'medium',
      `/dashboard/admin/verification`,
      'Review',
      { teacherName, requestId },
    );
  }

  // ============================================================================
  // ADMIN NOTIFICATIONS - RESOURCE MODERATION
  // ============================================================================

  async notifyNewResourceUploaded(documentId: string, title: string, teacherName: string): Promise<void> {
    await this.createAndSendToAdmins(
      'new_resource',
      'New Resource Upload',
      `"${title}" by ${teacherName} is pending review.`,
      'medium',
      `/dashboard/admin/moderation/${documentId}`,
      'Moderate',
      { documentId, title, teacherName },
    );
  }

  async notifyAIHighRisk(documentId: string, title: string, aiScore: number, issues: string[]): Promise<void> {
    await this.createAndSendToAdmins(
      'ai_high_risk',
      'High Risk Resource Detected',
      `AI Score: ${aiScore}. Contains: ${issues.join(', ')}.`,
      'critical',
      `/dashboard/admin/moderation/${documentId}`,
      'Review',
      { documentId, title, aiScore, issues },
    );
  }

  async notifyPossibleCopyright(documentId: string, title: string, similarity: number): Promise<void> {
    await this.createAndSendToAdmins(
      'ai_copyright',
      'Possible Copyright Issue',
      `Document "${title}" has ${similarity}% similarity to existing content.`,
      'high',
      `/dashboard/admin/moderation/${documentId}`,
      'Inspect',
      { documentId, title, similarity },
    );
  }

  async notifyPIIDetected(documentId: string, title: string, piiTypes: string[]): Promise<void> {
    await this.createAndSendToAdmins(
      'ai_pii_detected',
      'Personal Information Detected',
      `Found ${piiTypes.join(', ')} in "${title}".`,
      'critical',
      `/dashboard/admin/moderation/${documentId}`,
      'Review',
      { documentId, title, piiTypes },
    );
  }

  // ============================================================================
  // ADMIN NOTIFICATIONS - REPORTS
  // ============================================================================

  async notifyResourceReport(
    documentId: string,
    documentTitle: string,
    reporterId: string,
    reason: string,
  ): Promise<void> {
    await this.createAndSendToAdmins(
      'resource_report',
      'Resource Reported',
      `"${documentTitle}" reported for: ${reason}`,
      'high',
      `/dashboard/admin/reports/resources/${documentId}`,
      'Review',
      { documentId, documentTitle, reporterId, reason },
    );
  }

  async notifyUserReport(reportedUserId: string, reportedName: string, reason: string): Promise<void> {
    await this.createAndSendToAdmins(
      'user_report',
      'User Reported',
      `${reportedName} reported for: ${reason}`,
      'high',
      `/dashboard/admin/users/${reportedUserId}`,
      'View',
      { reportedUserId, reportedName, reason },
    );
  }

  // ============================================================================
  // ADMIN NOTIFICATIONS - SYSTEM & ANALYTICS
  // ============================================================================

  async notifyDailySummary(stats: {
    resourcesUploaded: number;
    newTeachers: number;
    pendingReviews: number;
    revenue: number;
  }): Promise<void> {
    await this.createAndSendToAdmins(
      'daily_summary',
      "Today's Summary",
      `Resources: ${stats.resourcesUploaded}, New Teachers: ${stats.newTeachers}, Pending Reviews: ${stats.pendingReviews}, Revenue: ${stats.revenue.toFixed(2)} DT`,
      'low',
      '/dashboard/admin/analytics',
      'View Dashboard',
      stats,
    );
  }

  async notifySystemAlert(title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    await this.createAndSendToAdmins(
      'system_alert',
      title,
      message,
      severity,
      '/dashboard/admin/system',
      'View System',
    );
  }

  // ============================================================================
  // LEGACY METHODS (Keep for backwards compatibility)
  // ============================================================================

  async createForAdmins(
    message: string,
    type: string,
    link?: string,
    data?: any,
  ): Promise<UserNotificationEntity[]> {
    // Send via WebSocket
    this.notificationsGateway.sendToAdmins({
      message,
      type,
      link,
      timestamp: new Date(),
      data,
    });
    return [];
  }

  async broadcast(
    message: string,
    type: string,
    link?: string,
    data?: any,
  ): Promise<number> {
    // Broadcast via WebSocket
    this.notificationsGateway.broadcast({
      message,
      type,
      link,
      timestamp: new Date(),
      data,
    });
    return 0;
  }
}
