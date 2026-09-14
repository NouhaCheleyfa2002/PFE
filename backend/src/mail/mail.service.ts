import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailPreferencesEntity } from './entities/email-preferences.entity';
import { UpdateEmailPreferencesDto } from './dto/email-preferences.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(
    @InjectRepository(EmailPreferencesEntity)
    private emailPreferencesRepo: Repository<EmailPreferencesEntity>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('❌ SMTP connection failed:', error.message);
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"EduShare" <noreply@edushare.tn>',
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });
      this.logger.log(`📧 Email sent to ${to}: ${subject}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  // AUTHENTICATION EMAILS
  async sendWelcomeEmail(to: string, firstName: string) {
    const subject = 'Welcome to EduShare! 🎓';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🎓 Welcome to EduShare!</h1></div><div class="content"><p>Hello ${firstName},</p><p>Your account has been successfully created on EduShare.</p><a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard" class="button">Go to Dashboard</a></div><div class="footer"><p>© 2026 EduShare | Empowering Tunisian Education</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendEmailVerification(to: string, firstName: string, verificationToken: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✉️ Verify Your Email</h1></div><div class="content"><p>Hello ${firstName},</p><p>Please verify your email address:</p><a href="${verificationUrl}" class="button">Verify Email</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendPasswordReset(to: string, firstName: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🔒 Reset Password</h1></div><div class="content"><p>Hello ${firstName},</p><p>We received a request to reset your password. Click the button below to create a new password:</p><a href="${resetUrl}" class="button">Reset Password</a><p style="color:#666;font-size:14px;margin-top:20px">If you didn't request this, please ignore this email. The link will expire in 1 hour.</p></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendPasswordChanged(to: string, firstName: string) {
    const subject = 'Your Password Has Been Changed';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.alert{background:#d1fae5;padding:15px;margin:20px 0;border-left:4px solid #10b981;border-radius:5px}.button{display:inline-block;padding:12px 30px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✅ Password Changed</h1></div><div class="content"><p>Hello ${firstName},</p><div class="alert"><strong>Security Confirmation</strong><p>Your password was successfully changed on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.</p></div><p><strong>If you made this change:</strong><br>No further action is needed. Your account is secure.</p><p><strong>If you did NOT make this change:</strong><br>Your account may have been compromised. Please contact support immediately.</p><a href="${process.env.FRONTEND_URL}/support" class="button">Contact Support</a></div><div class="footer"><p>© 2026 EduShare | Security Team</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendSecurityAlert(to: string, firstName: string, loginDetails: { ip: string; location: string; device: string; time: string }) {
    const subject = '⚠️ Unusual Login Detected';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.alert{background:#fef3c7;padding:15px;margin:20px 0;border-left:4px solid #f59e0b;border-radius:5px}.details{background:#fff;padding:15px;margin:20px 0;border-radius:8px;border:1px solid #e5e7eb}.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6}.detail-row:last-child{border-bottom:none}.button{display:inline-block;padding:12px 30px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;margin:10px 5px}.button-safe{background:#10b981}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>⚠️ Security Alert</h1></div><div class="content"><p>Hello ${firstName},</p><div class="alert"><strong>We detected a login from a new device or location</strong></div><div class="details"><div class="detail-row"><strong>IP Address:</strong><span>${loginDetails.ip}</span></div><div class="detail-row"><strong>Location:</strong><span>${loginDetails.location}</span></div><div class="detail-row"><strong>Device:</strong><span>${loginDetails.device}</span></div><div class="detail-row"><strong>Time:</strong><span>${loginDetails.time}</span></div></div><p><strong>Was this you?</strong></p><p>If you recognize this activity, you can safely ignore this email.</p><p>If this wasn't you, please secure your account immediately:</p><div style="text-align:center"><a href="${process.env.FRONTEND_URL}/auth/change-password" class="button">Change Password</a><a href="${process.env.FRONTEND_URL}/support" class="button button-safe">Contact Support</a></div></div><div class="footer"><p>© 2026 EduShare | Security Team</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // TEACHER VERIFICATION
  async sendTeacherVerificationReceived(to: string, firstName: string) {
    const subject = 'Verification Request Received';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>📝 Verification Received</h1></div><div class="content"><p>Hello ${firstName},</p><p>Your verification request has been submitted. We'll review it within 1-3 business days.</p></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendTeacherVerificationApproved(to: string, firstName: string) {
    const subject = '🎉 Your Educator Account Has Been Verified!';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🎉 Verified!</h1></div><div class="content"><p>Hello ${firstName},</p><p>Your educator profile has been verified!</p><a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendTeacherVerificationRejected(to: string, firstName: string, reason: string) {
    const subject = 'Action Required: Update Your Verification Documents';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.reason{background:#fef3c7;padding:15px;margin:20px 0;border-left:4px solid #f59e0b}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>⚠️ Action Required</h1></div><div class="content"><p>Hello ${firstName},</p><div class="reason"><strong>Feedback:</strong><p>${reason}</p></div><a href="${process.env.FRONTEND_URL}/dashboard/profile/verification" class="button">Update Verification</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // RESOURCE MODERATION
  async sendResourceSubmitted(to: string, firstName: string, resourceTitle: string) {
    const subject = 'Resource Submitted for Review';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>📚 Resource Submitted</h1></div><div class="content"><p>Hello ${firstName},</p><p>Your resource <strong>${resourceTitle}</strong> has been submitted for review.</p></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendResourceApproved(to: string, firstName: string, resourceTitle: string, resourceId: string) {
    const subject = '🎉 Your Resource is Now Published!';
    const resourceUrl = `${process.env.FRONTEND_URL}/resources/${resourceId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🎉 Resource Approved!</h1></div><div class="content"><p>Hello ${firstName},</p><p>Your resource <strong>${resourceTitle}</strong> has been approved!</p><a href="${resourceUrl}" class="button">View Resource</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendResourceChangesRequested(to: string, firstName: string, resourceTitle: string, feedback: string, resourceId: string) {
    const subject = 'Changes Requested for Your Resource';
    const resourceUrl = `${process.env.FRONTEND_URL}/dashboard/resources/${resourceId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.feedback{background:#fef3c7;padding:15px;margin:20px 0;border-left:4px solid #f59e0b}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>📝 Changes Requested</h1></div><div class="content"><p>Hello ${firstName},</p><p>Resource: <strong>${resourceTitle}</strong></p><div class="feedback"><strong>Feedback:</strong><p>${feedback}</p></div><a href="${resourceUrl}" class="button">Review Resource</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // COLLABORATION
  async sendCollaborationInvitation(to: string, inviterName: string, examTitle: string, role: string, examId: string) {
    const subject = 'Collaboration Invitation';
    const examUrl = `${process.env.FRONTEND_URL}/dashboard/exam-builder/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#8b5cf6;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🤝 Collaboration Invitation</h1></div><div class="content"><p><strong>${inviterName}</strong> invited you to collaborate:</p><p><strong>${examTitle}</strong></p><p>Role: ${role}</p><a href="${examUrl}" class="button">Open Exam</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendMentionInComment(to: string, mentionerName: string, examTitle: string, comment: string, examId: string) {
    const subject = `${mentionerName} mentioned you`;
    const examUrl = `${process.env.FRONTEND_URL}/dashboard/exam-builder/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#06b6d4;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.comment{background:#cffafe;padding:15px;margin:20px 0;border-left:4px solid #06b6d4}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>💬 ${mentionerName} mentioned you</h1></div><div class="content"><p>In <strong>${examTitle}</strong>:</p><div class="comment">${comment}</div><a href="${examUrl}" class="button">View Comment</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendCollaborationAccepted(to: string, collaboratorName: string, examTitle: string, examId: string) {
    const subject = `${collaboratorName} accepted your invitation`;
    const examUrl = `${process.env.FRONTEND_URL}/dashboard/exam-builder/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✅ Accepted</h1></div><div class="content"><p><strong>${collaboratorName}</strong> accepted your invitation for:</p><p><strong>${examTitle}</strong></p><a href="${examUrl}" class="button">Open Exam</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // MARKETPLACE/PURCHASES
  async sendPurchaseConfirmation(to: string, buyerName: string, resourceTitle: string, price: number, orderId: string, resourceId: string) {
    const subject = 'Purchase Confirmation';
    const resourceUrl = `${process.env.FRONTEND_URL}/resources/${resourceId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.order{background:#d1fae5;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✅ Purchase Confirmed</h1></div><div class="content"><p>Hello ${buyerName},</p><p>Thank you for your purchase! You can now access your resource.</p><div class="order"><strong>Order #${orderId}</strong><br><strong>Resource:</strong> ${resourceTitle}<br><strong>Amount:</strong> ${price.toFixed(2)} EUR</div><a href="${resourceUrl}" class="button">Access Resource</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendSaleNotification(to: string, teacherName: string, resourceTitle: string, buyerName: string, saleAmount: number, resourceId: string) {
    const subject = '💰 New Sale!';
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/analytics`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.sale{background:#fef3c7;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>💰 New Sale!</h1></div><div class="content"><p>Hello ${teacherName},</p><p>Great news! One of your resources was just purchased.</p><div class="sale"><strong>Resource:</strong> ${resourceTitle}<br><strong>Purchased by:</strong> ${buyerName}<br><strong>Amount:</strong> ${saleAmount.toFixed(2)} EUR</div><a href="${dashboardUrl}" class="button">View Dashboard</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // EXAMS
  async sendExamGenerated(to: string, teacherName: string, examTitle: string, questionCount: number, duration: string, totalPoints: number, examId: string) {
    const subject = 'AI Exam Ready';
    const examUrl = `${process.env.FRONTEND_URL}/dashboard/exam-builder/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#8b5cf6;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.stats{background:#ede9fe;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🤖 AI Exam Ready</h1></div><div class="content"><p>Hello ${teacherName},</p><p><strong>${examTitle}</strong></p><div class="stats">${questionCount} questions<br>${duration}<br>${totalPoints} marks</div><a href="${examUrl}" class="button">Review Exam</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendExamShared(to: string, sharedByName: string, examTitle: string, examId: string) {
    const subject = `${sharedByName} shared an exam`;
    const examUrl = `${process.env.FRONTEND_URL}/dashboard/exam-builder/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#3b82f6;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>📄 Exam Shared</h1></div><div class="content"><p><strong>${sharedByName}</strong> shared:</p><p><strong>${examTitle}</strong></p><a href="${examUrl}" class="button">View Exam</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendExamPublished(to: string, teacherName: string, examTitle: string, examId: string) {
    const subject = '🎉 Exam Published!';
    const examUrl = `${process.env.FRONTEND_URL}/exams/${examId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🎉 Published!</h1></div><div class="content"><p>Hello ${teacherName},</p><p><strong>${examTitle}</strong> is now published!</p><a href="${examUrl}" class="button">View Exam</a></div><div class="footer"><p>© 2026 EduShare</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // ADMIN NOTIFICATIONS
  async sendAdminNewVerificationRequest(to: string, teacherName: string, teacherEmail: string, teacherId: string) {
    const subject = '🔔 New Verification Request';
    const verificationUrl = `${process.env.FRONTEND_URL}/dashboard/admin/verifications/${teacherId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.info{background:#fee2e2;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>🔔 New Verification</h1></div><div class="content"><div class="info"><strong>Teacher:</strong> ${teacherName}<br><strong>Email:</strong> ${teacherEmail}</div><a href="${verificationUrl}" class="button">Review</a></div><div class="footer"><p>© 2026 EduShare Admin</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  async sendAdminNewResourceModeration(to: string, teacherName: string, resourceTitle: string, subject: string, aiScore: number, resourceId: string) {
    const moderationSubject = '📚 New Resource for Moderation';
    const resourceUrl = `${process.env.FRONTEND_URL}/dashboard/admin/moderation/${resourceId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.info{background:#fef3c7;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>📚 New Resource</h1></div><div class="content"><div class="info"><strong>Teacher:</strong> ${teacherName}<br><strong>Resource:</strong> ${resourceTitle}<br><strong>Subject:</strong> ${subject}<br><strong>AI Score:</strong> ${aiScore}/100</div><a href="${resourceUrl}" class="button">Review</a></div><div class="footer"><p>© 2026 EduShare Admin</p></div></div></body></html>`;
    return this.sendEmail(to, moderationSubject, html);
  }

  async sendAdminResourceReport(to: string, reporterName: string, resourceTitle: string, reason: string, resourceId: string) {
    const subject = '⚠️ Resource Report';
    const resourceUrl = `${process.env.FRONTEND_URL}/dashboard/admin/reports/${resourceId}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;padding:12px 30px;background:#ef4444;color:white;text-decoration:none;border-radius:5px;margin:20px 0}.info{background:#fee2e2;padding:15px;margin:20px 0;border-radius:8px}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>⚠️ Report</h1></div><div class="content"><div class="info"><strong>Resource:</strong> ${resourceTitle}<br><strong>Reported by:</strong> ${reporterName}<br><strong>Reason:</strong> ${reason}</div><a href="${resourceUrl}" class="button">Review</a></div><div class="footer"><p>© 2026 EduShare Admin</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // TEST EMAIL
  async sendTestEmail(to: string) {
    const subject = 'EduShare SMTP Test ✅';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.success{background:#d1fae5;padding:15px;margin:20px 0;border-left:4px solid #10b981}.footer{text-align:center;margin-top:30px;color:#666;font-size:12px}</style></head><body><div class="container"><div class="header"><h1>✅ SMTP Test!</h1></div><div class="content"><div class="success"><strong>Success!</strong><p>Your email system is working.</p></div><p><strong>Configuration:</strong></p><ul><li>Host: ${process.env.SMTP_HOST}</li><li>Port: ${process.env.SMTP_PORT}</li></ul></div><div class="footer"><p>© 2026 EduShare | Test email at ${new Date().toLocaleString()}</p></div></div></body></html>`;
    return this.sendEmail(to, subject, html);
  }

  // EMAIL PREFERENCES MANAGEMENT
  async getPreferences(userId: string): Promise<EmailPreferencesEntity> {
    let preferences = await this.emailPreferencesRepo.findOne({ where: { userId } });
    
    // If user doesn't have preferences yet, create with defaults
    if (!preferences) {
      preferences = this.emailPreferencesRepo.create({ userId });
      preferences = await this.emailPreferencesRepo.save(preferences);
      this.logger.log(`Created default email preferences for user ${userId}`);
    }
    
    return preferences;
  }

  async updatePreferences(userId: string, dto: UpdateEmailPreferencesDto): Promise<EmailPreferencesEntity> {
    let preferences = await this.emailPreferencesRepo.findOne({ where: { userId } });
    
    if (!preferences) {
      // Create new preferences with provided values
      preferences = this.emailPreferencesRepo.create({ userId, ...dto });
    } else {
      // Update existing preferences
      Object.assign(preferences, dto);
    }
    
    preferences = await this.emailPreferencesRepo.save(preferences);
    this.logger.log(`Updated email preferences for user ${userId}`);
    
    return preferences;
  }

  private async checkPreference(userId: string, preferenceKey: keyof EmailPreferencesEntity): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);
      return preferences[preferenceKey] as boolean;
    } catch (error) {
      this.logger.warn(`Failed to check preference ${preferenceKey} for user ${userId}, defaulting to true`);
      return true; // Default to sending email if check fails
    }
  }

  // HELPER: Check if user wants this type of email before sending
  async shouldSendEmail(userId: string, emailType: keyof EmailPreferencesEntity): Promise<boolean> {
    return this.checkPreference(userId, emailType);
  }
}
