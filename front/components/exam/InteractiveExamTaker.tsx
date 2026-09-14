"use client";

import React, { useState, useEffect } from "react";
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertCircle, Brain, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  questionData: {
    options?: string[];
    correctAnswer?: string;
    blanks?: string[];
    explanation?: string;
  };
  orderIndex: number;
  points: number;
}

interface InteractiveExamTakerProps {
  examId: string;
  examTitle: string;
  duration?: string;
  onClose?: () => void;
  isOwner?: boolean; // Add flag to know if user is owner
}

export function InteractiveExamTaker({ examId, examTitle, duration, onClose, isOwner = false }: InteractiveExamTakerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOwner) {
      // Owner preview mode - load questions directly without starting attempt
      loadQuestionsForPreview();
    } else {
      // Student mode - try to start exam attempt, fallback to preview for documents
      startExamAttemptOrPreview();
    }
  }, [examId, isOwner]);

  const startExamAttemptOrPreview = async () => {
    const token = authService.getToken();
    if (!token) {
      toast.error("Please login to take the exam");
      return;
    }

    try {
      setLoading(true);

      // Try to start an exam attempt (for AI-generated exams)
      const response = await fetch(`${API_URL}/exam-attempts/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ examId }),
      });

      if (response.ok) {
        // Exam attempt started successfully
        const data = await response.json();
        setAttemptId(data.attemptId);
        setQuestions(data.questions);

        // Set timer if duration specified
        if (duration) {
          const minutes = parseInt(duration);
          if (!isNaN(minutes)) {
            setTimeLeft(minutes * 60);
          }
        }

        toast.success("Exam started! Good luck! 🎯");
      } else if (response.status === 404) {
        // Exam not found in exam-attempts system, likely an uploaded document
        // Fall back to preview mode (load questions directly)
        console.log('[InteractiveExamTaker] Exam attempt not available, loading as document preview');
        await loadQuestionsForPreview();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to start exam");
      }
    } catch (error: any) {
      console.error("Failed to start exam:", error);
      toast.error(error.message || "Failed to load exam");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForPreview = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      setLoading(true);
      
      // Try to fetch from exams table first (built exams)
      let response = await fetch(`${API_URL}/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let examData: any = null;

      // If not found in exams, try documents table (uploaded PDFs with extracted questions)
      if (!response.ok && response.status === 404) {
        console.log('[InteractiveExamTaker] Not found in exams, trying documents...');
        response = await fetch(`${API_URL}/documents/${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const docData = await response.json();
          
          // Fetch extracted questions for this document
          const questionsResponse = await fetch(`${API_URL}/exam-questions/document/${examId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          let extractedQuestions: any[] = [];
          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            extractedQuestions = questionsData.questions || questionsData || [];
          }

          examData = {
            questions: extractedQuestions,
            title: docData.title || docData.originalName,
          };
        }
      } else if (response.ok) {
        examData = await response.json();
      }

      if (!examData) {
        throw new Error("Failed to load exam for preview");
      }
      
      // Transform questions to match expected format
      const transformedQuestions = (examData.questions || []).map((q: any, index: number) => {
        // Debug log to see what data we're receiving
        if (index === 0) {
          console.log('[InteractiveExamTaker] Sample question structure:', {
            id: q.id,
            text: q.text?.substring(0, 50),
            questionText: q.questionText?.substring(0, 50),
            type: q.type,
            questionType: q.questionType,
            options: q.options,
            hasVisualContent: q.hasVisualContent,
          });
        }

        return {
          id: q.id,
          questionText: q.text || q.questionText,
          questionType: q.type || q.questionType, // Use either field
          questionData: {
            options: q.options?.map((opt: any) => opt.text || opt) || q.questionData?.options,
            correctAnswer: q.correctAnswer || q.questionData?.correctAnswer,
          },
          orderIndex: index,
          points: q.points || 1, // Default to 1 point if not specified
          // Include visual content data for diagrams
          hasVisualContent: q.hasVisualContent || false,
          visualContentType: q.visualContentType || null,
          visualContentRef: q.visualContentRef || null,
          pageNumber: q.pageNumber || null,
        };
      });

      setQuestions(transformedQuestions);
      
      // Debug log: show question types
      console.log('[InteractiveExamTaker] Loaded questions:', transformedQuestions.map(q => ({
        id: q.id,
        type: q.questionType,
        hasOptions: !!q.questionData.options?.length,
        optionCount: q.questionData.options?.length || 0,
      })));
      
      if (!isOwner) {
        toast.success("Exam preview loaded!", { id: "exam-start" });
      }
    } catch (error: any) {
      console.error("Failed to load exam:", error);
      toast.error(error.message || "Failed to load exam");
    } finally {
      setLoading(false);
    }
  };

  // Timer effect - only for students, not for owner preview
  useEffect(() => {
    if (isOwner || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isOwner]);

  const startExamAttempt = async () => {
    const token = authService.getToken();
    if (!token) {
      toast.error("Please login to take the exam");
      return;
    }

    try {
      setLoading(true);

      // Start attempt
      const response = await fetch(`${API_URL}/exam-attempts/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ examId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start exam");
      }

      const data = await response.json();
      setAttemptId(data.attemptId);
      setQuestions(data.questions);

      // Set timer if duration specified
      if (duration) {
        const minutes = parseInt(duration);
        if (!isNaN(minutes)) {
          setTimeLeft(minutes * 60);
        }
      }

      // Only show success message for students, not owners previewing
      if (!isOwner) {
        toast.success("Exam started! Good luck! 🎯");
      }
    } catch (error: any) {
      console.error("Failed to start exam:", error);
      toast.error(error.message || "Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAnswer = async (questionId: string) => {
    // For practice mode (no attemptId), answers are just stored locally
    if (!attemptId) return;

    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/exam-attempts/${attemptId}/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examQuestionId: questionId,
          answerData: answers[questionId],
        }),
      });
    } catch (error) {
      console.error("Failed to save answer:", error);
    }
  };

  const handleSubmitExam = async () => {
    const token = authService.getToken();
    
    // For documents without attemptId (uploaded PDFs), calculate local results AND save to database
    if (!attemptId) {
      // Calculate local results for practice mode
      const totalQuestions = questions.length;
      const answeredQuestions = Object.keys(answers).length;
      let correctAnswers = 0;

      console.log('[InteractiveExamTaker] Starting local grading...');
      console.log('[InteractiveExamTaker] Total questions:', totalQuestions);
      console.log('[InteractiveExamTaker] Answers submitted:', answers);

      // Build answers array for review
      const answersArray = questions.map((q, index) => {
        const userAnswer = answers[q.id];
        const correctAnswer = q.questionData?.correctAnswer;
        let isCorrect = false;
        
        console.log(`[Question ${index + 1}] Type: ${q.questionType}`);
        console.log(`[Question ${index + 1}] Student answer:`, userAnswer, typeof userAnswer);
        console.log(`[Question ${index + 1}] Correct answer:`, correctAnswer, typeof correctAnswer);
        
        if (userAnswer && correctAnswer) {
          // Helper function to extract option letter from full text (e.g., "a- option text" -> "a")
          const extractOptionLetter = (text: string): string => {
            if (typeof text !== 'string') return text;
            // Match patterns like "a-", "b.", "c)", "d ", etc.
            const match = text.trim().match(/^([a-zA-Z])[-.)\s]/);
            return match ? match[1].toLowerCase() : text.trim().toLowerCase();
          };

          // Normalize answers for comparison
          const normalizeAnswer = (ans: any) => {
            if (typeof ans === 'string') {
              // For MCQ, try to extract just the letter
              const extracted = extractOptionLetter(ans);
              return extracted;
            }
            return ans;
          };

          if (Array.isArray(userAnswer)) {
            // Multiple choice - compare arrays
            const normalizedUser = userAnswer.map(normalizeAnswer).sort();
            const normalizedCorrect = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).map(normalizeAnswer).sort();
            
            if (JSON.stringify(normalizedUser) === JSON.stringify(normalizedCorrect)) {
              isCorrect = true;
              correctAnswers++;
              console.log(`[Question ${index + 1}] ✓ CORRECT (array match)`);
            } else {
              console.log(`[Question ${index + 1}] ✗ INCORRECT (array mismatch)`, normalizedUser, 'vs', normalizedCorrect);
            }
          } else {
            // Single answer - normalize and compare
            const normalizedUser = normalizeAnswer(userAnswer);
            const normalizedCorrect = normalizeAnswer(correctAnswer);
            
            if (normalizedUser === normalizedCorrect) {
              isCorrect = true;
              correctAnswers++;
              console.log(`[Question ${index + 1}] ✓ CORRECT (exact match)`);
            } else {
              console.log(`[Question ${index + 1}] ✗ INCORRECT (mismatch: "${normalizedUser}" !== "${normalizedCorrect}")`);
            }
          }
        } else {
          console.log(`[Question ${index + 1}] ✗ INCORRECT (no answer or no correct answer defined)`);
        }

        return {
          examQuestionId: q.id,
          question: q,
          studentAnswer: userAnswer,
          isCorrect,
          pointsEarned: isCorrect ? q.points : 0,
        };
      });

      console.log('[InteractiveExamTaker] Grading complete:', {
        correctAnswers,
        totalQuestions,
        percentage: (correctAnswers / totalQuestions) * 100
      });

      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const totalPoints = answersArray.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
      const maxPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

      // Save attempt to database for tracking
      if (token) {
        try {
          console.log('[InteractiveExamTaker] Saving document exam attempt to database...');
          console.log('[InteractiveExamTaker] Payload:', {
            examId,
            totalQuestions,
            answeredQuestions,
            correctAnswers,
            score: totalPoints,
            maxScore: maxPoints,
            answerCount: answersArray.length,
          });
          
          const saveResponse = await fetch(`${API_URL}/exam-attempts/save-document-attempt`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              examId,
              totalQuestions,
              answeredQuestions,
              correctAnswers,
              score: totalPoints,
              maxScore: maxPoints,
              answers: answersArray.map(a => ({
                questionId: a.examQuestionId,
                answerData: a.studentAnswer,
                isCorrect: a.isCorrect,
                pointsEarned: a.pointsEarned,
              })),
            }),
          });

          const responseText = await saveResponse.text();
          console.log('[InteractiveExamTaker] Save response status:', saveResponse.status);
          console.log('[InteractiveExamTaker] Save response:', responseText);

          if (saveResponse.ok) {
            const result = JSON.parse(responseText);
            console.log('[InteractiveExamTaker] Attempt saved successfully:', result);
            toast.success("Progress saved!");
          } else {
            console.warn('[InteractiveExamTaker] Failed to save attempt. Status:', saveResponse.status);
            console.warn('[InteractiveExamTaker] Response:', responseText);
            toast.error("Failed to save progress, but you can still see your results");
          }
        } catch (error) {
          console.error('[InteractiveExamTaker] Error saving attempt:', error);
          toast.error("Failed to save progress, but you can still see your results");
        }
      } else {
        console.warn('[InteractiveExamTaker] No auth token available, cannot save attempt');
      }

      setResults({
        score: Math.round(score * 10) / 10,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        totalQuestions,
        answers: answersArray,
        isPracticeMode: true,
      });
      setShowResults(true);
      toast.success("Practice session completed! 🎯");
      return;
    }

    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    if (!token) return;

    try {
      setSubmitting(true);

      // Submit final attempt
      const response = await fetch(`${API_URL}/exam-attempts/${attemptId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to submit exam");
      }

      // Get results
      const resultsResponse = await fetch(`${API_URL}/exam-attempts/${attemptId}/results`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setResults(resultsData);
        setShowResults(true);
        toast.success("Exam submitted successfully! 🎉");
      }
    } catch (error: any) {
      console.error("Failed to submit exam:", error);
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#63b3ed] animate-spin mx-auto mb-4" />
          <p className="text-[#8899bb]">Starting exam...</p>
        </div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="h-screen overflow-y-auto bg-gray-50">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Results Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Exam Completed!</h2>
                <p className="text-gray-600">Here are your results</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{results.score}%</div>
                <div className="text-sm text-gray-600 mt-1">Score</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{results.correctAnswers}</div>
                <div className="text-sm text-gray-600 mt-1">Correct</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{results.incorrectAnswers}</div>
                <div className="text-sm text-gray-600 mt-1">Incorrect</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{results.totalQuestions}</div>
                <div className="text-sm text-gray-600 mt-1">Total</div>
              </div>
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Question Review</h3>
            {results.answers.map((answer: any, index: number) => (
            <div
              key={answer.examQuestionId}
              className={`border-2 rounded-xl p-6 ${
                answer.isCorrect
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">Question {index + 1}</span>
                  {answer.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-600">
                  {answer.pointsEarned || 0} / {answer.question.points || 0} points
                </span>
              </div>

              <p className="text-gray-900 mb-3">{answer.question.questionText || answer.question.text}</p>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Your answer: </span>
                  <span className="text-sm text-gray-900">
                    {answer.studentAnswer 
                      ? (typeof answer.studentAnswer === 'object' 
                          ? JSON.stringify(answer.studentAnswer) 
                          : answer.studentAnswer)
                      : "Not answered"}
                  </span>
                </div>
                {!answer.isCorrect && answer.question.questionData?.correctAnswer && (
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Correct answer: </span>
                    <span className="text-sm text-green-700 font-medium">
                      {answer.question.questionData.correctAnswer}
                    </span>
                  </div>
                )}
                {answer.question.questionData?.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-semibold text-blue-900">Explanation: </span>
                    <span className="text-sm text-blue-800">{answer.question.questionData.explanation}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>

          <div className="mt-6 pb-6 flex justify-center gap-4">
            <button
              onClick={() => {
                // Reset the exam state to retake
                setShowResults(false);
                setAnswers({});
                setCurrentQuestionIndex(0);
                setFlaggedQuestions(new Set());
                setAttemptId(null);
                setResults(null);
                
                // Restart the exam
                if (isOwner) {
                  loadQuestionsForPreview();
                } else {
                  startExamAttemptOrPreview();
                }
                
                toast.success("Starting new attempt...");
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Exam
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Close Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{examTitle}</h2>
            <p className="text-sm text-blue-100">
              Question {currentQuestionIndex + 1} of {questions.length}
              {isOwner && <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-yellow-900 rounded text-xs font-semibold">PREVIEW MODE</span>}
            </p>
          </div>
          {!isOwner && timeLeft !== null && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar - only show for students */}
        {!isOwner && (
          <div className="mt-3">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-100 mt-1">
              <span>{Object.keys(answers).length} answered</span>
              <span>{questions.length - Object.keys(answers).length} remaining</span>
            </div>
          </div>
        )}
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentQuestion && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {(currentQuestion.questionType || currentQuestion.type || 'QUESTION').replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{currentQuestion.points} points</span>
                  </div>
                  <p className="text-lg text-gray-900 leading-relaxed">
                    {currentQuestion.questionText || currentQuestion.text}
                  </p>
                  
                  {/* Display diagram if question has visual content */}
                  {currentQuestion.hasVisualContent && currentQuestion.visualContentRef && (() => {
                    try {
                      const visualData = JSON.parse(currentQuestion.visualContentRef);
                      if (visualData.diagrams && visualData.diagrams.length > 0) {
                        return (
                          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              📊 Diagram {visualData.diagrams.length > 1 && `(${visualData.diagrams.length} images)`}
                            </p>
                            <div className={`grid gap-3 ${visualData.diagrams.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {visualData.diagrams.map((img: any, idx: number) => (
                                <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                                  <img
                                    src={`data:${img.mimeType};base64,${img.imageData}`}
                                    alt={`Diagram ${idx + 1}`}
                                    className="w-full h-auto rounded object-contain"
                                    style={{ maxHeight: '400px' }}
                                  />
                                  <p className="text-xs text-gray-500 mt-2 text-center">
                                    {img.width} × {img.height}px
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error('Failed to parse visual content:', e);
                    }
                    return null;
                  })()}
                </div>
                {!isOwner && (
                  <button
                    onClick={() => toggleFlag(currentQuestionIndex)}
                    className={`p-2 rounded-lg transition-colors ${
                      flaggedQuestions.has(currentQuestionIndex)
                        ? "bg-red-100 text-red-600"
                        : "hover:bg-gray-100 text-gray-400"
                    }`}
                    title="Flag for review"
                  >
                    <Flag className="w-5 h-5" fill={flaggedQuestions.has(currentQuestionIndex) ? "currentColor" : "none"} />
                  </button>
                )}
              </div>

              {/* Answer Options Display - Show for everyone (owner sees, student interacts) */}
              <div className="mt-6">
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  const hasOptions = currentQuestion.questionData?.options && currentQuestion.questionData.options.length > 0;
                  
                  // Debug log for current question
                  console.log('[InteractiveExamTaker] Rendering question:', {
                    id: currentQuestion.id,
                    type: qType,
                    hasOptions,
                    optionCount: currentQuestion.questionData?.options?.length,
                  });
                  
                  return null; // This is just for logging
                })()}
                
                {/* MCQ Options - Owner sees them, student can select */}
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  const isMCQ = qType === "mcq" || qType === "multiple_choice" || qType === "multiplechoice";
                  const hasOptions = currentQuestion.questionData?.options && currentQuestion.questionData.options.length > 0;
                  return isMCQ && hasOptions;
                })() && (
                  <div className="space-y-3">
                    {currentQuestion.questionData.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg ${
                          isOwner 
                            ? "border-gray-200 bg-gray-50 cursor-default" 
                            : `cursor-pointer transition-all ${
                                answers[currentQuestion.id] === option
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                              }`
                        }`}
                      >
                        {isOwner ? (
                          <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex-shrink-0" />
                        ) : (
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option}
                            checked={answers[currentQuestion.id] === option}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            className="w-5 h-5 text-blue-600"
                          />
                        )}
                        <span className="text-gray-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* True/False - Owner sees them, student can select */}
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  return qType === "true_false" || qType === "truefalse" || qType === "tf";
                })() && (
                  <div className="space-y-3">
                    {["True", "False"].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg ${
                          isOwner 
                            ? "border-gray-200 bg-gray-50 cursor-default" 
                            : `cursor-pointer transition-all ${
                                answers[currentQuestion.id] === option
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                              }`
                        }`}
                      >
                        {isOwner ? (
                          <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex-shrink-0" />
                        ) : (
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option}
                            checked={answers[currentQuestion.id] === option}
                            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                            className="w-5 h-5 text-blue-600"
                          />
                        )}
                        <span className="text-gray-900 font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Fill in Blank - Owner sees placeholder, student can type */}
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  return qType === "fill_in_blank" || qType === "fill_blank" || qType === "fillblank" || qType === "fillintheblanks";
                })() && (
                  isOwner ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      Student will type their answer here...
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  )
                )}

                {/* Essay/Open - Owner sees placeholder, student can type */}
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  return qType === "essay" || qType === "open" || qType === "short_answer" || qType === "shortanswer";
                })() && (
                  isOwner ? (
                    <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-500" style={{ minHeight: '120px' }}>
                      Student will write their essay/answer here...
                    </div>
                  ) : (
                    <textarea
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Write your answer here..."
                      rows={8}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    />
                  )
                )}

                {/* Fallback for unknown question types - show as text area */}
                {(() => {
                  const qType = (currentQuestion.questionType || '').toLowerCase();
                  const isMCQ = qType === "mcq" || qType === "multiple_choice" || qType === "multiplechoice";
                  const hasOptions = currentQuestion.questionData?.options && currentQuestion.questionData.options.length > 0;
                  const isTrueFalse = qType === "true_false" || qType === "truefalse" || qType === "tf";
                  const isFillBlank = qType === "fill_in_blank" || qType === "fill_blank" || qType === "fillblank" || qType === "fillintheblanks";
                  const isOpen = qType === "essay" || qType === "open" || qType === "short_answer" || qType === "shortanswer";
                  
                  // If it's MCQ with options, don't show fallback
                  if (isMCQ && hasOptions) return false;
                  
                  // If it's any known type, don't show fallback
                  if (isTrueFalse || isFillBlank || isOpen) return false;
                  
                  return true; // Show fallback for unknown types
                })() && (
                  <div>
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> Question type: {currentQuestion.questionType || currentQuestion.type || 'unknown'}
                      </p>
                    </div>
                    {isOwner ? (
                      <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-500" style={{ minHeight: '120px' }}>
                        Student will write their answer here...
                      </div>
                    ) : (
                      <textarea
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder="Write your answer here..."
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Save Answer Button - only for students */}
              {!isOwner && (
                <button
                  onClick={() => handleSubmitAnswer(currentQuestion.id)}
                  disabled={!isAnswered}
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnswered ? "Answer Saved" : "Save Answer"}
                </button>
              )}

              {/* Owner Preview Info */}
              {isOwner && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Preview Mode:</strong> This is how students will see this question. 
                    Use the navigation buttons to browse through all questions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isOwner && flaggedQuestions.size > 0 && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <Flag className="w-4 h-4" />
                {flaggedQuestions.size} flagged
              </span>
            )}
          </div>

          {currentQuestionIndex === questions.length - 1 && !isOwner ? (
            <button
              onClick={handleSubmitExam}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Exam
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
