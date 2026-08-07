"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Sparkles,
  BookOpen,
  Users,
  BarChart3,
  Upload,
  FileText,
  Brain,
  TrendingUp,
  GraduationCap,
  Clock,
  DollarSign,
  Search,
  Moon,
  Sun,
  Download,
  Star,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  resourceType: string;
  downloads?: number;
  rating?: number;
  price?: number;
  license: string;
  createdAt: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    uploads: 0,
    exams: 0,
    resources: 0,
    teachers: 0,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch real documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/documents/public`);
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.slice(0, 6)); // Get first 6 documents
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      }
    };
    fetchDocuments();
  }, []);

  // Animate stats with transitions
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/documents/public`);
        if (response.ok) {
          const data = await response.json();
          
          // Animate numbers
          const targetStats = {
            uploads: data.length,
            exams: data.filter((d: Document) => d.resourceType?.toLowerCase() === 'exam').length,
            resources: data.length,
            teachers: Math.floor(data.length / 3),
          };

          // Gradually update stats
          Object.keys(targetStats).forEach((key) => {
            const target = targetStats[key as keyof typeof targetStats];
            let current = 0;
            const increment = Math.ceil(target / 30);
            const interval = setInterval(() => {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(interval);
              }
              setStats(prev => ({ ...prev, [key]: current }));
            }, 50);
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/auth?redirect=/dashboard/library?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B0F17] text-white' : 'bg-[#F8FAFC] text-[#0F172A]'} overflow-x-hidden transition-colors duration-500`}>
      {/* Mesh gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.15),transparent_50%),radial-gradient(circle_at_40%_60%,rgba(16,185,129,0.1),transparent_50%)]' : 'bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.08),transparent_50%)]'}`} />
        <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItMnptMCAwdjJoLTJ2LTJoMnptLTIgMHYyaC0ydi0yaDJ6bS0yIDB2MmgtMnYtMmgyem0tMiAydi0yaC0ydjJoMnoiLz48L2c+PC9nPjwvc3ZnPg==')] ${isDarkMode ? 'opacity-40' : 'opacity-20'}`} />
      </div>

      {/* Premium Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? isDarkMode 
            ? "bg-[#0B0F17]/80 backdrop-blur-2xl border-b border-white/10" 
            : "bg-white/80 backdrop-blur-2xl border-b border-gray-200"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#06B6D4] blur-lg opacity-50" />
                <div className="relative w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-semibold tracking-tight">EduShare</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#ecosystem" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-[#2563EB]'} transition-colors`}>Ecosystem</a>
              <a href="#workflow" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-[#2563EB]'} transition-colors`}>AI Workflow</a>
              <a href="#library" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-[#2563EB]'} transition-colors`}>Library</a>
            </div>

            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} transition-all`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => router.push("/auth")}
                className={`px-5 py-2 text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#2563EB]'} transition-colors`}
              >
                Sign In
              </button>
              <button 
                onClick={() => router.push("/auth")}
                className={`group relative px-6 py-2.5 rounded-full ${isDarkMode ? 'bg-white text-black' : 'bg-[#2563EB] text-white'} text-sm font-semibold overflow-hidden transition-all hover:scale-105 shadow-lg`}
              >
                <span className="relative">Join Us</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Living Ecosystem */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'} backdrop-blur-sm border mb-8`}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Trusted by 10,000+ educators worldwide</span>
            </div>
            
            <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[1.1] mb-6 tracking-tight">
              Where educators create<br />
              <span className="bg-gradient-to-r from-[#2563EB] via-[#06B6D4] to-[#10B981] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                the future of learning
              </span>
            </h1>
            
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-12 max-w-2xl mx-auto leading-relaxed`}>
              One platform. Infinite educational possibilities.<br />
              AI-powered tools for modern educators.
            </p>

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => router.push("/auth")}
                className={`group px-10 py-5 rounded-full ${isDarkMode ? 'bg-white text-black' : 'bg-[#2563EB] text-white'} font-semibold text-lg hover:scale-105 transition-all flex items-center gap-2 shadow-xl`}
              >
                Join Us
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Floating Ecosystem Cards */}
          <div className="relative h-[600px]">
            {/* Center - AI Processing */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 animate-float">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#06B6D4] blur-2xl opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className={`relative rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-xl'} p-6 border backdrop-blur-xl`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold">AI Processing</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Detecting chapters</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" />
                      <span>Extracting questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Generating exam...</span>
                    </div>
                  </div>
                  <div className={`mt-4 h-2 ${isDarkMode ? 'bg-white/5' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] w-2/3 rounded-full animate-pulse-slow" />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Left - Upload */}
            <div className="absolute left-[10%] top-[5%] w-72 animate-float" style={{ animationDelay: "0.5s" }}>
              <div className={`rounded-[20px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B]/90 to-[#0F172A]/90 border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-5 border backdrop-blur-xl`}>
                <div className="flex items-center gap-3 mb-3">
                  <Upload className="w-5 h-5 text-[#06B6D4]" />
                  <span className="font-medium text-sm">Teacher Uploads PDF</span>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <FileText className={`w-8 h-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Calculus_Chapter5.pdf</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>2.4 MB</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right - Question Bank */}
            <div className="absolute right-[8%] top-[15%] w-64 animate-float" style={{ animationDelay: "1s" }}>
              <div className={`rounded-[20px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B]/90 to-[#0F172A]/90 border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-5 border backdrop-blur-xl`}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#10B981]" />
                  <span className="font-medium text-sm">Question Bank</span>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} text-xs`}>
                      <div className={`h-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'} rounded mb-1`} />
                      <div className={`h-2 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'} rounded w-3/4`} />
                    </div>
                  ))}
                </div>
                <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>+47 questions extracted</div>
              </div>
            </div>

            {/* Bottom Left - Library */}
            <div className="absolute left-[15%] bottom-[8%] w-60 animate-float" style={{ animationDelay: "1.5s" }}>
              <div className={`rounded-[20px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B]/90 to-[#0F172A]/90 border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-4 border backdrop-blur-xl`}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  <span className="font-medium text-xs">Library</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Math", "Physics", "Bio"].map((subject) => (
                    <div key={subject} className={`aspect-square rounded-lg bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center text-[10px] font-medium ${isDarkMode ? 'border-white/10' : 'border-blue-200'} border`}>
                      {subject}
                    </div>
                  ))}
                </div>
                <div className={`mt-2 text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>★★★★★</div>
              </div>
            </div>

            {/* Bottom Right - Analytics */}
            <div className="absolute right-[12%] bottom-[12%] w-56 animate-float" style={{ animationDelay: "2s" }}>
              <div className={`rounded-[20px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B]/90 to-[#0F172A]/90 border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-4 border backdrop-blur-xl`}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-[#10B981]" />
                  <span className="font-medium text-xs">Analytics</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {[40, 65, 45, 80, 60, 90, 70].map((height, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-[#10B981] to-[#06B6D4] rounded-t transition-all hover:opacity-80" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className={`mt-2 text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-center`}>+127% this month</div>
              </div>
            </div>

            {/* Floating Teacher Avatars */}
            <div className="absolute left-[5%] top-[40%] flex -space-x-2 animate-float" style={{ animationDelay: "0.3s" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#06B6D4] ${isDarkMode ? 'border-[#0B0F17]' : 'border-white'} border-2 flex items-center justify-center text-xs font-bold text-white`}>
                  T{i}
                </div>
              ))}
            </div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <line x1="30%" y1="20%" x2="50%" y2="50%" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" />
              <line x1="70%" y1="30%" x2="50%" y2="50%" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{ animationDelay: "0.5s" }} />
              <line x1="30%" y1="80%" x2="50%" y2="50%" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{ animationDelay: "1s" }} />
              <line x1="70%" y1="75%" x2="50%" y2="50%" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{ animationDelay: "1.5s" }} />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className={`py-12 px-6 ${isDarkMode ? 'border-white/5' : 'border-gray-200'} border-y`}>
        <div className="max-w-7xl mx-auto">
          <p className={`text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-8`}>Trusted by educators at</p>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-40">
            {["Harvard", "MIT", "Stanford", "Oxford", "Cambridge"].map((uni) => (
              <span key={uni} className="text-2xl font-bold tracking-tight">{uni}</span>
            ))}
          </div>
        </div>
      </section>

      {/* AI Workflow - The Journey */}
      <section id="workflow" className={`py-32 px-6 ${isDarkMode ? 'bg-gradient-to-b from-transparent via-[#2563EB]/5 to-transparent' : 'bg-gradient-to-b from-transparent via-[#2563EB]/3 to-transparent'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-sm font-medium text-[#06B6D4] mb-4 block">THE JOURNEY</span>
            <h2 className="text-5xl font-bold mb-6">Complete educational lifecycle</h2>
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>From upload to analytics, all in one platform</p>
          </div>

          <div className="relative">
            {/* Vertical connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#2563EB] via-[#06B6D4] to-[#10B981]" />

            {/* Workflow steps */}
            {[
              { icon: Upload, title: "Upload Content", desc: "Drop your PDF, DOCX, or slides", delay: "0s" },
              { icon: Brain, title: "AI Processing", desc: "Intelligent analysis and extraction", delay: "0.2s" },
              { icon: Sparkles, title: "Question Bank", desc: "Organized and categorized automatically", delay: "0.4s" },
              { icon: FileText, title: "Generate Exams", desc: "AI creates comprehensive assessments", delay: "0.6s" },
              { icon: BookOpen, title: "Resource Library", desc: "Publish and share your work", delay: "0.8s" },
              { icon: Users, title: "Students Access", desc: "Instant distribution and engagement", delay: "1s" },
              { icon: BarChart3, title: "Analytics", desc: "Track performance and impact", delay: "1.2s" },
            ].map((step, index) => (
              <div 
                key={index} 
                className={`relative flex items-center gap-8 mb-16 last:mb-0 animate-float`}
                style={{ animationDelay: step.delay }}
              >
                {index % 2 === 0 ? (
                  <>
                    <div className="flex-1 text-right">
                      <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{step.desc}</p>
                    </div>
                    <div className="relative z-10">
                      <div className={`absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#06B6D4] blur-xl opacity-50`} />
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center`}>
                        <step.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1" />
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <div className="relative z-10">
                      <div className={`absolute inset-0 bg-gradient-to-br from-[#2563EB] to-[#06B6D4] blur-xl opacity-50`} />
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center`}>
                        <step.icon className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{step.desc}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="ecosystem" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-[#06B6D4] mb-4 block">PLATFORM FEATURES</span>
            <h2 className="text-5xl font-bold mb-6">Everything you need</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {/* Large - AI Exam Generator */}
            <div className={`md:col-span-2 md:row-span-2 group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#2563EB]/10 to-[#06B6D4]/10 border-white/10 hover:border-[#2563EB]/50' : 'bg-gradient-to-br from-[#2563EB]/5 to-[#06B6D4]/5 border-gray-200 hover:border-[#2563EB]/50 shadow-lg'} p-8 border transition-all relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-[#2563EB]/20' : 'from-[#2563EB]/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <Brain className="w-12 h-12 text-[#2563EB] mb-4" />
                <h3 className="text-2xl font-bold mb-3">AI Exam Generator</h3>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Create comprehensive exams in seconds with intelligent question generation</p>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span>Auto-generate from content</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span>Multiple question types</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span>Difficulty adjustment</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Medium - Resource Library */}
            <div className={`md:col-span-2 group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10 hover:border-[#06B6D4]/50' : 'bg-white border-gray-200 hover:border-[#06B6D4]/50 shadow-lg'} p-6 border transition-all relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-[#06B6D4]/20' : 'from-[#06B6D4]/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <BookOpen className="w-10 h-10 text-[#06B6D4] mb-3" />
                <h3 className="text-xl font-bold mb-2">Resource Library</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Share and access quality educational materials</p>
              </div>
            </div>

            {/* Small - Analytics */}
            <div className={`group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10 hover:border-[#10B981]/50' : 'bg-white border-gray-200 hover:border-[#10B981]/50 shadow-lg'} p-6 border transition-all relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-[#10B981]/20' : 'from-[#10B981]/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <BarChart3 className="w-10 h-10 text-[#10B981] mb-3" />
                <h3 className="text-lg font-bold mb-2">Analytics</h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Real-time insights</p>
              </div>
            </div>

            {/* Small - Collaboration */}
            <div className={`group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10 hover:border-purple-500/50' : 'bg-white border-gray-200 hover:border-purple-500/50 shadow-lg'} p-6 border transition-all relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-purple-500/20' : 'from-purple-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <Users className="w-10 h-10 text-purple-500 mb-3" />
                <h3 className="text-lg font-bold mb-2">Collaborate</h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Work together</p>
              </div>
            </div>

            {/* Wide - Question Bank */}
            <div className={`md:col-span-4 group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-r from-[#1E293B] to-[#0F172A] border-white/10 hover:border-purple-500/50' : 'bg-white border-gray-200 hover:border-purple-500/50 shadow-lg'} p-6 border transition-all relative overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-r ${isDarkMode ? 'from-purple-500/20' : 'from-purple-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative flex items-center justify-between">
                <div>
                  <Sparkles className="w-10 h-10 text-purple-400 mb-3" />
                  <h3 className="text-xl font-bold mb-2">Intelligent Question Bank</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Organized, searchable, and always expanding with AI</p>
                </div>
                <div className="hidden md:flex items-center gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`w-32 h-20 rounded-xl ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} border`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Metrics Dashboard - Single Color Scheme */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-[#06B6D4] mb-4 block">REAL-TIME IMPACT</span>
            <h2 className="text-5xl font-bold mb-6">Platform in action</h2>
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Live metrics from our ecosystem</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Resources Uploaded", value: stats.uploads, icon: Upload },
              { label: "AI Exams Generated", value: stats.exams, icon: Brain },
              { label: "Total Resources", value: stats.resources, icon: FileText },
              { label: "Active Teachers", value: stats.teachers, icon: GraduationCap },
            ].map((metric, index) => (
              <div 
                key={index} 
                className={`group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-6 border hover:border-[#2563EB]/50 transition-all duration-300 hover:scale-105`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] bg-clip-text text-transparent">
                  {metric.value}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource Library Preview with Real Documents */}
      <section id="library" className={`py-32 px-6 ${isDarkMode ? 'bg-gradient-to-b from-transparent via-[#10B981]/5 to-transparent' : 'bg-gradient-to-b from-transparent via-[#2563EB]/3 to-transparent'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-[#06B6D4] mb-4 block">RESOURCE LIBRARY</span>
            <h2 className="text-5xl font-bold mb-6">Explore quality content</h2>
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>Access educational materials from verified educators</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search Mathematics, Physics, Chemistry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className={`w-full pl-12 pr-32 py-4 rounded-full ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 shadow-lg'} border outline-none focus:border-[#2563EB] transition-all`}
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white font-semibold hover:scale-105 transition-transform"
              >
                Search
              </button>
            </div>
          </div>

          {/* Resource Cards - Real Documents */}
          <div className="grid md:grid-cols-3 gap-6">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className={`group rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-lg'} overflow-hidden border hover:border-[#2563EB]/50 transition-all hover:scale-105 cursor-pointer`}
                  onClick={() => router.push("/auth")}
                >
                  <div className="h-40 bg-gradient-to-br from-[#2563EB]/20 to-[#06B6D4]/20 flex items-center justify-center border-b border-white/10 relative">
                    <FileText className="w-16 h-16 text-[#2563EB]" />
                    {doc.resourceType && (
                      <span className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-[#2563EB]/30 backdrop-blur-sm border border-[#2563EB]/50 text-white font-medium">
                        {doc.resourceType}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full bg-[#2563EB]/20 text-[#2563EB] font-medium`}>
                        {doc.subject || "General"}
                      </span>
                      {doc.classLevel && (
                        <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                          {doc.classLevel}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-3 line-clamp-2 min-h-[3.5rem]">{doc.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                        <Download className="w-4 h-4" />
                        {doc.downloads || 0}
                      </span>
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < (doc.rating || 5) ? 'fill-yellow-400' : 'fill-none'}`} />
                        ))}
                      </div>
                    </div>
                    <button className={`w-full mt-4 py-2 rounded-full ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-all text-sm font-medium`}>
                      View Resource
                    </button>
                  </div>
                </div>
              ))
            ) : (
              // Placeholder cards while loading
              [1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-lg'} overflow-hidden border animate-pulse`}
                >
                  <div className="h-40 bg-gradient-to-br from-[#2563EB]/10 to-[#06B6D4]/10" />
                  <div className="p-6">
                    <div className={`h-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} rounded mb-4 w-2/3`} />
                    <div className={`h-6 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} rounded mb-4`} />
                    <div className={`h-4 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'} rounded w-1/2`} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View All Button */}
          <div className="text-center mt-12">
            <button 
              onClick={() => router.push("/auth")}
              className={`group px-8 py-4 rounded-full ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-gray-50 border-gray-200 shadow-lg'} border font-semibold transition-all flex items-center gap-2 mx-auto`}
            >
              Browse Full Library
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-[#06B6D4] mb-4 block">TESTIMONIALS</span>
            <h2 className="text-5xl font-bold mb-6">Loved by educators</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Dr. Sarah Chen",
                role: "University Professor",
                text: "EduShare's AI tools save me 10+ hours every week. The exam generator is incredible.",
                avatar: "SC",
              },
              {
                name: "Ahmed Hassan",
                role: "High School Teacher",
                text: "I've shared over 50 resources with my colleagues. This platform changed collaboration.",
                avatar: "AH",
              },
              {
                name: "Maria Rodriguez",
                role: "Private Tutor",
                text: "The analytics help me understand exactly what my students need. Game-changer.",
                avatar: "MR",
              },
            ].map((testimonial, index) => (
              <div key={index} className={`rounded-[24px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-lg'} p-8 border hover:border-[#2563EB]/50 transition-all`}>
                <div className="flex gap-1 mb-4 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400" />
                  ))}
                </div>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed mb-6`}>"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center text-sm font-bold text-white">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#2563EB] to-[#06B6D4] blur-3xl opacity-30" />
            <div className={`relative rounded-[32px] ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/10' : 'bg-white border-gray-200 shadow-2xl'} p-16 border`}>
              <h2 className="text-5xl font-bold mb-6">
                Ready to transform education?
              </h2>
              <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-10 max-w-2xl mx-auto`}>
                Join thousands of educators using AI to teach smarter, create faster, and inspire globally.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => router.push("/auth")}
                  className={`group px-10 py-5 rounded-full ${isDarkMode ? 'bg-white text-black' : 'bg-[#2563EB] text-white'} font-semibold text-lg hover:scale-105 transition-all flex items-center gap-2 shadow-xl`}
                >
                  Join Us Today
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-6`}>
                Start creating amazing educational content in minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${isDarkMode ? 'border-white/10' : 'border-gray-200'} border-t py-12 px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">EduShare</span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                The modern platform for educational excellence
              </p>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Pricing", "Security", "Roadmap"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy", "Terms", "Security", "Compliance"] },
            ].map((section, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-[#2563EB]'} transition-colors`}>{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className={`pt-8 ${isDarkMode ? 'border-white/10' : 'border-gray-200'} border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>© 2024 EduShare. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-[#2563EB]'}`}>Twitter</a>
              <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-[#2563EB]'}`}>LinkedIn</a>
              <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-[#2563EB]'}`}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
