import { Controller, Get, Post, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModerationService } from './moderation.service';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * Get pending documents for moderation
   */
  @Get('pending')
  async getPendingDocuments() {
    const documents = await this.moderationService.getPendingDocuments();
    return {
      success: true,
      count: documents.length,
      documents,
    };
  }

  /**
   * Get moderation details
   */
  @Get(':id')
  async getModerationDetails(@Param('id') id: string) {
    const details = await this.moderationService.getModerationDetails(id);
    return {
      success: true,
      moderation: details,
    };
  }

  /**
   * Approve document
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { notes?: string },
  ) {
    await this.moderationService.approveDocument(id, req.user.sub, body.notes);
    return {
      success: true,
      message: 'Document approved successfully',
    };
  }

  /**
   * Reject document
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDocument(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { reason: string; notes?: string },
  ) {
    await this.moderationService.rejectDocument(id, req.user.sub, body.reason, body.notes);
    return {
      success: true,
      message: 'Document rejected successfully',
    };
  }

  /**
   * Request changes
   */
  @Post(':id/request-changes')
  @HttpCode(HttpStatus.OK)
  async requestChanges(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { changes: string; notes?: string },
  ) {
    await this.moderationService.requestChanges(id, req.user.sub, body.changes, body.notes);
    return {
      success: true,
      message: 'Changes requested successfully',
    };
  }

  /**
   * Re-extract diagrams for a document
   * Triggers diagram extraction for all questions with visual content
   * TEMPORARILY NO AUTH FOR TESTING
   */
  @Post('documents/:documentId/re-extract-diagrams')
  @HttpCode(HttpStatus.OK)
  async reExtractDiagrams(@Param('documentId') documentId: string) {
    const result = await this.moderationService.reExtractDiagramsForDocument(documentId);
    return {
      success: result.success,
      processed: result.processed,
      message: result.success 
        ? `Successfully processed ${result.processed} questions` 
        : result.error,
    };
  }
}
