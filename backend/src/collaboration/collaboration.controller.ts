import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';
import {
  InviteCollaboratorDto,
  UpdateCollaboratorDto,
  RespondInvitationDto,
  CreateCommentDto,
  ResolveCommentDto,
  CreateVersionDto,
  SearchCollaboratorsDto,
} from './dto';

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  // ============================================================================
  // RESOURCE COLLABORATION ENDPOINTS
  // ============================================================================

  /**
   * POST /collaboration/resources/:resourceId/collaborators
   * Invite a collaborator to a resource
   */
  @Post('resources/:resourceId/collaborators')
  async inviteResourceCollaborator(
    @Param('resourceId') resourceId: string,
    @Body() dto: InviteCollaboratorDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.inviteResourceCollaborator(resourceId, userId, dto);
  }

  /**
   * GET /collaboration/resources/:resourceId/collaborators
   * Get all collaborators for a resource
   */
  @Get('resources/:resourceId/collaborators')
  async getResourceCollaborators(@Param('resourceId') resourceId: string) {
    return this.collaborationService.getResourceCollaborators(resourceId);
  }

  /**
   * PATCH /collaboration/resources/collaborators/:collaboratorId
   * Update collaborator permissions
   */
  @Patch('resources/collaborators/:collaboratorId')
  async updateResourceCollaborator(
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: UpdateCollaboratorDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.updateResourceCollaborator(collaboratorId, userId, dto);
  }

  /**
   * DELETE /collaboration/resources/collaborators/:collaboratorId
   * Remove a collaborator from a resource
   */
  @Delete('resources/collaborators/:collaboratorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeResourceCollaborator(
    @Param('collaboratorId') collaboratorId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.collaborationService.removeResourceCollaborator(collaboratorId, userId);
  }

  // ============================================================================
  // EXAM COLLABORATION ENDPOINTS
  // ============================================================================

  /**
   * POST /collaboration/exams/:examId/collaborators
   * Invite a collaborator to an exam
   */
  @Post('exams/:examId/collaborators')
  async inviteExamCollaborator(
    @Param('examId') examId: string,
    @Body() dto: InviteCollaboratorDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.inviteExamCollaborator(examId, userId, dto);
  }

  /**
   * GET /collaboration/exams/:examId/collaborators
   * Get all collaborators for an exam
   */
  @Get('exams/:examId/collaborators')
  async getExamCollaborators(@Param('examId') examId: string) {
    return this.collaborationService.getExamCollaborators(examId);
  }

  /**
   * DELETE /collaboration/exams/collaborators/:collaboratorId
   * Remove a collaborator from an exam
   */
  @Delete('exams/collaborators/:collaboratorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeExamCollaborator(
    @Param('collaboratorId') collaboratorId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.collaborationService.removeExamCollaborator(collaboratorId, userId);
  }

  /**
   * GET /collaboration/exams/:examId/sessions
   * Get active sessions (presence) for an exam
   */
  @Get('exams/:examId/sessions')
  async getActiveSessions(@Param('examId') examId: string) {
    return this.collaborationService.getActiveSessions(examId);
  }

  /**
   * POST /collaboration/exams/:examId/sessions/join
   * Join an exam editing session
   */
  @Post('exams/:examId/sessions/join')
  async joinExamSession(
    @Param('examId') examId: string,
    @Body('socketId') socketId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.joinExamSession(examId, userId, socketId);
  }

  /**
   * POST /collaboration/exams/:examId/sessions/leave
   * Leave an exam editing session
   */
  @Post('exams/:examId/sessions/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveExamSession(
    @Param('examId') examId: string,
    @Body('socketId') socketId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.collaborationService.leaveExamSession(examId, userId, socketId);
  }

  // ============================================================================
  // QUESTION LOCKING ENDPOINTS
  // ============================================================================

  /**
   * POST /collaboration/exams/:examId/questions/:questionId/lock
   * Lock a question for editing
   */
  @Post('exams/:examId/questions/:questionId/lock')
  async lockQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.lockQuestion(examId, questionId, userId);
  }

  /**
   * DELETE /collaboration/exams/:examId/questions/:questionId/lock
   * Unlock a question
   */
  @Delete('exams/:examId/questions/:questionId/lock')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlockQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.collaborationService.unlockQuestion(examId, questionId, userId);
  }

  /**
   * GET /collaboration/exams/:examId/locks
   * Get all current locks for an exam
   */
  @Get('exams/:examId/locks')
  async getExamLocks(@Param('examId') examId: string) {
    return this.collaborationService.getExamLocks(examId);
  }

  // ============================================================================
  // INVITATION MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET /collaboration/invitations
   * Get my pending invitations
   */
  @Get('invitations')
  async getMyInvitations(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.getMyPendingInvitations(userId);
  }

  /**
   * GET /collaboration/invitations/:invitationId/preview
   * Preview resource details for a pending invitation
   */
  @Get('invitations/:invitationId/preview')
  async previewInvitationResource(
    @Param('invitationId') invitationId: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.previewInvitationResource(invitationId, userId);
  }

  /**
   * POST /collaboration/invitations/:invitationId/respond
   * Accept or decline an invitation
   */
  @Post('invitations/:invitationId/respond')
  async respondToInvitation(
    @Param('invitationId') invitationId: string,
    @Body() dto: RespondInvitationDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.collaborationService.respondToResourceInvitation(
      invitationId, 
      userId, 
      dto.action,
      dto.message,
    );

    // Determine redirect URL based on resource type and action
    let redirectUrl: string | null = null;
    if (dto.action === 'accept') {
      if ('examId' in result && result.examId) {
        // Exam collaboration
        redirectUrl = `/dashboard/exam-builder?examId=${result.examId}`;
        console.log('Exam collaboration accepted, redirecting to:', redirectUrl);
      } else if ('resourceId' in result && result.resourceId) {
        // Document collaboration
        redirectUrl = `/dashboard/resources?highlight=${result.resourceId}`;
        console.log('Document collaboration accepted, redirecting to:', redirectUrl);
      }
    }

    return {
      ...result,
      redirectUrl,
    };
  }

  // ============================================================================
  // COMMENTS ENDPOINTS
  // ============================================================================

  /**
   * POST /collaboration/resources/:resourceId/comments
   * Add a comment to a resource
   */
  @Post('resources/:resourceId/comments')
  async createResourceComment(
    @Param('resourceId') resourceId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.createComment('document', resourceId, userId, dto);
  }

  /**
   * GET /collaboration/resources/:resourceId/comments
   * Get comments for a resource
   */
  @Get('resources/:resourceId/comments')
  async getResourceComments(
    @Param('resourceId') resourceId: string,
    @Query('questionId') questionId?: string,
    @Query('elementId') elementId?: string,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.collaborationService.getComments(
      'document',
      resourceId,
      questionId,
      elementId,
      includeResolved === 'true',
    );
  }

  /**
   * POST /collaboration/exams/:examId/comments
   * Add a comment to an exam
   */
  @Post('exams/:examId/comments')
  async createExamComment(
    @Param('examId') examId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.createComment('exam', examId, userId, dto);
  }

  /**
   * GET /collaboration/exams/:examId/comments
   * Get comments for an exam
   */
  @Get('exams/:examId/comments')
  async getExamComments(
    @Param('examId') examId: string,
    @Query('questionId') questionId?: string,
    @Query('elementId') elementId?: string,
    @Query('includeResolved') includeResolved?: string,
  ) {
    return this.collaborationService.getComments(
      'exam',
      examId,
      questionId,
      elementId,
      includeResolved === 'true',
    );
  }

  /**
   * PATCH /collaboration/comments/:commentId/resolve
   * Resolve or unresolve a comment
   */
  @Patch('comments/:commentId/resolve')
  async resolveComment(
    @Param('commentId') commentId: string,
    @Body() dto: ResolveCommentDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.resolveComment(commentId, userId, dto.resolved);
  }

  // ============================================================================
  // VERSION HISTORY ENDPOINTS
  // ============================================================================

  /**
   * POST /collaboration/resources/:resourceId/versions
   * Save a new version of a resource
   */
  @Post('resources/:resourceId/versions')
  async saveResourceVersion(
    @Param('resourceId') resourceId: string,
    @Body() dto: CreateVersionDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.saveVersion('document', resourceId, userId, dto);
  }

  /**
   * GET /collaboration/resources/:resourceId/versions
   * Get version history for a resource
   */
  @Get('resources/:resourceId/versions')
  async getResourceVersions(
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getVersionHistory('document', resourceId, parseInt(limit || '10'));
  }

  /**
   * POST /collaboration/exams/:examId/versions
   * Save a new version of an exam
   */
  @Post('exams/:examId/versions')
  async saveExamVersion(
    @Param('examId') examId: string,
    @Body() dto: CreateVersionDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.collaborationService.saveVersion('exam', examId, userId, dto);
  }

  /**
   * GET /collaboration/exams/:examId/versions
   * Get version history for an exam
   */
  @Get('exams/:examId/versions')
  async getExamVersions(
    @Param('examId') examId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getVersionHistory('exam', examId, parseInt(limit || '10'));
  }

  /**
   * GET /collaboration/versions/:versionId
   * Get a specific version
   */
  @Get('versions/:versionId')
  async getVersion(@Param('versionId') versionId: string) {
    return this.collaborationService.getVersion(versionId);
  }

  // ============================================================================
  // ACTIVITY FEED ENDPOINTS
  // ============================================================================

  /**
   * GET /collaboration/resources/:resourceId/activity
   * Get activity feed for a resource
   */
  @Get('resources/:resourceId/activity')
  async getResourceActivity(
    @Param('resourceId') resourceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getActivityFeed('document', resourceId, parseInt(limit || '50'));
  }

  /**
   * GET /collaboration/exams/:examId/activity
   * Get activity feed for an exam
   */
  @Get('exams/:examId/activity')
  async getExamActivity(
    @Param('examId') examId: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getActivityFeed('exam', examId, parseInt(limit || '50'));
  }

  // ============================================================================
  // SEARCH ENDPOINTS
  // ============================================================================

  /**
   * GET /collaboration/search/collaborators
   * Search for potential collaborators
   */
  @Get('search/collaborators')
  async searchCollaborators(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.searchCollaborators(query, parseInt(limit || '10'));
  }
}
