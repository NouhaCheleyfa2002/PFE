"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { useExam } from "@/lib/exam-context";
import { Wifi, WifiOff, Activity, Users, Lock } from "lucide-react";

export default function WebSocketDebugPanel() {
  const { socket, isConnected } = useWebSocket();
  const { exam } = useExam();
  const [events, setEvents] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!socket || !exam.id) return;

    const eventTypes = [
      'exam:question_added',
      'exam:question_removed',
      'question:updated',
      'exam:questions_reordered',
      'exam:metadata_updated',
      'question:locked',
      'question:unlocked',
      'exam:presence',
      'presence:join',
      'presence:leave',
    ];

    const handlers: Record<string, (data: any) => void> = {};

    eventTypes.forEach(eventType => {
      const handler = (data: any) => {
        const timestamp = new Date().toLocaleTimeString();
        const summary = `[${timestamp}] ${eventType}: ${JSON.stringify(data).substring(0, 100)}`;
        setEvents(prev => [summary, ...prev].slice(0, 20));
      };
      handlers[eventType] = handler;
      socket.on(eventType, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([eventType, handler]) => {
        socket.off(eventType, handler);
      });
    };
  }, [socket, exam.id]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all"
        title="Show WebSocket Debug Panel"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="font-semibold text-sm">WebSocket Debug</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-2 text-xs border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={isConnected ? "text-green-400" : "text-red-400"}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Socket ID:</span>
          <span className="text-gray-300 font-mono">{socket?.id || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Exam ID:</span>
          <span className="text-gray-300 font-mono truncate max-w-[200px]">
            {exam.id || 'Not set'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">Recent Events</span>
          <button
            onClick={() => setEvents([])}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-4">
            No events yet. Try adding/editing questions.
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event, i) => (
              <div
                key={i}
                className="text-xs text-gray-300 bg-gray-800 p-2 rounded font-mono break-all"
              >
                {event}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 text-center">
        Real-time collaboration active
      </div>
    </div>
  );
}
