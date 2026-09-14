"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Award,
  Target,
  Clock,
  BookOpen,
  FileText,
  BarChart3,
  Calendar,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { authService } from "@/lib/auth";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface PerformanceData {
  subjects: {
    subject: string;
    score: number;
    color: string;
  }[];
}

export default function PerformancePage() {
  const router = useRouter();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/student/performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (error) {
      console.error("Failed to fetch performance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8" />
          <h1 className="text-3xl font-bold">My Performance</h1>
        </div>
        <p className="text-purple-100">Track your progress and identify areas for improvement</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">12</p>
              <p className="text-sm text-slate-600">Resources Owned</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">8</p>
              <p className="text-sm text-slate-600">Exams Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">87%</p>
              <p className="text-sm text-slate-600">Average Score</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">24h</p>
              <p className="text-sm text-slate-600">Study Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Performance by Subject</h2>
        {performance && performance.subjects.length > 0 ? (
          <div className="space-y-4">
            {performance.subjects.map((subject, index) => {
              const colorClasses: Record<string, string> = {
                blue: "bg-blue-500",
                purple: "bg-purple-500",
                green: "bg-green-500",
                orange: "bg-orange-500",
                indigo: "bg-indigo-500",
                pink: "bg-pink-500",
              };

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{subject.subject}</span>
                    <span className="text-sm font-bold text-slate-900">{subject.score}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClasses[subject.color]} rounded-full transition-all`}
                      style={{ width: `${subject.score}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">
              No performance data yet. Start completing exams to see your progress!
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Completed Calculus I Exam</p>
              <p className="text-sm text-slate-600">Score: 92% • 2 hours ago</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Studied Physics - Mechanics</p>
              <p className="text-sm text-slate-600">Duration: 45 min • Yesterday</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Achieved 7-day Study Streak</p>
              <p className="text-sm text-slate-600">Keep it up! • 3 days ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Goals */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Learning Goals</h2>
          </div>
          <Link
            href="/dashboard/ai-assistant"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            Get AI Help
          </Link>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Complete 10 Exams</span>
              <span className="text-sm font-semibold text-indigo-600">8/10</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "80%" }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Maintain 85% Average</span>
              <span className="text-sm font-semibold text-green-600">87%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full" style={{ width: "100%" }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Study 30 Hours/Month</span>
              <span className="text-sm font-semibold text-indigo-600">24/30h</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "80%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
