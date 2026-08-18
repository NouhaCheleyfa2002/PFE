"use client";

import React, { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket-context";
import { Users } from "lucide-react";

interface Participant {
  userId: string;
  userName: string;
  status: 'active' | 'idle';
  joinedAt: Date;
}

interface PresenceIndicatorProps {
  examId: string;
  currentUserName: string;
}

export default function PresenceIndicator({ examId, currentUserName }: PresenceIndicatorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { socket, isConnected, joinExam, leaveExam, getParticipants } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join exam session
    joinExam(examId, currentUserName);

    // Get current participants
    getParticipants(examId, (response) => {
      setParticipants(response.participants || []);
    });

    // Listen for presence events
    const handlePresenceJoin = (data: { userId: string; userName: string; timestamp: Date }) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, {
          userId: data.userId,
          userName: data.userName,
          status: 'active',
          joinedAt: new Date(data.timestamp),
        }];
      });
    };

    const handlePresenceLeave = (data: { userId: string; timestamp: Date }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    };

    const handlePresenceStatus = (data: { userId: string; status: 'active' | 'idle'; timestamp: Date }) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId ? { ...p, status: data.status } : p
      ));
    };

    socket.on('presence:join', handlePresenceJoin);
    socket.on('presence:leave', handlePresenceLeave);
    socket.on('presence:status', handlePresenceStatus);

    // Cleanup
    return () => {
      socket.off('presence:join', handlePresenceJoin);
      socket.off('presence:leave', handlePresenceLeave);
      socket.off('presence:status', handlePresenceStatus);
      leaveExam(examId);
    };
  }, [socket, isConnected, examId, currentUserName]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg">
      <Users className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600 font-medium">Currently Editing:</span>
      <div className="flex items-center gap-2">
        {participants.map((participant) => (
          <div key={participant.userId} className="flex items-center gap-1.5">
            <span 
              className={`w-2 h-2 rounded-full ${
                participant.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              title={participant.status === 'active' ? 'Online' : 'Idle'}
            />
            <span className="text-sm text-gray-700">{participant.userName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
