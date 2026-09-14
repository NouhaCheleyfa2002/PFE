"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  RotateCcw,
  TrendingUp,
  Target,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface QuestionResult {
  question: {
    id: string;
    text: string;
    type: string;
    options?: string[];
    imageUrl?: string;
  };
  studentAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
}

interface SubmissionResult {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  submittedAt: string;
  results: QuestionResult[];
  exam: {
    title: string;
    subject: string;
  };
}

export default function ExamResultsPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.submissionId;
  const router = useRouter();

  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const fetchResults = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/exams/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      } else {
        toast.error("Failed to load results");
        router.push("/dashboard/exams");
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
      toast.error("Failed to load results");
      router.push("/dashboard/exams");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return "Excellent";
    if (percentage >= 80) return "Very Good";
    if (percentage >= 70) return "Good";
    if (percentage >= 60) return "Satisfactory";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Results not found</h2>
          <button
            onClick={() => router.push("/dashboard/exams")}
            className="text-blue-600 hover:underline"
          >
            Return to exams
          </button>
        </div>
      </div>
    );
  }

  const correctAnswers = submission.results.filter((r) => r.isCorrect).length;
  const totalQuestions = submission.results.length;
  const passed = submission.percentage >= 50;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div
            className={`p-8 text-white ${
              passed
                ? "bg-gradient-to-r from-green-600 to-emerald-600"
                : "bg-gradient-to-r from-orange-600 to-red-600"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Exam Complete!</h1>
                  <p className="text-white text-opacity-90">{submission.exam.title}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <p className="text-white text-opacity-80 text-sm mb-1">Score</p>
                <p className="text-2xl font-bold">
                  {submission.score}/{submission.maxScore}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <p className="text-white text-opacity-80 text-sm mb-1">Percentage</p>
                <p className="text-2xl font-bold">{submission.percentage}%</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <p className="text-white text-opacity-80 text-sm mb-1">Correct</p>
                <p className="text-2xl font-bold">
                  {correctAnswers}/{totalQuestions}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-4">
                <p className="text-white text-opacity-80 text-sm mb-1">Time</p>
                <p className="text-2xl font-bold">{formatTime(submission.timeSpent)}</p>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {getGradeLabel(submission.percentage)}
                </h2>
                <p className="text-slate-600">
                  {passed
                    ? "Congratulations! You passed the exam."
                    : "Keep practicing. You can retake this exam to improve your score."}
                </p>
              </div>
              <div className={`text-5xl font-bold ${getGradeColor(submission.percentage)}`}>
                {submission.percentage}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    passed ? "bg-green-600" : "bg-orange-600"
                  }`}
                  style={{ width: `${submission.percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>0%</span>
                <span>50% (Pass)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
              <button
                onClick={() => router.push("/dashboard/performance")}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                View Performance
              </button>
            </div>
          </div>
        </div>

        {/* Review Answers */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Review Answers</h2>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {showAnswers ? "Hide" : "Show"} Answers
            </button>
          </div>

          {showAnswers && (
            <div className="space-y-6">
              {submission.results.map((result, index) => (
                <div
                  key={result.question.id}
                  className={`border-2 rounded-xl p-6 ${
                    result.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium">
                          Question {index + 1}
                        </span>
                        {result.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <p className="text-slate-900 font-medium">{result.question.text}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${
                        result.isCorrect ? "text-green-600" : "text-red-600"
                      }`}>
                        {result.points}/{result.maxPoints} pts
                      </span>
                    </div>
                  </div>

                  {result.question.imageUrl && (
                    <img
                      src={result.question.imageUrl}
                      alt="Question"
                      className="mb-4 max-w-sm rounded-lg border border-slate-200"
                    />
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-slate-600 min-w-24">
                        Your answer:
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          result.isCorrect ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {result.studentAnswer || "(No answer)"}
                      </span>
                    </div>
                    {!result.isCorrect && (
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-slate-600 min-w-24">
                          Correct answer:
                        </span>
                        <span className="text-sm font-medium text-green-700">
                          {result.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
