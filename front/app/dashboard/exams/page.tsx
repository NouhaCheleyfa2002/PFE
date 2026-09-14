"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock,
  Award,
  PlayCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";
import { InteractiveExamTaker } from "@/components/exam/InteractiveExamTaker";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  examSubject: string;
  examClassLevel: string;
  status: 'in_progress' | 'submitted' | 'abandoned';
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  percentage: number;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

export default function ExamsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    fetchMyAttempts();
    
    // Check for examId and mode query parameters
    const params = new URLSearchParams(window.location.search);
    const examId = params.get('examId');
    const mode = params.get('mode');
    
    if (examId && mode === 'practice') {
      // Auto-open exam in practice mode
      setSelectedExamId(examId);
      setPracticeMode(true);
    }
  }, []);

  const fetchMyAttempts = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/exams/student/my-attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAttempts(data.attempts || []);
      }
    } catch (error) {
      console.error("Failed to fetch attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  const user = authService.getUser();

  const startExam = (examId: string) => {
    setSelectedExamId(examId);
    setPracticeMode(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  // Separate ongoing and completed attempts
  const ongoingAttempts = attempts.filter(a => a.status === 'in_progress');
  const completedAttempts = attempts.filter(a => a.status === 'submitted');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8" />
          <h1 className="text-3xl font-bold">My Exams & Practice</h1>
        </div>
        <p className="text-indigo-100">
          Track your progress and practice with interactive exams
        </p>
      </div>

      {/* My Exams & Progress Section */}
      <div className="space-y-6">
          {/* Ongoing Attempts */}
          {ongoingAttempts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                In Progress
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ongoingAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="bg-white rounded-xl border-2 border-blue-200 p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-1">{attempt.examTitle}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{attempt.examSubject}</span>
                          <span>•</span>
                          <span>{attempt.examClassLevel}</span>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        In Progress
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold">{attempt.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${attempt.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {attempt.answeredQuestions} of {attempt.totalQuestions} questions answered
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedExamId(attempt.examId);
                        setPracticeMode(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Continue Exam
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Attempts */}
          {completedAttempts.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Completed Exams
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-1">{attempt.examTitle}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>{attempt.examSubject}</span>
                          <span>•</span>
                          <span>{attempt.examClassLevel}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        attempt.percentage >= 80
                          ? 'bg-green-100 text-green-700'
                          : attempt.percentage >= 60
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {attempt.percentage}%
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <div className="font-bold text-slate-900">{attempt.percentage}%</div>
                        <div className="text-xs text-slate-600">Score</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <div className="font-bold text-slate-900">
                          {attempt.score !== null && attempt.maxScore !== null
                            ? `${Math.round(attempt.score)}/${Math.round(attempt.maxScore)}`
                            : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-600">Points</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <div className="font-bold text-slate-900">
                          {Math.floor(attempt.timeSpentSeconds / 60)}m
                        </div>
                        <div className="text-xs text-slate-600">Time</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mb-3">
                      Completed {new Date(attempt.submittedAt!).toLocaleDateString()}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedExamId(attempt.examId);
                        setPracticeMode(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Practice Again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No attempts yet */}
          {attempts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No exam attempts yet
              </h3>
              <p className="text-slate-600 mb-4">
                Start taking exams from the library to track your progress here
              </p>
            </div>
          )}
        </div>

      {/* Exam Viewer Modal for Students */}
      {selectedExamId && practiceMode && (
        // Fullscreen Interactive Exam Taker
        <div className="fixed inset-0 z-50 bg-white">
          <InteractiveExamTaker
            examId={selectedExamId}
            examTitle="Practice Exam"
            duration={undefined}
            onClose={() => {
              setSelectedExamId(null);
              setPracticeMode(false);
              // Clear URL parameters
              window.history.replaceState({}, '', '/dashboard/exams');
              // Refresh attempts list
              fetchMyAttempts();
            }}
            isOwner={false}
          />
        </div>
      )}
    </div>
  );
}
