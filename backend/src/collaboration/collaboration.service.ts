import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, LessThan } from 'typeorm';
import {
  ResourceCollaboratorEntity,
  ExamCollaboratorEntity,
  ExamSessionEntity,
  QuestionLockEntity,
  CollaborationCommentEntity,
  CollaborationVersionEntity,
  CollaborationActivityEntity,
} from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { ExamEntity } from '../exams/entities/exam.entity';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { MailService } from '../mail/mail.service';
import {
  InviteCollaboratorDto,
  UpdateCollaboratorDto,
  CreateCommentDto,
  CreateVersionDto,
} from './dto';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    @InjectRepository(ResourceCollaboratorEntity)
    private resourceCollaboratorRepo: Repository<ResourceCollaboratorEntity>,
    @InjectRepository(ExamCollaboratorEntity)
    private examCollaboratorRepo: Repository<ExamCollaboratorEntity>,
    @InjectRepository(ExamSessionEntity)
    private examSessionRepo: Repository<ExamSessionEntity>,
    @InjectRepository(QuestionLockEntity)
    private questionLockRepo: Repository<QuestionLockEntity>,
    @InjectRepository(CollaborationCommentEntity)
    private commentRepo: Repository<CollaborationCommentEntity>,
    @InjectRepository(CollaborationVersionEntity)
    private versionRepo: Repository<CollaborationVersionEntity>,
    @InjectRepository(CollaborationActivityEntity)
    private activityRepo: Repository<CollaborationActivityEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(DocumentEntity)
    private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(ExamEntity)
    private examRepo: Repository<ExamEntity>,
    @Inject(forwardRef(() => UserNotificationsService))
    private notificationsService: UserNotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
    private mailService: MailService,
  ) {}

  // ============================================================================
  // RESOURCE COLLABORATION (CO-AUTHORSHIP)
  // ============================================================================

  /**
   * Invite a collaborator to a resource
   */
  async inviteResourceCollaborator(
    resourceId: string,
    inviterId: string,
    dto: InviteCollaboratorDto,
  ): Promise<ResourceCollaboratorEntity> {
    // Check if user exists
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const inviter = await this.userRepo.findOne({ where: { id: inviterId } });
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Check if already a collaborator
    const existing = await this.resourceCollaboratorRepo.findOne({
      where: { resourceId, userId: dto.userId },
    });

    if (existing) {
      if (existing.status === 'removed') {
        // Reinvite
        existing.status = 'pending';
        existing.role = dto.role;
        existing.permissions = dto.permissions ? {
          edit: dto.permissions.edit ?? true,
          analytics: dto.permissions.analytics ?? true,
          revenue: dto.permissions.revenue ?? 0,
        } : existing.permissions;
        existing.invitedBy = inviterId;
        existing.invitedAt = new Date();
        const saved = await this.resourceCollaboratorRepo.save(existing);

        // Send notification
        try {
          await this.notificationsService.notifyCollaborationInvite(
            dto.userId,
            inviter.fullName,
            resourceId,
            'document',
            dto.role
          );
          
          // Send collaboration invitation email
          const document = await this.documentRepo.findOne({ where: { id: resourceId } });
          if (document) {
            await this.mailService.sendCollaborationInvitation(
              user.email,
              inviter.fullName,
              document.title || document.originalName,
              dto.role,
              resourceId
            );
            this.logger.log(`Collaboration invitation email sent to: ${user.email}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to send collaboration notification: ${error.message}`);
        }

        return saved;
      }
      throw new BadRequestException('User is already a collaborator');
    }

    // Create invitation
    const collaborator = this.resourceCollaboratorRepo.create({
      resourceId,
      userId: dto.userId,
      invitedBy: inviterId,
      role: dto.role,
      permissions: dto.permissions ? {
        edit: dto.permissions.edit ?? true,
        analytics: dto.permissions.analytics ?? true,
        revenue: dto.permissions.revenue ?? 0,
      } : { edit: true, analytics: true, revenue: 0 },
      status: 'pending',
    });

    const saved = await this.resourceCollaboratorRepo.save(collaborator);

    // Log activity
    await this.logActivity(resourceId, 'document', inviterId, 'invite_collaborator', {
      collaboratorId: dto.userId,
      role: dto.role,
    });

    // Send notification
    try {
      await this.notificationsService.notifyCollaborationInvite(
        dto.userId,
        inviter.fullName,
        resourceId,
        'document',
        dto.role
      );
      
      // Send collaboration invitation email
      const document = await this.documentRepo.findOne({ where: { id: resourceId } });
      if (document) {
        await this.mailService.sendCollaborationInvitation(
          user.email,
          inviter.fullName,
          document.title || document.originalName,
          dto.role,
          resourceId
        );
        this.logger.log(`Collaboration invitation email sent to: ${user.email}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send collaboration notification: ${error.message}`);
    }

    this.logger.log(`User ${dto.userId} invited to collaborate on resource ${resourceId}`);

    return saved;
  }

  /**
   * Respond to a collaboration invitation (resource or exam)
   */
  async respondToResourceInvitation(
    collaboratorId: string,
    userId: string,
    action: 'accept' | 'decline',
    message?: string,
  ): Promise<ResourceCollaboratorEntity | ExamCollaboratorEntity> {
    // Try to find as resource collaborator first
    let resourceCollaborator = await this.resourceCollaboratorRepo.findOne({
      where: { id: collaboratorId, userId, status: 'pending' },
    });

    if (resourceCollaborator) {
      // Handle resource invitation
      resourceCollaborator.status = action === 'accept' ? 'accepted' : 'declined';
      if (action === 'accept') {
        resourceCollaborator.acceptedAt = new Date();
      }

      const updated = await this.resourceCollaboratorRepo.save(resourceCollaborator);

      // Log activity with optional message
      await this.logActivity(resourceCollaborator.resourceId, 'document', userId, `${action}_invitation`, {
        collaboratorId,
        message: message || undefined,
      });

      // Notify the inviter
      await this.sendInvitationResponseNotification(
        resourceCollaborator.invitedBy,
        resourceCollaborator.resourceId,
        'document',
        userId,
        action,
        message,
      );

      this.logger.log(`User ${userId} ${action}ed resource collaboration invitation ${collaboratorId}`);
      return updated;
    }

    // Try to find as exam collaborator
    let examCollaborator = await this.examCollaboratorRepo.findOne({
      where: { id: collaboratorId, userId, status: 'pending' },
    });

    if (examCollaborator) {
      // Handle exam invitation
      examCollaborator.status = action === 'accept' ? 'accepted' : 'declined';
      if (action === 'accept') {
        examCollaborator.acceptedAt = new Date();
      }

      const updated = await this.examCollaboratorRepo.save(examCollaborator);

      // Log activity with optional message
      await this.logActivity(examCollaborator.examId, 'exam', userId, `${action}_invitation`, {
        collaboratorId,
        message: message || undefined,
      });

      // Notify the inviter
      await this.sendInvitationResponseNotification(
        examCollaborator.invitedBy,
        examCollaborator.examId,
        'exam',
        userId,
        action,
        message,
      );

      this.logger.log(`User ${userId} ${action}ed exam collaboration invitation ${collaboratorId}`);
      return updated;
    }

    throw new NotFoundException('Invitation not found');
  }

  /**
   * Helper method to send invitation response notifications
   */
  private async sendInvitationResponseNotification(
    inviterId: string,
    resourceId: string,
    resourceType: 'document' | 'exam',
    responderId: string,
    action: 'accept' | 'decline',
    message?: string,
  ): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: responderId } });
      const inviter = await this.userRepo.findOne({ where: { id: inviterId } });
      
      if (!user || !inviter) {
        this.logger.warn('User or inviter not found for notification');
        return;
      }

      const resourceLabel = resourceType === 'document' ? 'resource' : 'exam';
      const actionUrl = resourceType === 'exam' 
        ? `/dashboard/exam-builder?examId=${resourceId}`
        : `/dashboard/resources?highlight=${resourceId}`;

      if (action === 'accept') {
        // Send acceptance notification with optional message
        const notificationMessage = message 
          ? `${user.fullName} accepted your invitation and said: "${message}"`
          : `${user.fullName} accepted your invitation to collaborate on your ${resourceLabel}.`;
        
        await this.notificationsService.create({
          userId: inviterId,
          type: 'collaboration_accepted',
          title: 'Invitation Accepted',
          message: notificationMessage,
          metadata: {
            priority: 'low',
            category: 'collaboration',
            actionUrl,
            actionText: 'View',
            collaboratorName: user.fullName,
            resourceId,
            resourceType,
            responseMessage: message,
          },
        });
        
        // Send collaboration accepted email
        const resource = resourceType === 'exam' 
          ? await this.examRepo.findOne({ where: { id: resourceId } })
          : await this.documentRepo.findOne({ where: { id: resourceId } });
        
        if (resource) {
          const resourceTitle = resourceType === 'exam' 
            ? (resource as any).title 
            : ((resource as any).title || (resource as any).originalName);
          
          await this.mailService.sendCollaborationAccepted(
            inviter.email,
            user.fullName,
            resourceTitle,
            resourceId
          );
          this.logger.log(`Collaboration accepted email sent to: ${inviter.email}`);
        }
      } else if (message) {
        // Declined with message
        await this.notificationsService.create({
          userId: inviterId,
          type: 'collaboration_declined',
          title: 'Invitation Declined',
          message: `${user.fullName} declined your invitation and said: "${message}"`,
          metadata: {
            priority: 'low',
            category: 'collaboration',
            actionUrl: resourceType === 'exam' ? '/dashboard/exam-builder' : '/dashboard/resources',
            actionText: resourceType === 'exam' ? 'View Exams' : 'View Resources',
            collaboratorName: user.fullName,
            resourceId,
            resourceType,
            responseMessage: message,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send invitation response notification: ${error.message}`);
    }
  }

  /**
   * Get my pending invitations (both resource and exam)
   */
  async getMyPendingInvitations(userId: string): Promise<any> {
    try {
      this.logger.log(`Fetching pending invitations for user: ${userId}`);
      
      // Get resource invitations
      const resourceInvites = await this.resourceCollaboratorRepo.find({
        where: { userId, status: 'pending' },
        relations: ['inviter'],
        order: { invitedAt: 'DESC' },
      });
      
      this.logger.log(`Found ${resourceInvites.length} pending resource invitations`);

      // Get exam invitations
      const examInvites = await this.examCollaboratorRepo.find({
        where: { userId, status: 'pending' },
        relations: ['inviter'],
        order: { invitedAt: 'DESC' },
      });
      
      this.logger.log(`Found ${examInvites.length} pending exam invitations`);
      this.logger.log(`Exam invitations raw:`, JSON.stringify(examInvites.map(inv => ({
        id: inv.id,
        examId: inv.examId,
        userId: inv.userId,
        invitedBy: inv.invitedBy,
        inviterName: inv.inviter?.fullName,
        status: inv.status,
      }))));

      const result = {
        resources: resourceInvites.map(invite => ({
          id: invite.id,
          resourceId: invite.resourceId,
          resourceType: 'document',
          role: invite.role,
          permissions: invite.permissions,
          invitedBy: invite.inviter?.fullName || 'Unknown',
          invitedAt: invite.invitedAt,
        })),
        exams: examInvites.map(invite => ({
          id: invite.id,
          resourceId: invite.examId,
          resourceType: 'exam',
          role: invite.role,
          invitedBy: invite.inviter?.fullName || 'Unknown',
          invitedAt: invite.invitedAt,
        })),
      };
      
      this.logger.log(`Returning result:`, JSON.stringify(result));
      return result;
    } catch (error) {
      this.logger.error(`Failed to get pending invitations: ${error.message}`, error.stack);
      return { resources: [], exams: [] };
    }
  }

  /**
   * Preview resource/exam details for a pending invitation
   * Allows invited users to see basic info before accepting
   */
  async previewInvitationResource(invitationId: string, userId: string): Promise<any> {
    try {
      // Check if this is a resource invitation
      const resourceInvite = await this.resourceCollaboratorRepo.findOne({
        where: { id: invitationId, userId, status: 'pending' },
      });

      if (resourceInvite) {
        // Fetch document details
        const document = await this.documentRepo.findOne({
          where: { id: resourceInvite.resourceId },
          relations: ['user'],
        });

        if (!document) {
          throw new NotFoundException('Document not found');
        }

        return {
          type: 'document',
          id: document.id,
          title: document.title || document.originalName,
          description: document.description,
          subject: document.subject,
          level: document.level,
          year: document.year,
          fileUrl: document.storageUrl,
          ownerName: document.user?.fullName || 'Unknown',
          role: resourceInvite.role,
          permissions: resourceInvite.permissions,
        };
      }

      // Check if this is an exam invitation
      const examInvite = await this.examCollaboratorRepo.findOne({
        where: { id: invitationId, userId, status: 'pending' },
      });

      if (examInvite) {
        // Fetch exam details
        const exam = await this.examRepo.findOne({
          where: { id: examInvite.examId },
          relations: ['owner'],
        });

        if (!exam) {
          throw new NotFoundException('Exam not found');
        }

        return {
          type: 'exam',
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          classLevel: exam.classLevel,
          duration: exam.duration,
          instructions: exam.instructions,
          questionCount: exam.questions?.length || 0,
          maxPoints: exam.maxPoints,
          ownerName: exam.owner?.fullName || 'Unknown',
          role: examInvite.role,
        };
      }

      throw new NotFoundException('Invitation not found or not pending');
    } catch (error) {
      this.logger.error(`Failed to preview invitation resource: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all collaborators for a resource
   */
  async getResourceCollaborators(resourceId: string): Promise<any[]> {
    try {
      const collaborators = await this.resourceCollaboratorRepo.find({
        where: { resourceId, status: Not('removed') },
        relations: ['user', 'inviter'],
        order: { createdAt: 'DESC' },
      });

      // Map to simpler format for frontend
      return collaborators.map(collab => ({
        id: collab.id,
        userId: collab.userId,
        userName: collab.user?.fullName || 'Unknown User',
        userEmail: collab.user?.email,
        role: collab.role,
        status: collab.status,
        permissions: collab.permissions,
        invitedAt: collab.invitedAt,
        acceptedAt: collab.acceptedAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get resource collaborators: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Update collaborator permissions
   */
  async updateResourceCollaborator(
    collaboratorId: string,
    ownerId: string,
    dto: UpdateCollaboratorDto,
  ): Promise<ResourceCollaboratorEntity> {
    const collaborator = await this.resourceCollaboratorRepo.findOne({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    // Verify the requester is the owner
    const isOwner = await this.isResourceOwner(collaborator.resourceId, ownerId);
    if (!isOwner) {
      throw new ForbiddenException('Only the owner can update collaborators');
    }

    if (dto.role) {
      collaborator.role = dto.role;
    }

    if (dto.permissions) {
      collaborator.permissions = {
        edit: dto.permissions.edit ?? collaborator.permissions.edit,
        analytics: dto.permissions.analytics ?? collaborator.permissions.analytics,
        revenue: dto.permissions.revenue ?? collaborator.permissions.revenue,
      };
    }

    const updated = await this.resourceCollaboratorRepo.save(collaborator);

    // Log activity
    await this.logActivity(collaborator.resourceId, 'document', ownerId, 'update_collaborator', {
      collaboratorId,
      changes: dto,
    });

    return updated;
  }

  /**
   * Remove a collaborator from a resource
   */
  async removeResourceCollaborator(
    collaboratorId: string,
    userId: string,
  ): Promise<void> {
    const collaborator = await this.resourceCollaboratorRepo.findOne({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    // Allow:
    // 1. Owner to remove anyone (cancel invites or remove accepted collaborators)
    // 2. Invited person to decline/remove themselves
    const isOwner = await this.isResourceOwner(collaborator.resourceId, userId);
    const isInviter = collaborator.invitedBy === userId;
    const isSelf = collaborator.userId === userId;
    
    if (!isOwner && !isInviter && !isSelf) {
      throw new ForbiddenException('You do not have permission to remove this collaborator');
    }

    collaborator.status = 'removed';
    await this.resourceCollaboratorRepo.save(collaborator);

    // Log activity
    const actionType = isSelf ? 'decline_invitation' : 'remove_collaborator';
    await this.logActivity(collaborator.resourceId, 'document', userId, actionType, {
      collaboratorId,
      wasInviter: isInviter,
      wasSelf: isSelf,
    });

    this.logger.log(`Collaborator ${collaboratorId} removed from resource by user ${userId}`);
  }

  /**
   * Check if user is resource owner
   */
  private async isResourceOwner(resourceId: string, userId: string): Promise<boolean> {
    const owner = await this.resourceCollaboratorRepo.findOne({
      where: { resourceId, userId, role: 'owner' },
    });
    return !!owner;
  }

  // ============================================================================
  // EXAM COLLABORATION
  // ============================================================================

  /**
   * Invite a collaborator to an exam
   */
  async inviteExamCollaborator(
    examId: string,
    inviterId: string,
    dto: InviteCollaboratorDto,
  ): Promise<any> {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const inviter = await this.userRepo.findOne({ where: { id: inviterId } });
      if (!inviter) {
        throw new NotFoundException('Inviter not found');
      }

      const existing = await this.examCollaboratorRepo.findOne({
        where: { examId, userId: dto.userId },
      });

      if (existing) {
        if (existing.status === 'removed') {
          existing.status = 'pending';
          existing.role = dto.role;
          existing.invitedBy = inviterId;
          existing.invitedAt = new Date();
          existing.permissions = dto.permissions || { edit: true, analytics: true, revenue: 0 };
          const saved = await this.examCollaboratorRepo.save(existing);
          
          await this.logActivity(examId, 'exam', inviterId, 'reinvite_collaborator', {
            collaboratorId: dto.userId,
            role: dto.role,
          });

          // Send notification
          try {
            await this.notificationsService.notifyCollaborationInvite(
              dto.userId,
              inviter.fullName,
              examId,
              'exam',
              dto.role
            );
          } catch (error) {
            this.logger.warn(`Failed to send collaboration notification: ${error.message}`);
          }

          return {
            id: saved.id,
            userId: saved.userId,
            userName: user.fullName,
            userEmail: user.email,
            role: saved.role,
            status: saved.status,
            invitedAt: saved.invitedAt,
          };
        }
        throw new BadRequestException('User is already a collaborator');
      }

      const collaborator = this.examCollaboratorRepo.create({
        examId,
        userId: dto.userId,
        invitedBy: inviterId,
        role: dto.role,
        status: 'pending',
        permissions: dto.permissions || { edit: true, analytics: true, revenue: 0 },
      });

      const saved = await this.examCollaboratorRepo.save(collaborator);

      await this.logActivity(examId, 'exam', inviterId, 'invite_collaborator', {
        collaboratorId: dto.userId,
        role: dto.role,
      });

      // Send notification
      try {
        await this.notificationsService.notifyCollaborationInvite(
          dto.userId,
          inviter.fullName,
          examId,
          'exam',
          dto.role
        );
      } catch (error) {
        this.logger.warn(`Failed to send collaboration notification: ${error.message}`);
      }

      return {
        id: saved.id,
        userId: saved.userId,
        userName: user.fullName,
        userEmail: user.email,
        role: saved.role,
        status: saved.status,
        invitedAt: saved.invitedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to invite exam collaborator: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all collaborators for an exam
   */
  async getExamCollaborators(examId: string): Promise<any[]> {
    try {
      const collaborators = await this.examCollaboratorRepo.find({
        where: { examId, status: Not('removed') },
        relations: ['user', 'inviter'],
        order: { createdAt: 'DESC' },
      });

      // Map to simpler format for frontend
      return collaborators.map(collab => ({
        id: collab.id,
        userId: collab.userId,
        userName: collab.user?.fullName || 'Unknown User',
        userEmail: collab.user?.email,
        role: collab.role,
        status: collab.status,
        permissions: collab.permissions,
        invitedAt: collab.invitedAt,
        acceptedAt: collab.acceptedAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get exam collaborators: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Remove a collaborator from an exam
   */
  async removeExamCollaborator(
    collaboratorId: string,
    userId: string,
  ): Promise<void> {
    const collaborator = await this.examCollaboratorRepo.findOne({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    // Allow:
    // 1. Inviter to cancel invitations
    // 2. Invited person to decline/remove themselves
    // Note: For exams, we check inviter (not owner) since exams don't have explicit owners
    const isInviter = collaborator.invitedBy === userId;
    const isSelf = collaborator.userId === userId;
    
    if (!isInviter && !isSelf) {
      throw new ForbiddenException('You do not have permission to remove this collaborator');
    }

    collaborator.status = 'removed';
    await this.examCollaboratorRepo.save(collaborator);

    // Log activity
    const actionType = isSelf ? 'decline_invitation' : 'remove_collaborator';
    await this.logActivity(collaborator.examId, 'exam', userId, actionType, {
      collaboratorId,
      wasInviter: isInviter,
      wasSelf: isSelf,
    });

    this.logger.log(`Exam collaborator ${collaboratorId} removed by user ${userId}`);
  }

  /**
   * Get active sessions for an exam (presence)
   */
  async getActiveSessions(examId: string): Promise<ExamSessionEntity[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return this.examSessionRepo.find({
      where: {
        examId,
        status: Not('disconnected'),
        lastActivity: Not(LessThan(fiveMinutesAgo)),
      },
      relations: ['user'],
      order: { lastActivity: 'DESC' },
    });
  }

  /**
   * Join an exam session
   */
  async joinExamSession(
    examId: string,
    userId: string,
    socketId: string,
  ): Promise<ExamSessionEntity> {
    // Check if user is a collaborator
    const isCollaborator = await this.examCollaboratorRepo.findOne({
      where: { examId, userId, status: 'accepted' },
    });

    if (!isCollaborator) {
      throw new ForbiddenException('You are not a collaborator on this exam');
    }

    // Create or update session
    let session = await this.examSessionRepo.findOne({
      where: { examId, userId, socketId },
    });

    if (session) {
      session.status = 'active';
      session.lastActivity = new Date();
    } else {
      session = this.examSessionRepo.create({
        examId,
        userId,
        socketId,
        status: 'active',
        lastActivity: new Date(),
      });
    }

    const saved = await this.examSessionRepo.save(session);

    await this.logActivity(examId, 'exam', userId, 'join_session', { socketId });

    return saved;
  }

  /**
   * Leave an exam session
   */
  async leaveExamSession(examId: string, userId: string, socketId: string): Promise<void> {
    const session = await this.examSessionRepo.findOne({
      where: { examId, userId, socketId },
    });

    if (session) {
      session.status = 'disconnected';
      await this.examSessionRepo.save(session);

      await this.logActivity(examId, 'exam', userId, 'leave_session', { socketId });
    }
  }

  // ============================================================================
  // QUESTION LOCKING
  // ============================================================================

  /**
   * Lock a question for editing
   */
  async lockQuestion(
    examId: string,
    questionId: string,
    userId: string,
  ): Promise<QuestionLockEntity> {
    // Check for existing lock
    const existingLock = await this.questionLockRepo.findOne({
      where: { examId, questionId, expiresAt: Not(LessThan(new Date())) },
    });

    if (existingLock && existingLock.lockedBy !== userId) {
      throw new BadRequestException('Question is already locked by another user');
    }

    // Create or extend lock
    const lock = existingLock || this.questionLockRepo.create({ examId, questionId, lockedBy: userId });
    lock.lockedAt = new Date();
    lock.expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds

    return this.questionLockRepo.save(lock);
  }

  /**
   * Unlock a question
   */
  async unlockQuestion(examId: string, questionId: string, userId: string): Promise<void> {
    await this.questionLockRepo.delete({ examId, questionId, lockedBy: userId });
  }

  /**
   * Get all locks for an exam
   */
  async getExamLocks(examId: string): Promise<QuestionLockEntity[]> {
    return this.questionLockRepo.find({
      where: { examId, expiresAt: Not(LessThan(new Date())) },
      relations: ['user'],
    });
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  /**
   * Add a comment
   */
  async createComment(
    resourceType: 'document' | 'exam',
    resourceId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CollaborationCommentEntity> {
    const comment = this.commentRepo.create({
      resourceType,
      resourceId,
      userId,
      questionId: dto.questionId,
      elementId: dto.elementId,
      elementType: dto.elementType,
      parentId: dto.parentId,
      content: dto.content,
      mentions: dto.mentions || [],
    });

    const saved = await this.commentRepo.save(comment);

    // Get user info for broadcasting
    const user = await this.userRepo.findOne({ where: { id: userId } });

    await this.logActivity(resourceId, resourceType, userId, 'add_comment', {
      commentId: saved.id,
      questionId: dto.questionId,
      elementId: dto.elementId,
    });

    // Broadcast comment for real-time updates (exams only for now)
    if (resourceType === 'exam') {
      try {
        this.notificationsGateway.broadcastComment(resourceId, {
          id: saved.id,
          userId: userId,
          userName: user?.fullName || 'Unknown User',
          content: saved.content,
          questionId: saved.questionId,
          elementId: saved.elementId,
          elementType: saved.elementType,
        });
      } catch (error) {
        this.logger.warn('Failed to broadcast comment via WebSocket');
      }
    }

    // Return comment with user info
    return {
      ...saved,
      userName: user?.fullName || 'Unknown User',
    } as any;
  }

  /**
   * Get comments for a resource
   */
  async getComments(
    resourceType: 'document' | 'exam',
    resourceId: string,
    questionId?: string,
    elementId?: string,
    includeResolved = false,
  ): Promise<CollaborationCommentEntity[]> {
    const where: any = { resourceType, resourceId };
    
    if (questionId) {
      where.questionId = questionId;
    }

    if (elementId) {
      where.elementId = elementId;
    }

    if (!includeResolved) {
      where.resolved = false;
    }

    return this.commentRepo.find({
      where,
      relations: ['user', 'parent', 'resolver'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Resolve a comment
   */
  async resolveComment(
    commentId: string,
    userId: string,
    resolved: boolean,
  ): Promise<CollaborationCommentEntity> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    comment.resolved = resolved;
    comment.resolvedBy = resolved ? userId : null;
    comment.resolvedAt = resolved ? new Date() : null;

    return this.commentRepo.save(comment);
  }

  // ============================================================================
  // VERSION HISTORY
  // ============================================================================

  /**
   * Save a version
   */
  async saveVersion(
    resourceType: 'document' | 'exam',
    resourceId: string,
    userId: string,
    dto: CreateVersionDto,
  ): Promise<CollaborationVersionEntity> {
    // Get next version number
    const lastVersion = await this.versionRepo.findOne({
      where: { resourceType, resourceId },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    const version = this.versionRepo.create({
      resourceType,
      resourceId,
      versionNumber,
      snapshot: dto.snapshot,
      changedBy: userId,
      changeSummary: dto.changeSummary,
    });

    const saved = await this.versionRepo.save(version);

    await this.logActivity(resourceId, resourceType, userId, 'save_version', {
      versionNumber,
      summary: dto.changeSummary,
    });

    return saved;
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    resourceType: 'document' | 'exam',
    resourceId: string,
    limit = 10,
  ): Promise<CollaborationVersionEntity[]> {
    return this.versionRepo.find({
      where: { resourceType, resourceId },
      relations: ['user'],
      order: { versionNumber: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<CollaborationVersionEntity> {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
      relations: ['user'],
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  // ============================================================================
  // ACTIVITY FEED
  // ============================================================================

  /**
   * Log an activity
   */
  private async logActivity(
    resourceId: string,
    resourceType: 'document' | 'exam',
    userId: string,
    actionType: string,
    actionData: Record<string, any> = {},
  ): Promise<void> {
    const activity = this.activityRepo.create({
      resourceType,
      resourceId,
      userId,
      actionType,
      actionData,
    });

    await this.activityRepo.save(activity);
  }

  /**
   * Get activity feed
   */
  async getActivityFeed(
    resourceType: 'document' | 'exam',
    resourceId: string,
    limit = 50,
  ): Promise<any[]> {
    try {
      const activities = await this.activityRepo.find({
        where: { resourceType, resourceId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return activities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        userName: activity.user?.fullName || 'Unknown User',
        actionType: activity.actionType,
        actionData: activity.actionData,
        createdAt: activity.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get activity feed: ${error.message}`, error.stack);
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Search for potential collaborators (verified teachers)
   */
  async searchCollaborators(query: string, limit = 10): Promise<UserEntity[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'teacher' })
      .andWhere('user.verified = :verified', { verified: true })
      .andWhere(
        '(user."fullName" ILIKE :query OR user.email ILIKE :query OR user.university ILIKE :query)',
        { query: `%${query}%` },
      )
      .take(limit)
      .getMany();
  }
}
