"use client";

import React, { useState, useEffect } from "react";
import { X, Download, Eye, FileText } from "lucide-react";
import { UniversalDocumentPreview } from "@/components/preview/UniversalDocumentPreview";
import { RatingDisplay, ReviewList, RatingModal, StarRating, RatingData } from "@/components/ratings";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Resource {
  id: string;
  title: string;
  author: string;
  type: string;
  subject: string;
  level: string;
  rating: number;
  questions?: number;
  region?: string;
  verified: boolean;
  fileUrl: string;
  fileName: string;
  views?: number;
  downloads?: number;
}

interface ResourceDetailModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceDetailModal({ resource, isOpen, onClose }: ResourceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">("overview");
  const [showPreview, setShowPreview] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [canRate, setCanRate] = useState(false);
  
  // Rating data
  const [ratingStats, setRatingStats] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState<any>(null);
  const [popularTags, setPopularTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRatingData();
      checkBookmarkStatus();
      checkDownloadStatus();
    }
  }, [isOpen, resource.id]);

  const handleOpenPreview = async () => {
    // Track view only for database resources (UUIDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
    
    if (isUUID) {
      const token = authService.getToken();
      if (token) {
        try {
          await fetch(`${API_URL}/documents/${resource.id}/view`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          // Update local view count
          if (resource.views !== undefined) {
            resource.views = resource.views + 1;
          }
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      }
    }
    
    setShowPreview(true);
  };

  const fetchRatingData = async () => {
    // Only fetch rating data for database resources (UUIDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
    if (!isUUID) {
      console.log('[ResourceDetailModal] Skipping rating data fetch for localStorage resource');
      return;
    }

    const token = authService.getToken();
    if (!token) return;

    try {
      console.log('[ResourceDetailModal] Fetching rating data for resource:', resource.id);
      
      // Fetch rating stats
      const statsRes = await fetch(`${API_URL}/ratings/resources/${resource.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        console.log('[ResourceDetailModal] Rating stats:', stats);
        setRatingStats(stats);
      }

      // Fetch reviews
      const reviewsRes = await fetch(`${API_URL}/ratings/resources/${resource.id}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        console.log('[ResourceDetailModal] Reviews:', data);
        setReviews(data.ratings || []);
      }

      // Fetch my rating
      const myRatingRes = await fetch(`${API_URL}/ratings/resources/${resource.id}/my-rating`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (myRatingRes.ok) {
        const data = await myRatingRes.json();
        console.log('[ResourceDetailModal] My rating:', data);
        setMyRating(data.rating);
        setCanRate(data.canRate);
      }

      // Fetch popular tags
      const tagsRes = await fetch(`${API_URL}/ratings/resources/${resource.id}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tagsRes.ok) {
        const tags = await tagsRes.json();
        setPopularTags(tags);
      }
    } catch (error) {
      console.error("Failed to fetch rating data:", error);
    }
  };

  const checkBookmarkStatus = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/ratings/resources/${resource.id}/is-bookmarked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsBookmarked(data.isBookmarked);
      }
    } catch (error) {
      console.error("Failed to check bookmark status:", error);
    }
  };

  const checkDownloadStatus = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/ratings/resources/${resource.id}/has-downloaded`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasDownloaded(data.hasDownloaded);
      }
    } catch (error) {
      console.error("Failed to check download status:", error);
    }
  };

  const handleDownload = async () => {
    // Only track download for database resources (UUIDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
    
    if (isUUID) {
      const token = authService.getToken();
      if (!token) return;

      try {
        console.log('[ResourceDetailModal] Tracking download for resource:', resource.id);
        
        // Track download
        const response = await fetch(`${API_URL}/ratings/resources/${resource.id}/download`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
          console.error('[ResourceDetailModal] Download tracking failed:', await response.text());
        } else {
          console.log('[ResourceDetailModal] Download tracked successfully');
        }

        // Wait a bit for the backend to process, then re-check download status
        setTimeout(async () => {
          await checkDownloadStatus();
          await fetchRatingData();
          
          // Update local resource downloads count
          if (resource.downloads !== undefined) {
            resource.downloads = resource.downloads + 1;
          }
        }, 500);
        
      } catch (error) {
        console.error("Failed to track download:", error);
      }
    }

    // Download file (always, regardless of UUID)
    window.open(resource.fileUrl, "_blank");
  };

  const handleBookmark = async () => {
    const token = authService.getToken();
    if (!token) return;

    try {
      if (isBookmarked) {
        await fetch(`${API_URL}/ratings/resources/${resource.id}/bookmark`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBookmarked(false);
      } else {
        await fetch(`${API_URL}/ratings/resources/${resource.id}/bookmark`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };

  const handleSubmitRating = async (ratingData: RatingData) => {
    const token = authService.getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/ratings/resources/${resource.id}`, {
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
        console.error("Rating submission failed:", error);
        alert(error.message || "Failed to submit rating. Please try again.");
        throw new Error(error.message || "Failed to submit rating");
      }
    } catch (error) {
      console.error("Failed to submit rating:", error);
      throw error;
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

  if (!isOpen) return null;

  const user = authService.getUser();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf0f7]">
            <div className="flex-1 min-w-0 mr-4">
              <h2 className="text-xl font-semibold text-[#0d1b3e] mb-1">{resource.title}</h2>
              <div className="flex items-center gap-2 text-sm text-[#8899bb]">
                <span>by {resource.author}</span>
                <span>•</span>
                <span>{resource.subject}</span>
                <span>•</span>
                <span>{resource.level}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#f9faff] text-[#8899bb] hover:text-[#0d1b3e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-[#edf0f7] bg-[#f9faff]">
            <button
              onClick={handleOpenPreview}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#edf0f7] bg-white text-[#4a5568] text-sm font-medium hover:border-[#63b3ed] hover:text-[#63b3ed] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#edf0f7]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "overview"
                  ? "text-[#63b3ed] border-b-2 border-[#63b3ed]"
                  : "text-[#8899bb] hover:text-[#0d1b3e]"
              }`}
            >
              Overview
            </button>
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
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Rating Summary */}
                  {ratingStats && (
                    <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                      <RatingDisplay
                        stats={ratingStats}
                        views={resource.views || 0}
                        downloads={resource.downloads || 0}
                        showDetailed
                      />
                    </div>
                  )}

                  {/* Popular Tags */}
                  {popularTags.length > 0 && (
                    <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                      <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
                        What teachers are saying
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {popularTags.map((tag) => (
                          <span
                            key={tag.tag}
                            className="px-3 py-1.5 rounded-lg bg-[#f6f8ff] text-[#4a5568] text-sm"
                          >
                            {tag.tag} ({tag.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Your Rating */}
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
                        {canRate || hasDownloaded ? (
                          <button
                            onClick={() => setShowRatingModal(true)}
                            className="w-full px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
                          >
                            Rate This Resource
                          </button>
                        ) : (
                          <div className="text-center">
                            <p className="text-xs text-[#8899bb] mb-3">
                              Download this resource to rate it
                            </p>
                            <button
                              onClick={handleDownload}
                              className="w-full px-4 py-2 rounded-lg bg-[#63b3ed] text-white text-sm font-medium hover:bg-[#4299e1] transition-colors"
                            >
                              Download Now
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resource Info */}
                  <div className="bg-white rounded-xl border border-[#edf0f7] p-6">
                    <h3 className="text-base font-semibold text-[#0d1b3e] mb-3">
                      Resource Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#8899bb]">Type:</span>
                        <span className="text-[#0d1b3e] font-medium">{resource.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8899bb]">Subject:</span>
                        <span className="text-[#0d1b3e] font-medium">{resource.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8899bb]">Level:</span>
                        <span className="text-[#0d1b3e] font-medium">{resource.level}</span>
                      </div>
                      {resource.region && (
                        <div className="flex justify-between">
                          <span className="text-[#8899bb]">Region:</span>
                          <span className="text-[#0d1b3e] font-medium">{resource.region}</span>
                        </div>
                      )}
                      {resource.questions && resource.questions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#8899bb]">Questions:</span>
                          <span className="text-[#0d1b3e] font-medium">{resource.questions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <ReviewList
                  reviews={reviews}
                  currentUserId={user?.id}
                  onVote={handleVoteOnReview}
                  onDelete={handleDeleteReview}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <UniversalDocumentPreview
          fileUrl={resource.fileUrl}
          fileName={resource.fileName}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleSubmitRating}
          resourceTitle={resource.title}
          existingRating={myRating}
        />
      )}
    </>
  );
}
