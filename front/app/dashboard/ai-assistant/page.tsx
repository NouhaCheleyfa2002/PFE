"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  TrendingUp,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Explain calculus derivatives in simple terms",
  "Help me prepare for my physics exam",
  "What are the best study techniques?",
  "Create a study plan for mathematics",
  "Explain Newton's laws of motion",
  "Help me understand organic chemistry",
];

export default function AIAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI Study Assistant. I'm here to help you with your studies. Ask me anything about your subjects, study strategies, or get personalized learning recommendations!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = authService.getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // Get student context for personalization
      const contextResponse = await fetch(`${API_URL}/student/ai-insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let context = "";
      if (contextResponse.ok) {
        const data = await contextResponse.json();
        context = `Student Context: ${data.insight || ""}. Subjects: ${data.recommendations?.join(", ") || "General"}`;
      }

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: text,
          context: `You are an AI Study Assistant helping a student. Be encouraging, clear, and educational. ${context}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "I'm sorry, I couldn't generate a response.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to get response. Please try again.");
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Study Assistant</h1>
            <p className="text-purple-100">Your personal learning companion</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl flex gap-3 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user"
                      ? "bg-blue-600"
                      : "bg-gradient-to-br from-purple-500 to-indigo-600"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-white font-semibold text-sm">
                      {authService.getUser()?.fullName?.charAt(0) || "U"}
                    </span>
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span
                    className={`text-xs mt-2 block ${
                      message.role === "user" ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-3xl flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-slate-100">
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (shown when no messages) */}
        {messages.length === 1 && (
          <div className="p-6 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Suggested questions:</p>
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    disabled={loading}
                    className="flex-shrink-0 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2 text-purple-600" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-slate-200">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your studies..."
              disabled={loading}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => sendMessage("Create a personalized study plan for me")}
          disabled={loading}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">Study Plan</p>
            <p className="text-xs text-slate-600">Get personalized schedule</p>
          </div>
        </button>

        <button
          onClick={() => sendMessage("Generate practice questions for my weakest subjects")}
          disabled={loading}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">Practice</p>
            <p className="text-xs text-slate-600">AI-generated questions</p>
          </div>
        </button>

        <button
          onClick={() => sendMessage("What are my learning insights and recommendations?")}
          disabled={loading}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">Insights</p>
            <p className="text-xs text-slate-600">Analyze my progress</p>
          </div>
        </button>
      </div>
    </div>
  );
}
