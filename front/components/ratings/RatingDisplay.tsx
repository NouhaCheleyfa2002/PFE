"use client";

import React from "react";
import { Star, ThumbsUp, ThumbsDown, Eye, Download } from "lucide-react";
import { StarRating } from "./StarRating";

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  averageQuality: number;
  averageAccuracy: number;
  averageUsability: number;
  recommendPercentage: number;
}

interface RatingDisplayProps {
  stats: RatingStats;
  views?: number;
  downloads?: number;
  showDetailed?: boolean;
}

export function RatingDisplay({
  stats,
  views,
  downloads,
  showDetailed = false,
}: RatingDisplayProps) {
  const total = Object.values(stats.distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="flex items-start gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-[#0d1b3e] mb-2">
            {stats.averageRating.toFixed(1)}
          </div>
          <StarRating rating={stats.averageRating} readonly size="md" />
          <p className="text-sm text-[#8899bb] mt-2">
            {stats.totalRatings} {stats.totalRatings === 1 ? "rating" : "ratings"}
          </p>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating as keyof typeof stats.distribution];
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-xs text-[#4a5568]">{rating}</span>
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                </div>
                <div className="flex-1 h-2 bg-[#f0f4f8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-[#8899bb] w-10 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      {(views !== undefined || downloads !== undefined) && (
        <div className="grid grid-cols-2 gap-4">
          {views !== undefined && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#f6f8ff]">
              <Eye className="w-4 h-4 text-[#63b3ed]" />
              <div>
                <p className="text-lg font-semibold text-[#0d1b3e]">
                  {views.toLocaleString()}
                </p>
                <p className="text-xs text-[#8899bb]">Views</p>
              </div>
            </div>
          )}
          {downloads !== undefined && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#f6f8ff]">
              <Download className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-lg font-semibold text-[#0d1b3e]">
                  {downloads.toLocaleString()}
                </p>
                <p className="text-xs text-[#8899bb]">Downloads</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Ratings */}
      {showDetailed && (stats.averageQuality > 0 || stats.averageAccuracy > 0 || stats.averageUsability > 0) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#0d1b3e]">Detailed Ratings</h4>
          {stats.averageQuality > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4a5568]">Quality</span>
              <div className="flex items-center gap-2">
                <StarRating rating={stats.averageQuality} readonly size="sm" />
                <span className="text-sm font-medium text-[#0d1b3e]">
                  {stats.averageQuality.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {stats.averageAccuracy > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4a5568]">Accuracy</span>
              <div className="flex items-center gap-2">
                <StarRating rating={stats.averageAccuracy} readonly size="sm" />
                <span className="text-sm font-medium text-[#0d1b3e]">
                  {stats.averageAccuracy.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          {stats.averageUsability > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4a5568]">Ease of Use</span>
              <div className="flex items-center gap-2">
                <StarRating rating={stats.averageUsability} readonly size="sm" />
                <span className="text-sm font-medium text-[#0d1b3e]">
                  {stats.averageUsability.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {stats.recommendPercentage > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              {stats.recommendPercentage}% would recommend
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
