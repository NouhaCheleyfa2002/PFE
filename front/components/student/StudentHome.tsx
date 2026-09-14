"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  TrendingUp,
  Award,
  Target,
  Zap,
  ArrowRight,
  Play,
  Clock,
  Star,
  Flame,
  CheckCircle,
  BarChart3,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { authService, User } from "@/lib/auth";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface ContinueLearningResource {
  id: string;
  title: string;
  subject: string;
  progress: number;
  lastStudied: string;
  thumbnail?: string;
}

interface ProgressSummary {
  resourcesOwned: number;
  examsCompleted: number;
  averageScore: number;
  overallProgress: number;
}

interface StudyActivity {
  date: string;
  hours: number;
}

interface RecommendedResource {
  id: string;
  title: string;
  subject: string;
  rating: number;
  reviews: number;
  price: number;
  license?: string;
  isFree?: boolean;
  thumbnail?: string;
}

interface SubjectPerformance {
  subject: string;
  score: number;
  color: string;
}

export default function StudentHome({ user }: { user: User }) {
  const router = useRouter();
  const [continueResources, setContinueResources] = useState<ContinueLearningResource[]>([]);
  const [progress, setProgress] = useState<ProgressSummary>({
    resourcesOwned: 0,
    examsCompleted: 0,
    averageScore: 0,
    overallProgress: 0,
  });
  const [studyActivity, setStudyActivity] = useState<StudyActivity[]>([]);
  const [recommended, setRecommended] = useState<RecommendedResource[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToLibrary, setAddingToLibrary] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleAddToLibrary = async (resourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setAddingToLibrary(resourceId);
      const token = authService.getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/student/add-free-resource/${resourceId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add resource');
      }

      if (data.alreadyAdded) {
        toast.success('This resource is already in your library!');
      } else {
        toast.success('✅ Resource added to your library successfully!');
        // Refresh data to update the UI
        fetchStudentData();
      }
    } catch (error: any) {
      console.error('Error adding resource:', error);
      toast.error(error.message || 'Failed to add resource to library');
    } finally {
      setAddingToLibrary(null);
    }
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Fetch all data in parallel
      const [homeData, recommendations, performance, insights] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/student/home-data`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/student/recommendations`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/student/performance`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/student/ai-insights`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
      ]);

      // Set home data
      setContinueResources(homeData.continueResources || []);
      setProgress(homeData.progress || {
        resourcesOwned: 0,
        examsCompleted: 0,
        averageScore: 0,
        overallProgress: 0,
      });
      setStudyActivity(homeData.studyActivity || []);
      setCurrentStreak(homeData.currentStreak || 0);

      // Set recommendations
      setRecommended(recommendations.resources || []);
      console.log('[StudentHome] Recommendations:', recommendations.resources);
      console.log('[StudentHome] Free resources:', recommendations.resources?.filter((r: any) => r.isFree));

      // Set performance
      setSubjectPerformance(performance.subjects || []);

      // Set AI insights
      setAiInsight(insights.insight || "Start your learning journey today!");

    } catch (err) {
      console.error("Error fetching student data:", err);
      setError("Failed to load dashboard data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchStudentData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            {getTimeGreeting()}, {user.fullName} 
          </h1>
          <p className="text-blue-100 mb-6">
            Continue your learning journey and discover resources that match your goals
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources, subjects, teachers..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onFocus={() => router.push("/dashboard/library")}
            />
          </div>
        </div>
      </div>

      {/* AI Features Quick Access Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">AI-Powered Learning</h3>
              <p className="text-sm text-purple-100">
                Get personalized help, practice questions, and study insights
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/ai-assistant"
            className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            <Lightbulb className="w-5 h-5" />
            Try AI Assistant
          </Link>
        </div>
      </div>

      {/* Continue Learning */}
      {continueResources.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Continue Learning</h2>
            <Link
              href="/dashboard/resources"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueResources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/resources`)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-500">{resource.subject}</div>
                    <div className="font-semibold text-slate-900 truncate">{resource.title}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold">{resource.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${resource.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {resource.lastStudied}
                  </span>
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Continue
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Progress */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Progress</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {progress.resourcesOwned}
            </div>
            <div className="text-sm text-slate-600">Resources Owned</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {progress.examsCompleted}
            </div>
            <div className="text-sm text-slate-600">Exams Completed</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {progress.averageScore}%
            </div>
            <div className="text-sm text-slate-600">Average Score</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {progress.overallProgress}%
            </div>
            <div className="text-sm text-slate-600">Overall Progress</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-6 h-6 text-orange-500" />
              <div className="text-3xl font-bold text-orange-600">{currentStreak}</div>
            </div>
            <div className="text-sm text-orange-700 font-medium">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Study Activity + AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Study Activity</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {studyActivity.map((day, index) => {
              const maxHours = Math.max(...studyActivity.map(d => d.hours));
              const height = (day.hours / maxHours) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-full">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${day.hours} hours`}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Learning Insight */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">AI Learning Insight</h3>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            {aiInsight}
          </p>
          <div className="flex gap-2">
            <Link
              href="/dashboard/ai-assistant"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 bg-white px-3 py-2 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Get AI Help
            </Link>
            <Link
              href="/dashboard/performance"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recommended For You */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900">Recommended For You</h2>
        </div>
        <p className="text-slate-600 text-sm mb-4">
          AI-powered recommendations based on your subjects, saved resources, and learning activity
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommended.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push(`/dashboard/library`)}
            >
              <div className="h-32 bg-gradient-to-br from-blue-100 to-indigo-100 relative">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-1 bg-white rounded-full text-xs font-medium text-purple-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Pick
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 mb-1">
                  {resource.subject}
                </div>
                <div className="font-semibold text-slate-900 mb-2 line-clamp-2">{resource.title}</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {Number(resource.rating || 0).toFixed(1)}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    ({resource.reviews || 0} reviews)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  {resource.isFree ? (
                    <span className="text-lg font-bold text-green-600">Free</span>
                  ) : (
                    <span className="text-lg font-bold text-slate-900">
                      {Number(resource.price || 0).toFixed(2)} TND
                    </span>
                  )}
                  {resource.isFree ? (
                    <button
                      onClick={(e) => handleAddToLibrary(resource.id, e)}
                      disabled={addingToLibrary === resource.id}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingToLibrary === resource.id ? 'Adding...' : 'Add to Library'}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/dashboard/library`)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance by Subject */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Performance</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-4">
            {subjectPerformance.map((subject, index) => {
              const colorClasses = {
                blue: "bg-blue-500",
                purple: "bg-purple-500",
                green: "bg-green-500",
                orange: "bg-orange-500",
              }[subject.color];

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {subject.subject}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {subject.score}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorClasses} rounded-full transition-all`}
                      style={{ width: `${subject.score}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/dashboard/performance"
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            View Detailed Performance
          </Link>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-6 h-6 text-amber-600" />
          <h2 className="text-xl font-bold text-slate-900">Your Achievements</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900">{currentStreak || 0} Day Streak</div>
              <div className="text-xs text-slate-600">Keep it up!</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900">{progress.resourcesOwned} Resources</div>
              <div className="text-xs text-slate-600">Owned</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900">{progress.averageScore || 0}% Score</div>
              <div className="text-xs text-slate-600">Average</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900">{progress.examsCompleted || 0} Exams</div>
              <div className="text-xs text-slate-600">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
