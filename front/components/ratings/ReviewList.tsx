"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, BadgeCheck, MoreVertical, Trash2 } from "lucide-react";
import { StarRating } from "./StarRating";

interface Review {
  id: string;
  overallRating: number;
  qualityRating?: number;
  accuracyRating?: number;
  usabilityRating?: number;
  wouldRecommend?: boolean;
  review?: string;
  tags: string[];
  helpfulVotes: number;
  notHelpfulVotes: number;
  createdAt: string;
  updatedAt: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    verified: boolean;
  };
}

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onVote: (reviewId: string, voteType: "helpful" | "not_helpful") => Promise<void>;
  onDelete?: (reviewId: string) => Promise<void>;
}

export function ReviewList({
  reviews,
  currentUserId,
  onVote,
  onDelete,
}: ReviewListProps) {
  const [votingReview, setVotingReview] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);

  const handleVote = async (reviewId: string, voteType: "helpful" | "not_helpful") => {
    setVotingReview(reviewId);
    try {
      await onVote(reviewId, voteType);
    } finally {
      setVotingReview(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!onDelete) return;
    setDeletingReview(reviewId);
    try {
      await onDelete(reviewId);
    } finally {
      setDeletingReview(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#8899bb]">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwnReview = currentUserId === review.teacher.id;

        return (
          <div
            key={review.id}
            className="bg-white rounded-xl border border-[#edf0f7] p-5 hover:shadow-sm transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#63b3ed]/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#63b3ed]">
                    {review.teacher?.firstName?.[0] || ''}{review.teacher?.lastName?.[0] || ''}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#0d1b3e]">
                      {review.teacher?.firstName || 'Unknown'} {review.teacher?.lastName || ''}
                    </span>
                    {review.teacher?.verified && (
                      <BadgeCheck className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8899bb]">
                    <span>{formatDate(review.createdAt)}</span>
                    {review.updatedAt !== review.createdAt && (
                      <>
                        <span>•</span>
                        <span>Edited</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isOwnReview && onDelete && (
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingReview === review.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                  title="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Rating */}
            <div className="mb-3">
              <StarRating rating={review.overallRating} readonly size="sm" />
            </div>

            {/* Review Text */}
            {review.review && (
              <p className="text-sm text-[#4a5568] mb-3 leading-relaxed">
                {review.review}
              </p>
            )}

            {/* Tags */}
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {review.tags.map((tag) => {
                  const isNegative = [
                    "Needs correction",
                    "Outdated",
                    "Poor formatting",
                    "Incomplete",
                    "Too complex",
                    "Missing content",
                  ].includes(tag);

                  return (
                    <span
                      key={tag}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        isNegative
                          ? "bg-red-50 text-red-600"
                          : "bg-[#f6f8ff] text-[#4a5568]"
                      }`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Detailed Ratings */}
            {(review.qualityRating || review.accuracyRating || review.usabilityRating) && (
              <div className="flex flex-wrap gap-4 mb-3 text-xs">
                {review.qualityRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#8899bb]">Quality:</span>
                    <StarRating rating={review.qualityRating} readonly size="sm" />
                  </div>
                )}
                {review.accuracyRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#8899bb]">Accuracy:</span>
                    <StarRating rating={review.accuracyRating} readonly size="sm" />
                  </div>
                )}
                {review.usabilityRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#8899bb]">Ease of use:</span>
                    <StarRating rating={review.usabilityRating} readonly size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* Footer - Helpful votes */}
            <div className="flex items-center justify-between pt-3 border-t border-[#f0f4f8]">
              <span className="text-xs text-[#8899bb]">Was this review helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote(review.id, "helpful")}
                  disabled={votingReview === review.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{review.helpfulVotes}</span>
                </button>
                <button
                  onClick={() => handleVote(review.id, "not_helpful")}
                  disabled={votingReview === review.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#edf0f7] text-[#4a5568] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-all disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{review.notHelpfulVotes}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
