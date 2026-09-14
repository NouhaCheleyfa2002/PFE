"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  points: number;
  imageUrl?: string;
}

interface ExamData {
  examId: string;
  title: string;
  duration: string;
  instructions: string;
  questions: Question[];
  maxPoints: number;
  startedAt: string;
}

export default function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    startExam();
  }, [examId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const startExam = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/exams/${examId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExam(data);
        
        // Parse duration (e.g., "60 minutes" -> 3600 seconds)
        const durationMatch = data.duration?.match(/(\d+)/);
        const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
        setTimeRemaining(durationMinutes * 60);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to start exam");
        router.push("/dashboard/exams");
      }
    } catch (error) {
      console.error("Failed to start exam:", error);
      toast.error("Failed to start exam");
      router.push("/dashboard/exams");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleAutoSubmit = async () => {
    toast.error("Time's up! Submitting your exam...");
    await submitExam();
  };

  const submitExam = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    const startTime = exam?.startedAt ? new Date(exam.startedAt).getTime() : Date.now();
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/exams/${examId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers, timeSpent }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Exam submitted successfully!");
        router.push(`/dashboard/exams/results/${result.submissionId}`);
      } else {
        throw new Error("Submission failed");
      }
    } catch (error) {
      console.error("Failed to submit exam:", error);
      toast.error("Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeRemaining > 300) return "text-green-600";
    if (timeRemaining > 60) return "text-yellow-600";
    return "text-red-600 animate-pulse";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Exam not found
          </h2>
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

  const currentQuestion = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = exam.questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 shadow-sm z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{exam.title}</h1>
              <p className="text-sm text-slate-600">
                Question {currentQuestionIndex + 1} of {exam.questions.length}
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className={`flex items-center gap-2 ${getTimeColor()} font-mono text-xl font-bold`}>
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Exam"}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                      Question {currentQuestionIndex + 1}
                    </span>
                    <span className="text-sm text-slate-600">
                      {currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"}
                    </span>
                  </div>
                  <p className="text-lg text-slate-900 leading-relaxed">
                    {currentQuestion.text}
                  </p>
                </div>

                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    flagged.has(currentQuestion.id)
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-slate-100 text-slate-400 hover:text-slate-600"
                  }`}
                  title="Flag for review"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>

              {currentQuestion.imageUrl && (
                <div className="mb-6">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question"
                    className="max-w-full h-auto rounded-lg border border-slate-200"
                  />
                </div>
              )}

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.type === "multiple-choice" &&
                  currentQuestion.options?.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    const isSelected = answers[currentQuestion.id] === optionLetter;

                    return (
                      <label
                        key={index}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          checked={isSelected}
                          onChange={() => handleAnswer(currentQuestion.id, optionLetter)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-700">
                            {optionLetter}
                          </span>
                          <span className="text-slate-900">{option}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                      </label>
                    );
                  })}

                {currentQuestion.type === "true-false" && (
                  <>
                    {["True", "False"].map((option) => {
                      const isSelected = answers[currentQuestion.id] === option;
                      return (
                        <label
                          key={option}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            checked={isSelected}
                            onChange={() => handleAnswer(currentQuestion.id, option)}
                            className="w-5 h-5 text-blue-600"
                          />
                          <span className="text-slate-900 flex-1">{option}</span>
                          {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                        </label>
                      );
                    })}
                  </>
                )}

                {currentQuestion.type === "short-answer" && (
                  <textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                    rows={4}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(exam.questions.length - 1, prev + 1))
                  }
                  disabled={currentQuestionIndex === exam.questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-36">
              <h3 className="font-semibold text-slate-900 mb-4">Questions</h3>
              
              <div className="grid grid-cols-5 gap-2 mb-4">
                {exam.questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flagged.has(q.id);
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : isAnswered
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {index + 1}
                      {isFlagged && (
                        <Flag className="w-3 h-3 absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Answered:</span>
                  <span className="font-semibold text-green-600">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Unanswered:</span>
                  <span className="font-semibold text-slate-900">{unansweredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Flagged:</span>
                  <span className="font-semibold text-yellow-600">{flagged.size}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Submit Exam?</h2>
              <p className="text-slate-600 mb-6">
                You have answered {answeredCount} out of {exam.questions.length} questions.
                {unansweredCount > 0 && (
                  <span className="block mt-2 text-yellow-600 font-medium">
                    {unansweredCount} question{unansweredCount !== 1 ? "s" : ""} left unanswered.
                  </span>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Review Answers
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    submitExam();
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
