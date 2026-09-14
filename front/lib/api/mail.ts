import { authService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface EmailPreferences {
  id: string;
  userId: string;
  // Authentication emails
  welcomeEmails: boolean;
  securityAlerts: boolean;
  passwordChangedEmails: boolean;
  // Verification emails (teachers only)
  verificationStatusEmails: boolean;
  // Resource/Document emails
  resourceModerationEmails: boolean;
  resourceApprovedEmails: boolean;
  // Collaboration emails
  collaborationInvites: boolean;
  collaborationMentions: boolean;
  collaborationAcceptedEmails: boolean;
  // Purchase emails (students)
  purchaseConfirmations: boolean;
  // Sale emails (teachers)
  saleNotifications: boolean;
  // Exam emails
  examPublishedEmails: boolean;
  examSharedEmails: boolean;
  examGeneratedEmails: boolean;
  // Admin emails
  adminVerificationAlerts: boolean;
  adminModerationAlerts: boolean;
  adminReportAlerts: boolean;
  // General preferences
  marketingEmails: boolean;
  weeklyDigest: boolean;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateEmailPreferencesDto {
  welcomeEmails?: boolean;
  securityAlerts?: boolean;
  passwordChangedEmails?: boolean;
  verificationStatusEmails?: boolean;
  resourceModerationEmails?: boolean;
  resourceApprovedEmails?: boolean;
  collaborationInvites?: boolean;
  collaborationMentions?: boolean;
  collaborationAcceptedEmails?: boolean;
  purchaseConfirmations?: boolean;
  saleNotifications?: boolean;
  examPublishedEmails?: boolean;
  examSharedEmails?: boolean;
  examGeneratedEmails?: boolean;
  adminVerificationAlerts?: boolean;
  adminModerationAlerts?: boolean;
  adminReportAlerts?: boolean;
  marketingEmails?: boolean;
  weeklyDigest?: boolean;
}

export const mailApi = {
  /**
   * Get current user's email preferences
   */
  async getPreferences(): Promise<EmailPreferences> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/mail/preferences`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch email preferences');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Update current user's email preferences
   */
  async updatePreferences(preferences: UpdateEmailPreferencesDto): Promise<EmailPreferences> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/mail/preferences`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update email preferences');
    }

    const result = await response.json();
    return result.data;
  },
};
