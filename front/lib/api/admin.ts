import { authService } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface AdminStatistics {
  totalUsers: number;
  verifiedTeachers: number;
  totalDocuments: number;
  coursesCount: number;
  examsCount: number;
  revenue: number;
}

export interface RecentActivity {
  type: string;
  text: string;
  time: string;
  timestamp: Date;
}

export const adminApi = {
  /**
   * Get platform statistics for admin dashboard
   */
  async getStatistics(): Promise<AdminStatistics> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/admin/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch statistics');
    }

    return response.json();
  },

  /**
   * Get recent activity feed for admin dashboard
   */
  async getRecentActivity(): Promise<RecentActivity[]> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/admin/recent-activity`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch recent activity');
    }

    return response.json();
  },
};
