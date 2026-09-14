import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseEntity } from '../purchases/entities/purchase.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { DocumentStatus } from '../documents/document.interface';
import { ExamAttemptEntity } from '../exams/entities/exam-attempt.entity';
import { BookmarkEntity } from '../bookmarks/entities/bookmark.entity';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private readonly purchaseRepository: Repository<PurchaseEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(ExamAttemptEntity)
    private readonly examAttemptRepository: Repository<ExamAttemptEntity>,
    @InjectRepository(BookmarkEntity)
    private readonly bookmarkRepository: Repository<BookmarkEntity>,
  ) {}

  async getHomeData(userId: string) {
    // Get purchased resources
    const purchases = await this.purchaseRepository.find({
      where: { userId, status: 'completed' },
      relations: ['document'],
      order: { createdAt: 'DESC' },
    });

    // Get exam attempts for progress calculation
    const examAttempts = await this.examAttemptRepository.find({
      where: { studentId: userId },
      order: { startedAt: 'DESC' },
    });

    // Calculate progress summary
    const resourcesOwned = purchases.length;
    const completedAttempts = examAttempts.filter(a => a.status === 'submitted');
    const examsCompleted = completedAttempts.length;
    
    // Calculate average score
    const scoresWithValues = completedAttempts
      .map(a => a.score)
      .filter(score => score !== null && score !== undefined);
    const averageScore = scoresWithValues.length > 0
      ? Math.round(scoresWithValues.reduce((sum, score) => sum + score, 0) / scoresWithValues.length)
      : 0;

    // Calculate study activity (last 7 days)
    const studyActivity = this.calculateStudyActivity(examAttempts);

    // Calculate current streak
    const currentStreak = this.calculateStreak(examAttempts);

    // Get continue learning resources (recently purchased)
    const continueResources = await Promise.all(
      purchases.slice(0, 3).map(async (purchase) => {
        const document = purchase.document;
        if (!document) return null;

        // Calculate progress based on exam attempts for this document
        const documentAttempts = examAttempts.filter(
          a => a.examId === document.id
        );
        const progress = documentAttempts.length > 0 
          ? Math.min(100, documentAttempts.length * 25) // 25% per attempt, max 100%
          : 10; // 10% for just owning it

        return {
          id: document.id,
          title: document.title || document.originalName || 'Untitled',
          subject: document.subject || 'General',
          progress,
          lastStudied: this.formatTimeAgo(purchase.createdAt),
        };
      })
    );

    return {
      continueResources: continueResources.filter(r => r !== null),
      progress: {
        resourcesOwned,
        examsCompleted,
        averageScore,
        overallProgress: this.calculateOverallProgress(purchases, examAttempts),
      },
      studyActivity,
      currentStreak,
    };
  }

  async getRecommendations(userId: string) {
    try {
      // Get library documents (both free and paid) - use find() instead of query builder
      const recommendations = await this.documentRepository.find({
        where: {
          status: DocumentStatus.COMPLETED,
          verificationStatus: 'approved',
        },
        order: {
          createdAt: 'DESC', // Remove averageRating from order to avoid errors if column doesn't exist
        },
        take: 6,
      });

      console.log(`[StudentService] Found ${recommendations.length} recommendations`);

      const resources = recommendations.map(doc => ({
        id: doc.id,
        title: doc.title || doc.originalName || 'Untitled',
        subject: doc.subject || 'General',
        rating: Number(doc.averageRating) || 0,
        reviews: Number(doc.totalRatings) || 0,
        price: Number(doc.price) || 0,
        license: doc.license || 'free',
        isFree: doc.license === 'free',
      }));

      console.log(`[StudentService] Returning ${resources.length} resources, free count:`, resources.filter(r => r.isFree).length);

      return { resources };
    } catch (error) {
      console.error('[StudentService] Error in getRecommendations:', error);
      // Return empty array on error instead of crashing
      return { resources: [] };
    }
  }

  async getPerformance(userId: string) {
    // Get all exam attempts
    const attempts = await this.examAttemptRepository.find({
      where: { studentId: userId, status: 'submitted' },
      relations: ['exam'],
    });

    console.log(`[StudentService] Found ${attempts.length} exam attempts for user ${userId}`);

    // Group by subject and calculate average scores
    const subjectScores = new Map<string, number[]>();
    
    for (const attempt of attempts) {
      if (attempt.score !== null && attempt.score !== undefined) {
        let subject = 'General';
        
        // Try to get subject from exam relation
        if (attempt.exam?.subject) {
          subject = attempt.exam.subject;
        } else {
          // If no exam, try to load the document (for document-based practice)
          try {
            const document = await this.documentRepository.findOne({
              where: { id: attempt.examId },
            });
            if (document?.subject) {
              subject = document.subject;
            }
          } catch (error) {
            console.error(`[StudentService] Failed to load document for attempt ${attempt.id}:`, error);
          }
        }
        
        if (!subjectScores.has(subject)) {
          subjectScores.set(subject, []);
        }
        subjectScores.get(subject)!.push(attempt.score);
        console.log(`[StudentService] Added score ${attempt.score} for subject ${subject}`);
      }
    }

    console.log(`[StudentService] Subject scores map:`, Array.from(subjectScores.entries()));

    // Calculate average for each subject
    const subjects = Array.from(subjectScores.entries()).map(([subject, scores], index) => {
      const average = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
      const colors = ['blue', 'purple', 'green', 'orange', 'pink', 'indigo'];
      return {
        subject,
        score: average,
        color: colors[index % colors.length],
      };
    });

    console.log(`[StudentService] Returning ${subjects.length} subjects`);

    // Only return "no data" message if truly no attempts exist
    if (subjects.length === 0 && attempts.length === 0) {
      return {
        subjects: [
          { subject: 'No performance data yet', score: 0, color: 'gray' },
        ],
      };
    }

    // If we have attempts but no subjects (shouldn't happen with above logic), show a message
    if (subjects.length === 0) {
      return {
        subjects: [
          { subject: 'Practice more to see results', score: 0, color: 'blue' },
        ],
      };
    }

    return { subjects };
  }

  async getAiInsights(userId: string) {
    // Get recent exam attempts
    const recentAttempts = await this.examAttemptRepository.find({
      where: { studentId: userId, status: 'submitted' },
      order: { startedAt: 'DESC' },
      take: 5,
    });

    if (recentAttempts.length === 0) {
      return {
        insight: "Welcome to your learning dashboard! Start by exploring resources and taking practice exams to track your progress.",
      };
    }

    // Calculate recent average
    const recentScores = recentAttempts
      .map(a => a.score)
      .filter((s): s is number => s !== null && s !== undefined);
    
    const recentAverage = recentScores.length > 0
      ? Math.round(recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length)
      : 0;

    // Generate insight based on performance
    let insight = '';
    if (recentAverage >= 80) {
      insight = `Excellent work! Your recent average of ${recentAverage}% shows strong understanding. Keep challenging yourself with more advanced materials.`;
    } else if (recentAverage >= 60) {
      insight = `You're making good progress with ${recentAverage}% average. Focus on reviewing areas where you struggled to boost your scores even higher.`;
    } else {
      insight = `Your recent average is ${recentAverage}%. Consider reviewing the fundamentals and practicing more to improve your understanding of the material.`;
    }

    return { insight };
  }

  async addFreeResourceToLibrary(userId: string, resourceId: string) {
    // Check if resource exists and is free
    const document = await this.documentRepository.findOne({
      where: { id: resourceId },
    });

    if (!document) {
      throw new Error('Resource not found');
    }

    if (document.license !== 'free') {
      throw new Error('This resource is not free. Please purchase it from the marketplace.');
    }

    // Check if already in library (purchased)
    const existingPurchase = await this.purchaseRepository.findOne({
      where: { userId, documentId: resourceId },
    });

    if (existingPurchase) {
      return {
        success: true,
        message: 'Resource already in your library',
        alreadyAdded: true,
      };
    }

    // Create a "free purchase" record
    const purchase = this.purchaseRepository.create({
      userId,
      documentId: resourceId,
      amount: 0,
      status: 'completed',
      paymentMethod: 'free',
    });

    await this.purchaseRepository.save(purchase);

    return {
      success: true,
      message: 'Resource added to your library successfully!',
      alreadyAdded: false,
    };
  }

  private calculateStudyActivity(attempts: ExamAttemptEntity[]): Array<{ date: string; hours: number }> {
    const last7Days: Array<{ date: string; hours: number }> = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Count attempts on this day (rough estimate: 0.5 hours per attempt)
      const dayAttempts = attempts.filter(a => {
        const attemptDate = new Date(a.startedAt);
        return attemptDate.toDateString() === date.toDateString();
      });
      
      last7Days.push({
        date: dateStr,
        hours: dayAttempts.length * 0.5, // Estimate 30 min per attempt
      });
    }
    
    return last7Days;
  }

  private calculateStreak(attempts: ExamAttemptEntity[]): number {
    if (attempts.length === 0) return 0;

    // Sort attempts by date
    const sortedAttempts = attempts
      .map(a => new Date(a.startedAt))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there's activity today or yesterday
    const lastActivity = sortedAttempts[0];
    lastActivity.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) return 0; // Streak broken

    // Count consecutive days
    let currentDate = new Date(lastActivity);
    const activityDates = new Set(
      sortedAttempts.map(d => d.toDateString())
    );

    while (activityDates.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private calculateOverallProgress(purchases: any[], attempts: ExamAttemptEntity[]): number {
    if (purchases.length === 0) return 0;

    // Simple formula: (attempts / purchases) * 100, capped at 100
    const progressPercentage = Math.min(100, Math.round((attempts.length / purchases.length) * 50));
    return progressPercentage;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  }
}
