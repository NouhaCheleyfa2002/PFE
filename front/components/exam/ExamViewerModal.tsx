"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Printer, FileText, Clock, GraduationCap, BookOpen } from "lucide-react";
import { authService } from "@/lib/auth";
import { RatingDisplay, ReviewList, RatingModal, StarRating, RatingData } from "@/components/ratings";
import { InteractiveExamTaker } from "./InteractiveExamTaker";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ExamViewerModalProps {
  examId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExamData {
  id: string;
  title: string;
  classLevel: string;
  subject: string;
  bacSection?: string;
  duration?: string;
  instructions?: string;
  questions: any[];
  maxPoints?: number;
  owner?: {
    firstName: string;
    lastName: string;
  };
  ownerId?: string;
}

export function ExamViewerModal({ examId, isOpen, onClose }: ExamViewerModalProps) {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"exam" | "reviews" | "practice">("exam");

  
  // Rating states
  const [ratingStats, setRatingStats] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState<any>(null);
  const [canRate, setCanRate] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasUsed, setHasUsed] = useState(false);

  useEffect(() => {
    if (isOpen && examId) {
      loadExamData();
    }
  }, [isOpen, examId]);

  const loadExamData = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Try to fetch as exam first (new system)
      let response = await fetch(`${API_URL}/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If 404, try as document (uploaded exam PDF - old system)
      if (!response.ok && response.status === 404) {
        console.log('[ExamViewer] Not found in exams table, trying documents table...');
        response = await fetch(`${API_URL}/documents/${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const docData = await response.json();
          
          // Fetch extracted questions for this document
          let extractedQuestions: any[] = [];
          try {
            const questionsResponse = await fetch(`${API_URL}/exam-questions/document/${examId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              extractedQuestions = questionsData.questions || questionsData || [];
              console.log(`[ExamViewer] Loaded ${extractedQuestions.length} extracted questions for document`);
            }
          } catch (err) {
            console.warn('[ExamViewer] Failed to fetch extracted questions:', err);
          }
          
          // Convert document to exam format for viewer
          const examData: ExamData = {
            id: docData.id,
            title: docData.title || docData.originalName,
            classLevel: docData.classLevel || 'Not specified',
            subject: docData.subject || 'Not specified',
            bacSection: docData.bacSection,
            duration: undefined,
            instructions: docData.description || 'No instructions provided',
            questions: extractedQuestions, // Use extracted questions
            maxPoints: extractedQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
            ownerId: docData.userId, // Set document uploader as owner
          };
          // Preserve the PDF URL from uploaded document
          (examData as any).pdfUrl = docData.fileUrl || docData.pdfUrl || docData.storageUrl;
          setExam(examData);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setExam(data);
        
        // Track usage (view) - This must complete before fetching rating data
        try {
          const trackResponse = await fetch(`${API_URL}/ratings/exams/${examId}/usage`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (trackResponse.ok) {
            console.log('[ExamViewer] Usage tracked successfully');
          } else {
            console.warn('[ExamViewer] Failed to track usage');
          }
        } catch (trackErr) {
          console.error('[ExamViewer] Failed to track usage:', trackErr);
        }

        // Now fetch rating data after usage has been tracked
        await fetchRatingData();
      } else {
        setError("Failed to load exam");
      }
    } catch (err) {
      console.error("Failed to fetch exam:", err);
      setError("Failed to load exam");
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingData = async () => {
    const token = authService.getToken();
    if (!token) return;

    console.log('[ExamViewer] Fetching rating data for exam:', examId);

    try {
      // Fetch rating stats
      const statsRes = await fetch(`${API_URL}/ratings/exams/${examId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        console.log('[ExamViewer] Rating stats:', stats);
        setRatingStats(stats);
      }

      // Fetch reviews
      const reviewsRes = await fetch(`${API_URL}/ratings/exams/${examId}/ratings?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        console.log('[ExamViewer] Reviews:', data.ratings?.length || 0);
        setReviews(data.ratings || []);
      }

      // Fetch my rating
      const myRatingRes = await fetch(`${API_URL}/ratings/exams/${examId}/my-rating`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (myRatingRes.ok) {
        const data = await myRatingRes.json();
        console.log('[ExamViewer] My rating data:', data);
        console.log('[ExamViewer] canRate:', data.canRate);
        setMyRating(data.rating);
        setCanRate(data.canRate);
      } else {
        console.error('[ExamViewer] Failed to fetch my rating:', myRatingRes.status);
      }

      // Check if used
      const usedRes = await fetch(`${API_URL}/ratings/exams/${examId}/has-used`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usedRes.ok) {
        const data = await usedRes.json();
        console.log('[ExamViewer] Has used:', data.hasUsed);
        setHasUsed(data.hasUsed);
      }
    } catch (error) {
      console.error("[ExamViewer] Failed to fetch rating data:", error);
    }
  };

  const handleSubmitRating = async (ratingData: RatingData) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/ratings/exams/${examId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ratingData),
      });

      if (res.ok) {
        await fetchRatingData();
        setShowRatingModal(false);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Failed to submit rating:", error);
      alert("Failed to submit rating");
    }
  };

  const handleVoteOnReview = async (reviewId: string, voteType: "helpful" | "not_helpful") => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/ratings/${reviewId}/vote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      });

      await fetchRatingData();
    } catch (error) {
      console.error("Failed to vote on review:", error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_URL}/ratings/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchRatingData();
    } catch (error) {
      console.error("Failed to delete review:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const token = authService.getToken();
    if (!token || !exam) return;

    try {
      // Track download
      await fetch(`${API_URL}/exams/${examId}/download`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // If exam has PDF file, download it directly
      if ((exam as any).pdfUrl) {
        window.open((exam as any).pdfUrl, '_blank');
        return;
      }

      // Fallback: Generate printable version (for legacy exams without PDF/DOCX)
      const printContent = document.getElementById('exam-print-content');
      if (!printContent) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${exam.title}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #0d1b3e;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                margin: 0 0 10px 0;
                color: #0d1b3e;
              }
              .header .info {
                color: #666;
                font-size: 14px;
              }
              .question {
                margin: 30px 0;
                page-break-inside: avoid;
              }
              .question-number {
                font-weight: bold;
                color: #0d1b3e;
                margin-bottom: 10px;
              }
              .question-text {
                margin-bottom: 15px;
                line-height: 1.6;
              }
              .options {
                margin-left: 20px;
              }
              .option {
                margin: 8px 0;
                line-height: 1.6;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <div class="footer">
              <p>Generated from EduShare Platform - ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      console.error("Failed to download exam:", err);
    }
  };

  if (!isOpen) return null;

  const user = authService.getUser();
  const isOwner = exam?.ownerId === user?.id;
  
  // Debug logging
  console.log('[ExamViewerModal] User:', user);
  console.log('[ExamViewerModal] Exam ownerId:', exam?.ownerId);
  console.log('[ExamViewerModal] Is Owner:', isOwner);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7] bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0d1b3e]">Exam Preview</h2>
                <p className="text-xs text-[#8899bb]">View, download, and rate this exam</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#edf0f7] bg-white text-[#4a5568] text-sm font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              
              {/* Download button - PDF only */}
              {(exam as any)?.pdfUrl ? (
                <button
                  onClick={() => handleDownload('pdf')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              ) : (
                <button
                  onClick={() => handleDownload()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-[#5a7299]" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#edf0f7]">
            <button
              onClick={() => setActiveTab("exam")}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "exam"
                  ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
                  : "text-[#8899bb] hover:text-[#0d1b3e]"
              }`}
            >
              Exam Content
            </button>
            {/* Interactive Practice tab - show for students and owners */}
            {exam && exam.questions.length > 0 && user?.role !== 'admin' && (
              <button
                onClick={() => setActiveTab("practice")}
                className={`px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === "practice"
                    ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
                    : "text-[#8899bb] hover:text-[#0d1b3e]"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM2 10a8 8 0 1116 0 8 8 0 01-16 0z"/>
                  <path d="M10 6a1 1 0 011 1v3a1 1 0 11-2 0V7a1 1 0 011-1zm0 7a1 1 0 100 2 1 1 0 000-2z"/>
                </svg>
                Interactive Practice
              </button>
            )}
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "reviews"
                  ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
                  : "text-[#8899bb] hover:text-[#0d1b3e]"
              }`}
            >
              Reviews {ratingStats && `(${ratingStats.totalRatings})`}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-[#63b3ed] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#8899bb]">Loading exam...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            ) : exam ? (
              <div>
                {activeTab === "exam" ? (
                  <>
                    {/* Show PDF if available */}
                    {(exam as any).pdfUrl ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center" style={{ minHeight: '600px' }}>
                        <iframe
                          src={(exam as any).pdfUrl}
                          className="w-full h-full border-0"
                          style={{ minHeight: '600px', height: 'calc(90vh - 200px)' }}
                          title="Exam PDF"
                        />
                      </div>
                    ) : (
                      /* Fallback to generic HTML view for exams without PDF */
                      <div className="bg-gray-100 p-6">
                        <div className="max-w-[210mm] mx-auto bg-white shadow-2xl rounded-lg overflow-hidden" style={{ minHeight: '297mm' }}>
                          <div id="exam-print-content" className="p-12">
                            {/* Exam Header - Professional PDF Style */}
                            <div className="header text-center border-b-2 border-[#0d1b3e] pb-6 mb-8">
                          <div className="mb-4">
                            <div className="inline-block px-4 py-1 bg-[#0d1b3e] text-white text-xs font-semibold rounded-full mb-3">
                              {exam.bacSection || 'EXAM'}
                            </div>
                          </div>
                          <h1 className="text-3xl font-bold text-[#0d1b3e] mb-4 leading-tight">{exam.title}</h1>
                          <div className="flex items-center justify-center gap-8 text-sm text-[#5a7299] flex-wrap">
                            {exam.classLevel && (
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                <span className="font-medium">{exam.classLevel}</span>
                              </div>
                            )}
                            {exam.subject && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span className="font-medium">{exam.subject}</span>
                              </div>
                            )}
                            {exam.duration && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{exam.duration}</span>
                              </div>
                            )}
                            {exam.maxPoints && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="font-medium">{exam.maxPoints} points</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Instructions */}
                        {exam.instructions && (
                          <div className="mb-8 p-5 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <h3 className="font-bold text-[#0d1b3e] mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Instructions:
                            </h3>
                            <p className="text-sm text-[#5a7299] leading-relaxed whitespace-pre-wrap">{exam.instructions}</p>
                          </div>
                        )}

                        {/* Questions */}
                        <div className="space-y-8">
                          {exam.questions.map((question, index) => (
                            <div key={index} className="question border-l-4 border-[#63b3ed] pl-6 py-2">
                              <div className="question-number text-lg font-bold text-[#0d1b3e] mb-3 flex items-baseline justify-between">
                                <span>Question {index + 1}</span>
                                {question.points && <span className="text-sm text-[#8899bb] font-normal">({question.points} {question.points === 1 ? 'point' : 'points'})</span>}
                              </div>
                              <div className="question-text text-[#0d1b3e] mb-4 leading-relaxed whitespace-pre-wrap text-base">
                                {question.text || question.question}
                              </div>

                              {/* Multiple Choice Options */}
                              {question.type === "multiple_choice" && question.options && (
                                <div className="options space-y-2.5 ml-2">
                                  {question.options.map((option: string, optIndex: number) => (
                                    <div key={optIndex} className="option flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
                                      <span className="font-bold text-[#5a7299] min-w-[28px] flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-sm">
                                        {String.fromCharCode(65 + optIndex)}
                                      </span>
                                      <span className="text-[#5a7299] leading-relaxed flex-1">{option}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* True/False */}
                              {question.type === "true_false" && (
                                <div className="options space-y-2.5 ml-2">
                                  <div className="option flex items-center gap-3 p-2 rounded">
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                    <span className="text-[#5a7299] font-medium">True</span>
                                  </div>
                                  <div className="option flex items-center gap-3 p-2 rounded">
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                    <span className="text-[#5a7299] font-medium">False</span>
                                  </div>
                                </div>
                              )}

                              {/* Short Answer / Essay */}
                              {(question.type === "short_answer" || question.type === "essay") && (
                                <div className="ml-2 mt-3 space-y-3">
                                  <div className="border-b-2 border-dotted border-[#c0d0e8] pb-3">
                                    <span className="text-xs text-[#8899bb] uppercase tracking-wide">Answer:</span>
                                  </div>
                                  {question.type === "essay" && (
                                    <>
                                      <div className="border-b-2 border-dotted border-[#c0d0e8] pb-3"></div>
                                      <div className="border-b-2 border-dotted border-[#c0d0e8] pb-3"></div>
                                      <div className="border-b-2 border-dotted border-[#c0d0e8] pb-3"></div>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Fill in the Blank */}
                              {question.type === "fill_in_blank" && (
                                <div className="ml-2 mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-sm text-[#5a7299] italic">
                                    Fill in the blank with the appropriate answer.
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Footer Info */}
                        <div className="mt-12 pt-6 border-t-2 border-[#edf0f7]">
                          <div className="flex items-center justify-between text-sm text-[#8899bb]">
                            <div>
                              {exam.owner && (
                                <>
                                  <p className="font-medium text-[#5a7299]">
                                    Prepared by: {exam.owner.firstName} {exam.owner.lastName}
                                  </p>
                                  {exam.coAuthors && exam.coAuthors.length > 0 && (
                                    <p className="text-xs text-[#8899bb] mt-1">
                                      Co-authored with: {exam.coAuthors.map((ca: any) => ca.fullName).join(', ')}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#0d1b3e]">
                                Total: {exam.questions.length} question{exam.questions.length !== 1 ? 's' : ''}
                                {exam.maxPoints && ` • ${exam.maxPoints} points`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    )}
                  </>
                ) : activeTab === "reviews" ? (
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Main Content - Reviews */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Rating Summary */}
                        {ratingStats && (
                          <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                            <RatingDisplay
                              stats={ratingStats}
                              views={0}
                              downloads={0}
                              showDetailed
                            />
                          </div>
                        )}

                        {/* Reviews List */}
                        <div>
                          <ReviewList
                            reviews={reviews}
                            currentUserId={user?.id}
                            onVote={handleVoteOnReview}
                            onDelete={handleDeleteReview}
                          />
                        </div>
                      </div>

                      {/* Sidebar - Your Rating */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                          <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
                            Your Rating
                          </h3>
                          {myRating ? (
                            <div className="space-y-3">
                              <StarRating rating={myRating.overallRating} readonly size="md" />
                              <button
                                onClick={() => setShowRatingModal(true)}
                                className="w-full px-4 py-2 rounded-lg border border-[#edf0f7] text-[#4a5568] text-sm font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors"
                              >
                                Edit Rating
                              </button>
                            </div>
                          ) : (
                            <div>
                              {canRate ? (
                                <button
                                  onClick={() => setShowRatingModal(true)}
                                  className="w-full px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
                                >
                                  Rate This Exam
                                </button>
                              ) : (
                                <div className="text-center">
                                  <p className="text-xs text-[#8899bb] px-4 py-2">
                                    {isOwner ? "You own this exam" : "View this exam to rate it"}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Exam Info */}
                        <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                          <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
                            Exam Details
                          </h3>
                          <div className="space-y-2 text-sm">
                            {exam.classLevel && (
                              <div className="flex justify-between">
                                <span className="text-[#8899bb]">Level:</span>
                                <span className="text-[#0d1b3e] font-medium">{exam.classLevel}</span>
                              </div>
                            )}
                            {exam.subject && (
                              <div className="flex justify-between">
                                <span className="text-[#8899bb]">Subject:</span>
                                <span className="text-[#0d1b3e] font-medium">{exam.subject}</span>
                              </div>
                            )}
                            {exam.bacSection && (
                              <div className="flex justify-between">
                                <span className="text-[#8899bb]">Section:</span>
                                <span className="text-[#0d1b3e] font-medium">{exam.bacSection}</span>
                              </div>
                            )}
                            {exam.duration && (
                              <div className="flex justify-between">
                                <span className="text-[#8899bb]">Duration:</span>
                                <span className="text-[#0d1b3e] font-medium">{exam.duration}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[#8899bb]">Questions:</span>
                              <span className="text-[#0d1b3e] font-medium">{exam.questions.length}</span>
                            </div>
                            {exam.maxPoints && (
                              <div className="flex justify-between">
                                <span className="text-[#8899bb]">Total Points:</span>
                                <span className="text-[#0d1b3e] font-medium">{exam.maxPoints}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "practice" ? (
                  <>
                    {isOwner ? (
                      // Owner: Show interactive practice in preview mode
                      <InteractiveExamTaker
                        examId={examId}
                        examTitle={exam.title}
                        duration={exam.duration}
                        onClose={() => setActiveTab("exam")}
                        isOwner={isOwner}
                      />
                    ) : (
                      // Student: Show "Take Exam" button that redirects to exams page
                      <div className="flex flex-col items-center justify-center py-20 px-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#63b3ed] to-[#4299e1] flex items-center justify-center mb-6 shadow-lg">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-[#0d1b3e] mb-3">Ready to Practice?</h3>
                        <p className="text-[#8899bb] text-center mb-6 max-w-md">
                          Take this exam in interactive mode. Answer questions, get instant feedback, and track your progress.
                        </p>
                        <div className="flex flex-col gap-3 items-center">
                          <button
                            onClick={() => {
                              // Close modal and navigate to exams page with this exam
                              onClose();
                              window.location.href = `/dashboard/exams?examId=${examId}&mode=practice`;
                            }}
                            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[#63b3ed] to-[#4299e1] text-white text-base font-semibold hover:from-[#4299e1] hover:to-[#3182ce] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Interactive Practice
                          </button>
                          <p className="text-xs text-[#8899bb] mt-2">
                            📝 {exam.questions?.length || 0} questions • 
                            {exam.duration ? ` ⏱️ ${exam.duration}` : ' 🎯 Untimed'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleSubmitRating}
          resourceTitle={exam?.title || 'Exam'}
          existingRating={myRating}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #exam-print-content,
          #exam-print-content * {
            visibility: visible;
          }
          #exam-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
