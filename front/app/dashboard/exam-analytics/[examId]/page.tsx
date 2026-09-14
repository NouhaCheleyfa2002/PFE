"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Brain,
} from "lucide-react";
import { authService } from "@/lib/auth";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  stats: {
    totalAnswers: number;
    correctAnswers: number;
    incorrectAnswers: number;
    pendingGrading: number;
    correctPercentage: number;
    difficulty: "easy" | "medium" | "hard" | "very_hard";
  };
}

interface Analytics {
  examId: string;
  examTitle: string;
  overview: {
    totalAttempts: number;
    uniqueStudents: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    averageTimeSpent: number;
    totalQuestions: number;
  };
  questionAnalytics: QuestionAnalytics[];
  mostMissedQuestions: Array<{
    questionText: string;
    correctPercentage: number;
    totalAnswers: number;
  }>;
  recentAttempts: Array<{
    studentName: string;
    score: number;
    timeSpent: number;
    submittedAt: string;
  }>;
}

export default function ExamAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [examId]);

  const loadAnalytics = async () => {
    const token = authService.getToken();
    if (!token) {
      toast.error("Please login to view analytics");
      router.push("/auth/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/exams/${examId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      setError(err.message || "Failed to load analytics");
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-orange-100 text-orange-700";
      case "very_hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error || "Analytics not available"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{analytics.examTitle}</h1>
              <p className="text-gray-600 mt-1">Exam Analytics & Insights</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{analytics.overview.uniqueStudents}</span>
            </div>
            <p className="text-sm text-gray-600">Unique Students</p>
            <p className="text-xs text-gray-500 mt-1">{analytics.overview.totalAttempts} total attempts</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">{analytics.overview.averageScore}%</span>
            </div>
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-xs text-gray-500 mt-1">
              Min: {analytics.overview.minScore}% • Max: {analytics.overview.maxScore}%
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(analytics.overview.averageTimeSpent / 60)}m
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg. Time Spent</p>
            <p className="text-xs text-gray-500 mt-1">{formatTime(analytics.overview.averageTimeSpent)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">{analytics.overview.totalQuestions}</span>
            </div>
            <p className="text-sm text-gray-600">Total Questions</p>
            <p className="text-xs text-gray-500 mt-1">Interactive exam</p>
          </div>
        </div>

        {/* Most Missed Questions */}
        {analytics.mostMissedQuestions.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Most Challenging Questions
            </h2>
            <div className="space-y-4">
              {analytics.mostMissedQuestions.map((q, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-red-700">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium mb-1">{q.questionText}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600 font-semibold">{q.correctPercentage}% correct</span>
                      <span className="text-gray-500">{q.totalAnswers} answers</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-by-Question Analytics */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Question Performance
          </h2>
          <div className="space-y-4">
            {analytics.questionAnalytics.map((q, index) => (
              <div key={q.questionId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-900">Q{index + 1}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(q.stats.difficulty)}`}>
                        {q.stats.difficulty.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-500">{q.questionType.toUpperCase()}</span>
                      <span className="text-sm text-gray-500">{q.points} pts</span>
                    </div>
                    <p className="text-gray-700">{q.questionText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{q.stats.totalAnswers}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="w-5 h-5" />
                      {q.stats.correctAnswers}
                    </div>
                    <div className="text-xs text-gray-500">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                      <XCircle className="w-5 h-5" />
                      {q.stats.incorrectAnswers}
                    </div>
                    <div className="text-xs text-gray-500">Incorrect</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{q.stats.correctPercentage}%</div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${q.stats.correctPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Attempts */}
        {analytics.recentAttempts.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Attempts</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentAttempts.map((attempt, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{attempt.studentName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          attempt.score >= 80 ? 'bg-green-100 text-green-700'
                          : attempt.score >= 60 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatTime(attempt.timeSpent)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(attempt.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
