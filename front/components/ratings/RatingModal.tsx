"use client";

import React, { useState } from "react";
import { X, Star, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";
import { StarRating } from "./StarRating";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: RatingData) => Promise<void>;
  resourceTitle: string;
  existingRating?: RatingData | null;
}

export interface RatingData {
  overallRating: number;
  qualityRating?: number;
  accuracyRating?: number;
  usabilityRating?: number;
  wouldRecommend?: boolean;
  review?: string;
  tags?: string[];
}

const AVAILABLE_TAGS = [
  "Well structured",
  "Creative",
  "Easy to understand",
  "Curriculum aligned",
  "Good activities",
  "High quality visuals",
  "Time-saving",
  "Engaging content",
];

const NEGATIVE_TAGS = [
  "Needs correction",
  "Outdated",
  "Poor formatting",
  "Incomplete",
  "Too complex",
  "Missing content",
];

export function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  resourceTitle,
  existingRating,
}: RatingModalProps) {
  const [step, setStep] = useState<"rating" | "details" | "success">("rating");
  const [loading, setLoading] = useState(false);
  
  const [overallRating, setOverallRating] = useState(existingRating?.overallRating || 0);
  const [qualityRating, setQualityRating] = useState(existingRating?.qualityRating || 0);
  const [accuracyRating, setAccuracyRating] = useState(existingRating?.accuracyRating || 0);
  const [usabilityRating, setUsabilityRating] = useState(existingRating?.usabilityRating || 0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | undefined>(existingRating?.wouldRecommend);
  const [review, setReview] = useState(existingRating?.review || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(existingRating?.tags || []);

  if (!isOpen) return null;

  const handleOverallSubmit = () => {
    if (overallRating > 0) {
      setStep("details");
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        overallRating,
        qualityRating: qualityRating || undefined,
        accuracyRating: accuracyRating || undefined,
        usabilityRating: usabilityRating || undefined,
        wouldRecommend,
        review: review.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setStep("success");
    } catch (error) {
      console.error("Failed to submit rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClose = () => {
    if (step === "success") {
      // Reset form
      setStep("rating");
      setOverallRating(0);
      setQualityRating(0);
      setAccuracyRating(0);
      setUsabilityRating(0);
      setWouldRecommend(undefined);
      setReview("");
      setSelectedTags([]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7]">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-[#0d1b3e]">
              {step === "success" ? "Thank You!" : "Rate This Resource"}
            </h2>
            <p className="text-sm text-[#8899bb] truncate">{resourceTitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#f9faff] text-[#8899bb] hover:text-[#0d1b3e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "rating" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#0d1b3e] mb-2">
                  How would you rate this resource?
                </h3>
                <p className="text-sm text-[#8899bb] mb-6">
                  Your feedback helps other teachers find quality content
                </p>
              </div>

              <div className="flex justify-center">
                <StarRating
                  rating={overallRating}
                  onRatingChange={setOverallRating}
                  size="lg"
                />
              </div>

              {overallRating > 0 && (
                <div className="text-center">
                  <p className="text-sm font-medium text-[#0d1b3e]">
                    {overallRating === 5 && "Excellent!"}
                    {overallRating === 4 && "Very Good!"}
                    {overallRating === 3 && "Good"}
                    {overallRating === 2 && "Fair"}
                    {overallRating === 1 && "Needs Improvement"}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "details" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#0d1b3e] mb-4">
                  Help us understand your rating better
                </h3>

                {/* Detailed Ratings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a5568]">Quality</span>
                    <StarRating
                      rating={qualityRating}
                      onRatingChange={setQualityRating}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a5568]">Accuracy</span>
                    <StarRating
                      rating={accuracyRating}
                      onRatingChange={setAccuracyRating}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a5568]">Ease of Use</span>
                    <StarRating
                      rating={usabilityRating}
                      onRatingChange={setUsabilityRating}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-sm font-medium text-[#4a5568] mb-3">
                  Would you recommend this resource?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      wouldRecommend === true
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-[#edf0f7] text-[#8899bb] hover:border-green-300"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Yes</span>
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      wouldRecommend === false
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-[#edf0f7] text-[#8899bb] hover:border-red-300"
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm font-medium">No</span>
                  </button>
                </div>
              </div>

              {/* Quick Tags */}
              <div>
                <label className="block text-sm font-medium text-[#4a5568] mb-3">
                  Quick tags (select all that apply)
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {AVAILABLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-[#63b3ed] text-white"
                          : "bg-[#f6f8ff] text-[#4a5568] hover:bg-[#edf0f7]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {NEGATIVE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-red-500 text-white"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Review */}
              <div>
                <label className="block text-sm font-medium text-[#4a5568] mb-2">
                  Write a review (optional)
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience with this resource..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-[#edf0f7] text-sm placeholder:text-[#aab4cc] outline-none focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.12)] transition-all resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-[#8899bb] mt-1">
                  {review.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-[#0d1b3e] mb-2">
                Thank you for your feedback!
              </h3>
              <p className="text-sm text-[#8899bb]">
                Your rating helps the community find quality resources
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "success" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#edf0f7] bg-[#f9faff]">
            {step === "details" && (
              <button
                onClick={() => setStep("rating")}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#4a5568] hover:bg-white transition-colors"
              >
                Back
              </button>
            )}
            <div className={step === "rating" ? "ml-auto" : ""}>
              <button
                onClick={step === "rating" ? handleOverallSubmit : handleFinalSubmit}
                disabled={step === "rating" ? overallRating === 0 : loading}
                className="px-6 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : step === "rating" ? "Continue" : "Submit Rating"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="px-6 py-4 border-t border-[#edf0f7] bg-[#f9faff]">
            <button
              onClick={handleClose}
              className="w-full px-6 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
