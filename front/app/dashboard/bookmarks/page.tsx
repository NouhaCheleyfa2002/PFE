"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  BookOpen,
  Clock,
  Star,
  Trash2,
  Download,
  Eye,
  Filter,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Bookmark {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    subject: string;
    classLevel: string;
    averageRating: number;
    totalRatings: number;
    views: number;
    downloads: number;
    storageUrl: string;
  };
  createdAt: string;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      toast.error("Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (bookmark: Bookmark) => {
    try {
      // Track view
      const token = authService.getToken();
      if (token) {
        await fetch(`${API_URL}/documents/${bookmark.documentId}/view`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(err => console.error('Failed to track view:', err));
      }

      // Open document
      if (bookmark.document.storageUrl) {
        window.open(bookmark.document.storageUrl, "_blank");
      } else {
        toast.error("Resource file not available");
      }
    } catch (error) {
      console.error("Failed to view resource:", error);
      toast.error("Failed to open resource");
    }
  };

  const handleDownload = async (bookmark: Bookmark) => {
    try {
      // Track download
      const token = authService.getToken();
      if (token) {
        await fetch(`${API_URL}/documents/${bookmark.documentId}/download`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(err => console.error('Failed to track download:', err));
      }

      // Download document
      if (bookmark.document.storageUrl) {
        window.open(bookmark.document.storageUrl, "_blank");
      } else {
        toast.error("Resource file not available");
      }
    } catch (error) {
      console.error("Failed to download resource:", error);
      toast.error("Failed to download resource");
    }
  };

  const removeBookmark = async (documentId: string) => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/bookmarks/${documentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setBookmarks((prev) => prev.filter((b) => b.documentId !== documentId));
        toast.success("Bookmark removed");
      } else {
        toast.error("Failed to remove bookmark");
      }
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
      toast.error("Failed to remove bookmark");
    }
  };

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const matchesSearch =
      bookmark.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.document.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" || bookmark.document.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = Array.from(
    new Set(bookmarks.map((b) => b.document.subject).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-red-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Saved Resources</h1>
        </div>
        <p className="text-pink-100">
          {bookmarks.length} {bookmarks.length === 1 ? "resource" : "resources"} saved for later
        </p>
      </div>

      {/* Search and Filters */}
      {bookmarks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {bookmarks.length === 0
              ? "No saved resources yet"
              : "No bookmarks match your filters"}
          </h3>
          <p className="text-slate-600 mb-6">
            {bookmarks.length === 0
              ? "Start exploring resources and save your favorites here"
              : "Try adjusting your search or filters"}
          </p>
          {bookmarks.length === 0 && (
            <button
              onClick={() => router.push("/dashboard/library")}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
            >
              Explore Resources
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-10 h-10 text-pink-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded">
                          {bookmark.document.subject}
                        </span>
                        <span className="text-xs text-slate-500">
                          {bookmark.document.classLevel}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {bookmark.document.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => removeBookmark(bookmark.documentId)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>
                        {bookmark.document.averageRating 
                          ? `${Number(bookmark.document.averageRating).toFixed(1)} (${bookmark.document.totalRatings || 0})`
                          : "No ratings yet"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      <span>{bookmark.document.views || 0} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>{bookmark.document.downloads || 0} downloads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        Saved {bookmark.createdAt && !isNaN(new Date(bookmark.createdAt).getTime())
                          ? new Date(bookmark.createdAt).toLocaleDateString()
                          : "recently"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleView(bookmark)}
                      disabled={!bookmark.document.storageUrl}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(bookmark)}
                      disabled={!bookmark.document.storageUrl}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
