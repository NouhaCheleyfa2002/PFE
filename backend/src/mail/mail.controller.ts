import { Controller, Post, Body, UseGuards, Get, Query, Put, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MailService } from './mail.service';
import { UpdateEmailPreferencesDto } from './dto/email-preferences.dto';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  // Test endpoint (admin only)
  @Get('test')
  @Roles('admin')
  async sendTestEmail(@Query('email') email: string) {
    if (!email) {
      return { error: 'Email parameter is required' };
    }

    try {
      await this.mailService.sendTestEmail(email);
      return {
        success: true,
        message: `Test email sent to ${email}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Manual email trigger endpoints (for testing/admin use)
  @Post('welcome')
  @Roles('admin')
  async sendWelcome(@Body() body: { email: string; firstName: string }) {
    await this.mailService.sendWelcomeEmail(body.email, body.firstName);
    return { success: true };
  }

  @Post('email-verification')
  @Roles('admin')
  async sendEmailVerification(
    @Body() body: { email: string; firstName: string; verificationToken: string }
  ) {
    await this.mailService.sendEmailVerification(body.email, body.firstName, body.verificationToken);
    return { success: true };
  }

  @Post('password-reset')
  @Roles('admin')
  async sendPasswordReset(
    @Body() body: { email: string; firstName: string; resetToken: string }
  ) {
    await this.mailService.sendPasswordReset(body.email, body.firstName, body.resetToken);
    return { success: true };
  }

  @Post('password-changed')
  @Roles('admin')
  async sendPasswordChanged(@Body() body: { email: string; firstName: string }) {
    await this.mailService.sendPasswordChanged(body.email, body.firstName);
    return { success: true };
  }

  @Post('security-alert')
  @Roles('admin')
  async sendSecurityAlert(
    @Body() body: { email: string; firstName: string; loginDetails: { ip: string; location: string; device: string; time: string } }
  ) {
    await this.mailService.sendSecurityAlert(body.email, body.firstName, body.loginDetails);
    return { success: true };
  }

  @Post('verification-received')
  @Roles('admin')
  async sendVerificationReceived(@Body() body: { email: string; firstName: string }) {
    await this.mailService.sendTeacherVerificationReceived(body.email, body.firstName);
    return { success: true };
  }

  @Post('verification-approved')
  @Roles('admin')
  async sendVerificationApproved(@Body() body: { email: string; firstName: string }) {
    await this.mailService.sendTeacherVerificationApproved(body.email, body.firstName);
    return { success: true };
  }

  @Post('verification-rejected')
  @Roles('admin')
  async sendVerificationRejected(
    @Body() body: { email: string; firstName: string; reason: string }
  ) {
    await this.mailService.sendTeacherVerificationRejected(body.email, body.firstName, body.reason);
    return { success: true };
  }

  @Post('resource-approved')
  @Roles('admin')
  async sendResourceApproved(
    @Body() body: { email: string; firstName: string; resourceTitle: string; resourceId: string }
  ) {
    await this.mailService.sendResourceApproved(
      body.email,
      body.firstName,
      body.resourceTitle,
      body.resourceId
    );
    return { success: true };
  }

  @Post('resource-changes-requested')
  @Roles('admin')
  async sendResourceChangesRequested(
    @Body() body: { email: string; firstName: string; resourceTitle: string; feedback: string; resourceId: string }
  ) {
    await this.mailService.sendResourceChangesRequested(
      body.email,
      body.firstName,
      body.resourceTitle,
      body.feedback,
      body.resourceId
    );
    return { success: true };
  }

  // Collaboration emails
  @Post('collaboration-invitation')
  @Roles('admin')
  async sendCollaborationInvitation(
    @Body() body: { email: string; inviterName: string; examTitle: string; role: string; examId: string }
  ) {
    await this.mailService.sendCollaborationInvitation(
      body.email,
      body.inviterName,
      body.examTitle,
      body.role,
      body.examId
    );
    return { success: true };
  }

  @Post('mention-in-comment')
  @Roles('admin')
  async sendMentionInComment(
    @Body() body: { email: string; mentionerName: string; examTitle: string; comment: string; examId: string }
  ) {
    await this.mailService.sendMentionInComment(
      body.email,
      body.mentionerName,
      body.examTitle,
      body.comment,
      body.examId
    );
    return { success: true };
  }

  @Post('collaboration-accepted')
  @Roles('admin')
  async sendCollaborationAccepted(
    @Body() body: { email: string; collaboratorName: string; examTitle: string; examId: string }
  ) {
    await this.mailService.sendCollaborationAccepted(
      body.email,
      body.collaboratorName,
      body.examTitle,
      body.examId
    );
    return { success: true };
  }

  // Purchase/Marketplace emails
  @Post('purchase-confirmation')
  @Roles('admin')
  async sendPurchaseConfirmation(
    @Body() body: { email: string; studentName: string; resourceTitle: string; price: number; orderId: string; resourceId: string }
  ) {
    await this.mailService.sendPurchaseConfirmation(
      body.email,
      body.studentName,
      body.resourceTitle,
      body.price,
      body.orderId,
      body.resourceId
    );
    return { success: true };
  }

  @Post('sale-notification')
  @Roles('admin')
  async sendSaleNotification(
    @Body() body: { email: string; teacherName: string; resourceTitle: string; buyerName: string; saleAmount: number; resourceId: string }
  ) {
    await this.mailService.sendSaleNotification(
      body.email,
      body.teacherName,
      body.resourceTitle,
      body.buyerName,
      body.saleAmount,
      body.resourceId
    );
    return { success: true };
  }

  // Exam emails
  @Post('exam-generated')
  @Roles('admin')
  async sendExamGenerated(
    @Body() body: { email: string; teacherName: string; examTitle: string; questionCount: number; duration: string; totalPoints: number; examId: string }
  ) {
    await this.mailService.sendExamGenerated(
      body.email,
      body.teacherName,
      body.examTitle,
      body.questionCount,
      body.duration,
      body.totalPoints,
      body.examId
    );
    return { success: true };
  }

  @Post('exam-shared')
  @Roles('admin')
  async sendExamShared(
    @Body() body: { email: string; sharedByName: string; examTitle: string; examId: string }
  ) {
    await this.mailService.sendExamShared(
      body.email,
      body.sharedByName,
      body.examTitle,
      body.examId
    );
    return { success: true };
  }

  @Post('exam-published')
  @Roles('admin')
  async sendExamPublished(
    @Body() body: { email: string; teacherName: string; examTitle: string; examId: string }
  ) {
    await this.mailService.sendExamPublished(
      body.email,
      body.teacherName,
      body.examTitle,
      body.examId
    );
    return { success: true };
  }

  // Admin notification emails
  @Post('admin/new-verification')
  @Roles('admin')
  async sendAdminNewVerification(
    @Body() body: { email: string; teacherName: string; teacherEmail: string; teacherId: string }
  ) {
    await this.mailService.sendAdminNewVerificationRequest(
      body.email,
      body.teacherName,
      body.teacherEmail,
      body.teacherId
    );
    return { success: true };
  }

  @Post('admin/new-resource-moderation')
  @Roles('admin')
  async sendAdminNewResourceModeration(
    @Body() body: { email: string; teacherName: string; resourceTitle: string; subject: string; aiScore: number; resourceId: string }
  ) {
    await this.mailService.sendAdminNewResourceModeration(
      body.email,
      body.teacherName,
      body.resourceTitle,
      body.subject,
      body.aiScore,
      body.resourceId
    );
    return { success: true };
  }

  @Post('admin/resource-report')
  @Roles('admin')
  async sendAdminResourceReport(
    @Body() body: { email: string; reporterName: string; resourceTitle: string; reason: string; resourceId: string }
  ) {
    await this.mailService.sendAdminResourceReport(
      body.email,
      body.reporterName,
      body.resourceTitle,
      body.reason,
      body.resourceId
    );
    return { success: true };
  }

  // EMAIL PREFERENCES ENDPOINTS
  @Get('preferences')
  async getEmailPreferences(@Req() req: any) {
    const userId = req.user.id;
    const preferences = await this.mailService.getPreferences(userId);
    return {
      success: true,
      data: preferences,
    };
  }

  @Put('preferences')
  async updateEmailPreferences(@Req() req: any, @Body() dto: UpdateEmailPreferencesDto) {
    const userId = req.user.id;
    const preferences = await this.mailService.updatePreferences(userId, dto);
    return {
      success: true,
      message: 'Email preferences updated successfully',
      data: preferences,
    };
  }
}
